// 練息場 SalesKit 雲端存檔 API
// GET  /api/deck        → 回傳雲端最新一版（讀取用，公開）
// POST /api/deck        → 存一版（需帶正確編輯密鑰；會保留上一版當備份）
const LATEST = 'deck:latest';
const PREV = 'deck:prev';

export async function onRequestGet({ env }) {
  try {
    const v = await env.DECK_KV.get(LATEST);
    if (!v) return json({ ok: true, html: null });
    return json({ ok: true, ...JSON.parse(v) });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const key = request.headers.get('x-edit-key') || '';
    if (!env.EDIT_KEY || key !== env.EDIT_KEY) {
      return json({ ok: false, error: 'bad-key' }, 403);
    }
    const body = await request.json();
    if (!body || typeof body.html !== 'string' || body.html.length < 50) {
      return json({ ok: false, error: 'empty' }, 400);
    }
    // 先把目前最新一版備份成上一版，再寫入新的最新版
    const cur = await env.DECK_KV.get(LATEST);
    if (cur) await env.DECK_KV.put(PREV, cur);
    const rec = JSON.stringify({ html: body.html, savedAt: new Date().toISOString() });
    await env.DECK_KV.put(LATEST, rec);
    return json({ ok: true, savedAt: JSON.parse(rec).savedAt });
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
