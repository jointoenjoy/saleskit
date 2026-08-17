/* 練息場 Chill Saleskit — 資料層
   課程清單來源：Wix 報名系統匯出（wix_status，2025/01–2026/08，共 34 場）
   照片來源：Google Drive 2026 活動紀錄／專業側拍 無 logo 版，依 2025 選圖準則挑選
   數據來源：2026 上半年 Chill 活動前後測問卷（有效樣本 156 份）＋ 年度合約進度表        */

/* ── 五感策展分類 ─────────────────────────────── */
const SENSES = [
  { key: 'sound',  ko: 'AUDIO',   name: '聽覺・聲療策展', color: '#003D7C',
    desc: '銅鑼、頌缽、風琴、梵唱、激靜鼓。用聲波把注意力從腦袋帶回身體。' },
  { key: 'taste',  ko: 'TASTE',   name: '味嗅・風土餐桌', color: '#FF8A00',
    desc: '茶席、香料野草茶、餐桌上的土地漫遊。從一口味道認識節氣與產地。' },
  { key: 'touch',  ko: 'TOUCH',   name: '觸覺・自然手作', color: '#4CAF19',
    desc: '苔球、植栽、香氣選配。雙手沾上泥土，把一件活的作品帶回辦公桌。' },
  { key: 'body',   ko: 'BODY',    name: '體感・身體實作', color: '#E2574C',
    desc: '馬術、攀樹、呼吸清理、自癒經絡。用做得到的動作重新認識自己的身體。' },
  { key: 'nature', ko: 'NATURE',  name: '自然・森林療癒', color: '#2E7D6B',
    desc: '水之旅、森之旅、離線之旅。把人整個放進森林裡，讓五感自己打開。' },
  { key: 'mind',   ko: 'MIND',    name: '心智・正念情緒', color: '#7A4FBF',
    desc: '正念生活道場、情緒關係課、內耗退場。給高壓工作者可操作的心法。' },
];

/* ── 34 場課程（依 Wix 報名系統）───────────────── */
const COURSES = [
  { d: '2025/01/10', n: '［夢想 UP］新年人生整理術',            s: 'mind'   },
  { d: '2025/02/21', n: '用耳朵來場森呼吸｜採集自然之聲小旅行',  s: 'sound'  },
  { d: '2025/02/27', n: '用耳朵來場森呼吸｜春之象・加場',        s: 'sound'  },
  { d: '2025/03/28', n: '春蛻・暗光・字茶席｜坪林',              s: 'taste'  },
  { d: '2025/04/11', n: '春蛻・暗光・字茶席｜貓空',              s: 'taste'  },
  { d: '2025/04/25', n: '銅鑼躺躺｜潛入聲波之海',                s: 'sound'  },
  { d: '2025/05/02', n: '春蛻・暗光・字茶席｜貓空加場',          s: 'taste'  },
  { d: '2025/06/13', n: '土地精靈音樂會｜夏之象（雙場次）',      s: 'sound'  },
  { d: '2025/06/27', n: '初階身心必修課｜陳德中的正念生活道場',  s: 'mind'   },
  { d: '2025/07/18', n: '進階情緒關係課｜陳德中的正念生活道場',  s: 'mind'   },
  { d: '2025/07/25', n: '喚覺躺躺｜夏日聲波花園',                s: 'sound'  },
  { d: '2025/08/29', n: '風土味蕾小宇宙｜餐桌上的土地漫遊',      s: 'taste'  },
  { d: '2025/09/05', n: '風土味蕾小宇宙｜加場',                  s: 'taste'  },
  { d: '2025/10/03', n: '水之旅｜大自然的離線之旅・秋之象',      s: 'nature' },
  { d: '2025/10/09', n: '森之旅｜大自然的離線之旅・秋之象',      s: 'nature' },
  { d: '2025/11/07', n: '聲音 ╳ 書寫・療癒實驗室',               s: 'sound'  },
  { d: '2025/11/21', n: 'RESET！讓內耗退場的動力發光術（雙場次）', s: 'mind' },
  { d: '2025/12/19', n: 'HR 特邀場｜森之聖誕・微醺療癒',         s: 'taste'  },
  { d: '2025/12/26', n: '呼吸清理・找回身體的原廠設定',          s: 'body'   },
  { d: '2026/01/16', n: '動態靜心｜用激靜鼓敲開心流',            s: 'sound'  },
  { d: '2026/03/20', n: '春野・開運・馬上好｜馬術體驗',          s: 'body'   },
  { d: '2026/03/27', n: '春野・開運・馬上好｜加場',              s: 'body'   },
  { d: '2026/04/17', n: '漫步在樹梢｜一場離地向上的自由練習',    s: 'body'   },
  { d: '2026/05/22', n: '啟動身體原廠設定｜吳清忠的自癒寶典',    s: 'body'   },
  { d: '2026/06/04', n: '鬆鬆在・小滿茶席｜回到身體的三道茶',    s: 'taste'  },
  { d: '2026/06/05', n: '鬆鬆在・小滿茶席｜加場',                s: 'taste'  },
  { d: '2026/07/17', n: '就是你了！來養顆苔球小精靈吧',          s: 'touch'  },
  { d: '2026/07/30', n: '苔球小精靈｜加場',                      s: 'touch'  },
  { d: '2026/07/31', n: '苔球小精靈｜三加場',                    s: 'touch'  },
  { d: '2026/07/31', n: '聲波共振！開出你專屬的魔法結界',        s: 'sound'  },
  { d: '2026/08/21', n: '替身體乾一杯！滋養自己的香料野草茶',    s: 'taste'  },
  { d: '2026/08/27', n: '香料野草茶｜加場',                      s: 'taste'  },
  { d: '2026/10 ',   n: '弓道射箭｜一箭之間的專注練習',          s: 'body'   },
  { d: '2026/12 ',   n: '森林療癒｜年末的離線之旅',              s: 'nature' },
];

/* ── 滿版照片頁 ────────────────────────────────
   每頁一種主題，對應 2025 選圖準則的六個面向                    */
const PHOTO_PAGES = {
  venue: {
    layout: 'm-hero', badge: 'THE PLACE',
    title: '場域，本身就是內容',
    sub: '老屋木構、林間草地、窗邊的光。我們挑的不是會議室，是一走進去就會自動慢下來的地方。',
    imgs: [
      'moss0731/venue-0006.jpg', 'tree/venue-0007.jpg', 'sound/venue-0007.jpg',
      'moss0731/venue-0243.jpg', 'tree/venue-0123.jpg',
    ],
  },
  scene: {
    layout: 'm-wide', badge: 'THE ATMOSPHERE',
    title: '一場活動的體感密度',
    sub: '從 25 人的樹梢，到 100 人的滿場。同一件事，所有人一起做——這是線上課給不了的現場。',
    imgs: [
      'moss0730/scene-0134.jpg', 'sound/scene-0031.jpg', 'tree/scene-0033.jpg',
      'moss0731/scene-0012.jpg', 'ride0320/scene-0008.jpg', 'sound/scene-0061.jpg',
      'moss0730/scene-0119.jpg',
    ],
  },
  face: {
    layout: 'm-3x2', badge: 'THE PEOPLE',
    title: '你要的滿意度，長這個樣子',
    sub: '不是問卷上的分數，是當下的表情。閉上的眼睛、笑到瞇起來的眼角、捧著作品捨不得放下的手。',
    imgs: [
      'moss0731/face-0203.jpg', 'ride0320/face-0016.jpg', 'tree/face-0108.jpg',
      'moss0730/face-0110.jpg', 'moss0731/face-0245.jpg', 'sound/face-0026.jpg',
    ],
  },
  detail: {
    layout: 'm-tall', badge: 'THE CURATION',
    title: '策展級，是每個細節都被決定過',
    sub: '手寫的詩籤、選過的器皿、對應節氣的香氣、可以帶回家的作品。體驗結束後，物件會繼續說話。',
    imgs: [
      'moss0730/detail-0161.jpg', 'moss0730/detail-0122.jpg',
      'moss0730/detail-0145.jpg', 'sound/detail-0018.jpg',
      'moss0731/detail-0223.jpg',
    ],
  },
  teacher: {
    layout: 'm-3x2', badge: 'THE MASTERS',
    title: '找的是那個領域裡真的在做的人',
    sub: '樹藝師、聲療師、茶人、植物職人、正念導師、馬術教練。帶領者專業度平均 9.25／10。',
    imgs: [
      'sound/teacher-0093.jpg', 'moss0730/teacher-0017.jpg', 'tree/teacher-0001.jpg',
      'moss0731/teacher-0237.jpg', 'ride0327/teacher-0104.jpg', 'moss0717/teacher-0002.jpg',
    ],
  },
  group: {
    layout: 'm-3x2', badge: 'TOGETHER',
    title: '跨公司、跨部門，一起做完一件事',
    sub: '2026 上半年 7 場、315 個名額，9 個關係企業的同事在同一張桌子旁邊做苔球、一起躺在木地板上。',
    imgs: [
      'moss0730/group-0138.jpg', 'sound/group-0111.jpg', 'tree/scene-0032.jpg',
      'moss0731/group-0253.jpg', 'ride0320/group-0033.jpg', 'moss0717/group-0076.jpg',
    ],
  },
};

/* ── 2026 年度排程（合約 14 場）───────────────── */
const PLAN = [
  { m: '3月',  n: '春野・開運・馬上好', c: '馬術 · 100 名額', done: true  },
  { m: '4月',  n: '漫步在樹梢',         c: '攀樹 · 25 名額',  done: true  },
  { m: '5月',  n: '啟動身體原廠設定',   c: '經絡 · 50 名額',  done: true  },
  { m: '6月',  n: '鬆鬆在・小滿茶席',   c: '茶席 · 40 名額',  done: true  },
  { m: '7月',  n: '聲波共振・苔球',     c: '聲療＋手作 · 100', done: true },
  { m: '8月',  n: '香料野草茶',         c: '食療 · 40 名額',  done: false },
  { m: '9月',  n: '正念冥想',           c: '心智 · 25 名額',  done: false },
  { m: '10月', n: '弓道射箭',           c: '體感 · 50 名額',  done: false },
  { m: '11月', n: '節氣食療',           c: '味覺 · 50 名額',  done: false },
  { m: '12月', n: '森林療癒',           c: '自然 · 40 名額',  done: false },
  { m: '1月',  n: '躺躺音樂會',         c: '聲療 · 50 名額',  done: false },
  { m: '2月',  n: '年度回顧活動',       c: '總結 · 25 名額',  done: false },
];

window.CHILL_DATA = { SENSES, COURSES, PHOTO_PAGES, PLAN };
