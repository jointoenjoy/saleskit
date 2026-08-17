/* 練息場 Chill Saleskit — Cloudflare Worker
   靜態頁面由 Assets 綁定直接吐（/chill、/chill/mng、/assets/photos/…）
   本檔只處理 /api/*：內容覆寫的讀寫、登入、圖片上傳。

   繫結：
     ASSETS  — 靜態資源（public/）
     KV      — 內容覆寫 JSON 與後台上傳的圖片
   環境變數（secret）：
     ADMIN_PASSWORD  — /chill/mng 的登入密碼
     SESSION_SECRET  — 簽 cookie 用                                   */

const CONTENT_KEY = 'chill:content';
const IMG_PREFIX = 'chill:img:';
const COOKIE = 'chill_admin';
const SESSION_TTL = 60 * 60 * 12; // 12 小時

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/') return Response.redirect(new URL('/chill', url).toString(), 302);

    if (path.startsWith('/api/')) {
      try {
        return await api(request, env, path, url);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};

/* ---------- 路由 ---------- */
async function api(request, env, path, url) {
  const m = request.method;

  if (path === '/api/health') return json({ ok: true, service: 'chill-saleskit' });

  if (path === '/api/content') {
    if (m === 'GET') {
      const raw = await env.KV.get(CONTENT_KEY);
      return json(raw ? JSON.parse(raw) : { text: {}, images: {} }, 200, {
        'Cache-Control': 'no-store',
      });
    }
    if (!(await authed(request, env))) return json({ error: 'unauthorized' }, 401);
    if (m === 'PUT') {
      const body = await request.json();
      const doc = {
        text: sane(body.text),
        images: sane(body.images),
        updatedAt: new Date().toISOString(),
      };
      await env.KV.put(CONTENT_KEY, JSON.stringify(doc));
      return json({ ok: true, updatedAt: doc.updatedAt });
    }
    if (m === 'DELETE') {
      await env.KV.delete(CONTENT_KEY);
      return json({ ok: true });
    }
    return json({ error: 'method not allowed' }, 405);
  }

  if (path === '/api/login' && m === 'POST') {
    const { password } = await request.json();
    if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
      return json({ error: 'bad password' }, 401);
    }
    const token = await sign(env, Math.floor(Date.now() / 1000) + SESSION_TTL);
    return json({ ok: true }, 200, {
      'Set-Cookie': `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`,
    });
  }

  if (path === '/api/logout' && m === 'POST') {
    return json({ ok: true }, 200, {
      'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    });
  }

  if (path === '/api/me') return json({ ok: await authed(request, env) });

  if (path === '/api/upload' && m === 'POST') {
    if (!(await authed(request, env))) return json({ error: 'unauthorized' }, 401);
    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return json({ error: 'empty body' }, 400);
    if (buf.byteLength > 8 * 1024 * 1024) return json({ error: 'too large' }, 413);
    const type = request.headers.get('Content-Type') || 'image/jpeg';
    const id = hex(crypto.getRandomValues(new Uint8Array(8)));
    await env.KV.put(IMG_PREFIX + id, buf, { metadata: { type } });
    return json({ ok: true, url: `/api/img/${id}` });
  }

  if (path.startsWith('/api/img/') && m === 'GET') {
    const id = path.slice('/api/img/'.length);
    const r = await env.KV.getWithMetadata(IMG_PREFIX + id, { type: 'arrayBuffer' });
    if (!r || !r.value) return new Response('not found', { status: 404 });
    return new Response(r.value, {
      headers: {
        'Content-Type': (r.metadata && r.metadata.type) || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return json({ error: 'unknown endpoint' }, 404);
}

/* ---------- 工具 ---------- */
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

// 只保留字串鍵值，並擋掉過長內容
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

async function hmac(env, msg) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.SESSION_SECRET || 'dev-secret-change-me'),
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
  // 定長比對
  if (expect.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expect.length; i++) diff |= expect.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
