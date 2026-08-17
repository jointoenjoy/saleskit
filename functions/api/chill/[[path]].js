/* 練息場 Chill Saleskit — 後台 API（Cloudflare Pages Function）
   掛在 /api/chill/* ；共用舊版 saleskit 的 DECK_KV 與 EDIT_KEY，不用另外開 secret。
   KV 鍵一律以 chill: 開頭，和舊版的 deck:latest／deck:prev 不衝突。

     GET    /api/chill/content   讀內容覆寫（公開，前台載入時打）
     PUT    /api/chill/content   存內容覆寫（需登入）
     DELETE /api/chill/content   還原預設（需登入）
     POST   /api/chill/login     以 EDIT_KEY 登入，發簽章 cookie
     POST   /api/chill/logout    清 cookie
     GET    /api/chill/me        查詢登入狀態
     POST   /api/chill/upload    上傳圖片進 KV（需登入）
     GET    /api/chill/img/:id   取出上傳的圖片                            */

const CONTENT_KEY = 'chill:content';
const IMG_PREFIX = 'chill:img:';
const COOKIE = 'chill_admin';
const SESSION_TTL = 60 * 60 * 12; // 12 小時

export async function onRequest(context) {
  const { request, env, params } = context;
  const seg = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const route = seg.join('/');
  const m = request.method;

  try {
    if (route === 'health') return json({ ok: true, service: 'chill-saleskit' });

    if (route === 'content') {
      if (m === 'GET') {
        const raw = await env.DECK_KV.get(CONTENT_KEY);
        return json(raw ? JSON.parse(raw) : { text: {}, images: {} });
      }
      if (!(await authed(request, env))) return json({ error: 'unauthorized' }, 401);
      if (m === 'PUT') {
        const body = await request.json();
        const doc = {
          text: sane(body.text),
          images: sane(body.images),
          updatedAt: new Date().toISOString(),
        };
        await env.DECK_KV.put(CONTENT_KEY, JSON.stringify(doc));
        return json({ ok: true, updatedAt: doc.updatedAt });
      }
      if (m === 'DELETE') {
        await env.DECK_KV.delete(CONTENT_KEY);
        return json({ ok: true });
      }
      return json({ error: 'method not allowed' }, 405);
    }

    if (route === 'login' && m === 'POST') {
      const { password } = await request.json();
      if (!env.EDIT_KEY || password !== env.EDIT_KEY) return json({ error: 'bad password' }, 401);
      const token = await sign(env, Math.floor(Date.now() / 1000) + SESSION_TTL);
      return json({ ok: true }, 200, {
        'Set-Cookie': `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`,
      });
    }

    if (route === 'logout' && m === 'POST') {
      return json({ ok: true }, 200, {
        'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      });
    }

    if (route === 'me') return json({ ok: await authed(request, env) });

    if (route === 'upload' && m === 'POST') {
      if (!(await authed(request, env))) return json({ error: 'unauthorized' }, 401);
      const buf = await request.arrayBuffer();
      if (!buf.byteLength) return json({ error: 'empty body' }, 400);
      if (buf.byteLength > 8 * 1024 * 1024) return json({ error: 'too large' }, 413);
      const type = request.headers.get('Content-Type') || 'image/jpeg';
      const id = hex(crypto.getRandomValues(new Uint8Array(8)));
      await env.DECK_KV.put(IMG_PREFIX + id, buf, { metadata: { type } });
      return json({ ok: true, url: `/api/chill/img/${id}` });
    }

    if (seg[0] === 'img' && seg[1] && m === 'GET') {
      const r = await env.DECK_KV.getWithMetadata(IMG_PREFIX + seg[1], { type: 'stream' });
      if (!r || !r.value) return new Response('not found', { status: 404 });
      return new Response(r.value, {
        headers: {
          'Content-Type': (r.metadata && r.metadata.type) || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return json({ error: 'unknown endpoint: ' + route }, 404);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}

/* ---------- 工具 ---------- */
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

// 只留字串鍵值，並擋掉過長內容
function sane(o) {
  const out = {};
  if (!o || typeof o !== 'object') return out;
  for (const [k, v] of Object.entries(o)) {
    if (typeof k === 'string' && typeof v === 'string' && k.length <= 120 && v.length <= 8000) {
      out[k] = v;
    }
  }
  return out;
}

function hex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 用 EDIT_KEY 當簽章金鑰，省下一個 secret
async function hmac(env, msg) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.EDIT_KEY || 'dev-secret-change-me'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg)));
  return hex(sig);
}

async function sign(env, exp) {
  return `${exp}.${await hmac(env, String(exp))}`;
}

async function authed(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  if (!match) return false;
  const [exp, sig] = match[1].split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expect = await hmac(env, exp);
  if (expect.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expect.length; i++) diff |= expect.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
