// proposal.jointoenjoy.com 這個網域，根目錄直接顯示 /pro 綜合版簡報（網址列不出現 /pro）。
// 其他網域（saleskit.pages.dev 等）維持原本行為。
const PRO_HOSTS = ['proposal.jointoenjoy.com'];

export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const isProHost = PRO_HOSTS.includes(url.hostname) || url.hostname.startsWith('proposal.');
    if (isProHost) {
      const p = url.pathname;
      // /pro、/api、/assets 這些實體路徑照原樣走，只有「根目錄相對路徑」才補上 /pro
      if (!p.startsWith('/pro') && !p.startsWith('/api') && !p.startsWith('/assets')
          && p !== '/robots.txt' && p !== '/favicon.ico') {
        const target = new URL(url);
        target.pathname = '/pro' + (p === '/' ? '/' : p);
        return context.env.ASSETS.fetch(new Request(target.toString(), context.request));
      }
    }
  } catch (e) {
    // 任何意外都不要讓整站掛掉，直接放行走原本流程
  }
  return context.next();
}
