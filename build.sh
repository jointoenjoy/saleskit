#!/bin/sh
# 產生部署資料夾：
#   /2026        舊版單檔簡報（index.html）
#   /chill       Chill 版簡報，/chill/mng 後台
#   /assets      Chill 版用的活動照片庫
# 並加上擋爬蟲設定
set -e
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
