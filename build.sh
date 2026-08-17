#!/bin/sh
# 產生部署資料夾：
#   /2026        舊版單檔簡報（index.html）
#   /chill       Chill 版簡報，/chill/mng 後台
#   /assets      Chill 版用的活動照片庫
# 並加上擋爬蟲設定
set -e

# 先驗照片：data.js／index.html 引用到但檔案不存在時，滿版照片頁會出現黑色空格。
# 這種破圖在瀏覽器不會報錯，只能在這裡先擋下來。
python3 - <<'PY'
import re, sys, os
bad = []
for f in ('public/chill/data.js', 'public/chill/index.html'):
    src = open(f, encoding='utf-8').read()
    for ref in set(re.findall(r"[/']([a-z0-9]+/[a-z]+-\d+\.jpg)", src)):
        if not os.path.exists('public/assets/photos/' + ref):
            bad.append(f'{f}: {ref}')
if bad:
    print('build 中止：以下照片被引用但不存在\n  ' + '\n  '.join(sorted(bad)), file=sys.stderr)
    sys.exit(1)
PY

rm -rf dist && mkdir -p dist/2026
cp index.html dist/2026/index.html
# Chill 版前台／後台／照片庫（public 內容直接對應網站根目錄）
cp -R public/. dist/
# Pages Functions（雲端存檔 API + /api/chill/*）一起帶進部署資料夾
cp -R functions dist/functions
printf 'User-agent: *\nDisallow: /\n' > dist/robots.txt
printf '/*\n  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet\n  Referrer-Policy: no-referrer\n' > dist/_headers
printf '/  /2026/  302\n' > dist/_redirects
echo "dist 已產生"
