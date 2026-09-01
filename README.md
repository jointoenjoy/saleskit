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
- **去重後課程牆**，來源為 Wix 報名系統，依五感策展分成六類
- **實證數據**取自 2026 上半年前後測問卷（156 份有效樣本）與年度合約進度表

### 設計系統

- Pro 與 Chill 版共用「高管投影優先」的文字排版原則；完整規則記錄在 [`練息場設計系統.md`](./練息場設計系統.md)。
- 文字斷行需依語意單位處理，避免孤字、孤標點與數字拆行；資訊過多時優先減字、拆頁或改成圖表。

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
functions/
  api/deck.js           舊版簡報的雲端存檔 API（/api/deck）
  api/chill/[[path]].js Chill 版後台 API（/api/chill/*）
build.sh            產生 dist/：舊版 → /2026、public/ → 網站根目錄、functions 一起帶上
wrangler.toml       Pages 專案設定（DECK_KV 綁定）
```

前後台共用同一個 Pages 專案，API 走 Pages Functions，沒有獨立的 Worker。

### 後台怎麼運作

`/chill/mng` 用 iframe 載入前台，開啟「編輯模式」後：

- 點任何文字直接改（所有可編輯處都有 `data-edit` 鍵）
- 點任何圖片跳出選圖視窗 — 可從 164 張活動照片庫挑、上傳新圖（前端自動壓到 1800px）、或貼網址
- 按「儲存並發布」→ 存進 KV → 前台重新載入就是新內容

覆寫是「鍵值疊加」，不改動原始 HTML；按「還原預設」會清空 KV 回到原版。

### 本機開發

```bash
npm install
cp .dev.vars.example .dev.vars   # 填入 EDIT_KEY（後台密碼，同時當簽章金鑰）
npm run dev                      # 會先跑 build.sh，再開 http://localhost:8788/chill
```

### 部署到 Cloudflare

Pages 專案名 `saleskit`，KV namespace `DECK_KV` 已建好（id 寫在 `wrangler.toml`）。

```bash
npx wrangler login     # 只有第一次或 token 過期時要跑，互動式
npm run deploy         # = ./build.sh && wrangler pages deploy dist --project-name=saleskit
```

後台密碼存在 Pages 環境變數 `EDIT_KEY`（Chill 後台登入與 session 簽章共用同一把）：

```bash
npx wrangler pages secret put EDIT_KEY --project-name saleskit
```

上線後網址：

- 舊版簡報 `/2026`（根目錄 `/` 會 302 導過去）
- Chill 前台 `/chill`
- Chill 後台 `/chill/mng`

### 待辦

- [ ] 把 164 張精選照片複製一份到 Google Drive 2026 資料夾同層（需要 afu-google Worker 的 `INTERNAL_KEY`）
- [ ] 2026 年 5 月「啟動身體自癒」與 6 月「小滿茶席」在 Drive 上沒有側拍照片，
      這兩場目前沒有照片素材可用
