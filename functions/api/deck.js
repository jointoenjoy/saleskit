// 練息場 SalesKit 雲端存檔 API
// GET  /api/deck  → 回傳雲端最新一版原始 HTML（讀取用，公開）
// POST /api/deck  → 存一版（需帶正確編輯密鑰；會保留上一版當備份）
//
// 重要：整份簡報含內嵌 base64 圖片約 8MB。若在 Function 內做 JSON.parse／stringify
// 會超過 Cloudflare Worker 的 CPU/記憶體限制（error 1102 → 503）。
// 因此改為「原始 HTML 直接存、直接串流回傳」，Function 幾乎不做序列化，才穩定。
const LATEST = 'deck:latest';
const PREV = 'deck:prev';

export async function onRequestGet({ env }) {
  try {
    // 以串流方式取出並直接回傳，避免把 8MB 讀進記憶體再序列化
    const { value, metadata } = await env.DECK_KV.getWithMetadata(LATEST, { type: 'stream' });
    if (!value) {
      // 尚無存檔：回 204，前端就用內建內容
      return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
    }
    return new Response(value, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-saved-at': (metadata && metadata.savedAt) || '',
      },
    });
  } catch (e) {
    return new Response('err:' + String(e), { status: 500, headers: { 'cache-control': 'no-store' } });
  }
}

export async function onRequestPost({ request, env, waitUntil }) {
  try {
    const key = request.headers.get('x-edit-key') || '';
    if (!env.EDIT_KEY || key !== env.EDIT_KEY) {
      return json({ ok: false, error: 'bad-key' }, 403);
    }
    // 直接讀原始 HTML 內文（前端以 text 送出，不再包 JSON）
    const html = await request.text();
    if (!html || html.length < 50) {
      return json({ ok: false, error: 'empty' }, 400);
    }
    const savedAt = new Date().toISOString();
    // 先把目前最新版備份成上一版（串流搬移、不佔記憶體；背景做、不擋回應）
    const backup = (async () => {
      try {
        const cur = await env.DECK_KV.get(LATEST, { type: 'stream' });
        if (cur) await env.DECK_KV.put(PREV, cur);
      } catch (e) { /* 備份失敗不影響存檔 */ }
    })();
    if (typeof waitUntil === 'function') waitUntil(backup); else await backup;
    // 寫入新的最新版；時間戳放在 metadata，值本身維持純 HTML
    await env.DECK_KV.put(LATEST, html, { metadata: { savedAt } });
    return json({ ok: true, savedAt });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
