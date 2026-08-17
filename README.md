# saleskit — 練息場介紹

兩個版本共用同一個 repo：

| 版本 | 位置 | 說明 |
|---|---|---|
| **Chill 版（新）** | `/chill` · 後台 `/chill/mng` | 以 Chill 實體活動為主、Well 量表為輔的五感策展 saleskit。可在後台即時改字換圖。 |
| 舊版 Smart Well-being | `index.html`（repo 根目錄） | 原本的單檔簡報，未變動。 |

---

## Chill 版

### 內容組成

- **19 頁 1280×720 簡報**，視覺沿用練息場 Saleskit 設計語彙（`#003D7C` 主色、Inter + Noto Sans TC）
- **6 頁滿版活動照片**，分別對應場域／氛圍／神情／靜物／講師／合影六種主題
- **164 張精選照片**（`public/assets/photos/`），取自 2026 年 3–7 月活動紀錄的專業側拍無 logo 版，
  依 2025 年選圖準則挑選，壓縮後平均 183KB
- **34 場課程清單**，來源為 Wix 報名系統，依五感策展分成六類
- **實證數據**取自 2026 上半年前後測問卷（156 份有效樣本）與年度合約進度表

### 檔案結構

```
public/
  chill/
    index.html      19 頁簡報（文字內容都帶 data-edit 鍵）
    deck.css        設計系統
    deck.js         動態渲染 + 套用後台覆寫 + 編輯橋接
    data.js         課程清單、五感分類、照片版位、年度排程
    logo.png
    mng/
      index.html    後台介面
      mng.js        登入、即時編輯、換圖、儲存發布
  assets/photos/    164 張活動照片 + manifest.json
worker/src/index.js Cloudflare Worker（只處理 /api/*）
wrangler.jsonc      Worker 設定
```

### 後台怎麼運作

`/chill/mng` 用 iframe 載入前台，開啟「編輯模式」後：

- 點任何文字直接改（所有可編輯處都有 `data-edit` 鍵）
- 點任何圖片跳出選圖視窗 — 可從 164 張活動照片庫挑、上傳新圖（前端自動壓到 1800px）、或貼網址
- 按「儲存並發布」→ 存進 KV → 前台重新載入就是新內容

覆寫是「鍵值疊加」，不改動原始 HTML；按「還原預設」會清空 KV 回到原版。

### 本機開發

```bash
npm install
cp .dev.vars.example .dev.vars   # 填入 ADMIN_PASSWORD / SESSION_SECRET
npm run dev                      # http://localhost:8788/chill
```

### 部署到 Cloudflare

第一次部署要做四件事：

```bash
# 1. 登入（互動式，需要在終端機手動執行）
npx wrangler login

# 2. 建 KV namespace，把回傳的 id 填進 wrangler.jsonc 的 kv_namespaces[0].id
npm run kv:create

# 3. 設定密碼與簽章金鑰
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET

# 4. 部署
npm run deploy
```

之後每次更新只要 `npm run deploy`。

上線後網址：

- 前台 `https://chill-saleskit.<你的帳號>.workers.dev/chill`
- 後台 `https://chill-saleskit.<你的帳號>.workers.dev/chill/mng`

### 待辦

- [ ] 把 164 張精選照片複製一份到 Google Drive 2026 資料夾同層（需要 afu-google Worker 的 `INTERNAL_KEY`）
- [ ] 2026 年 5 月「啟動身體自癒」與 6 月「小滿茶席」在 Drive 上沒有側拍照片，
      這兩場目前沒有照片素材可用
