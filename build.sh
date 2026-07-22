#!/bin/sh
# 產生部署資料夾：內容放在 /2026，並加上擋爬蟲設定
set -e
rm -rf dist && mkdir -p dist/2026
cp index.html dist/2026/index.html
# Pages Functions（雲端存檔 API）一起帶進部署資料夾
cp -R functions dist/functions
printf 'User-agent: *\nDisallow: /\n' > dist/robots.txt
printf '/*\n  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet\n  Referrer-Policy: no-referrer\n' > dist/_headers
printf '/  /2026/  302\n' > dist/_redirects
echo "dist 已產生"
