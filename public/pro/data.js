/* 練息場 Pro Saleskit（綜合版）— 資料層
   課程清單來源：Wix 報名系統匯出，簡報牆已去除重複加場並收斂過長尾註
   照片來源：Google Drive 活動紀錄與專業側拍，依 2025 選圖準則挑選
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
  { key: 'mind',   ko: 'MIND',    name: '心念・正念情緒', color: '#7A4FBF',
    desc: '正念生活道場、情緒關係課、內耗退場。給高壓工作者可操作的心法。' },
];

/* ── 課程牆（依時間序整理；重複加場與過長活動尾註已收斂）────── */
const COURSES = [
  { d: '2025/01/10', n: '新年人生整理術',                          s: 'mind'   },
  { d: '2025/02/21', n: '用耳朵來場森呼吸',                        s: 'sound'  },
  { d: '2025/03/28', n: '春蛻・暗光・字茶席',                      s: 'taste'  },
  { d: '2025/04/25', n: '銅鑼躺躺',                                s: 'sound'  },
  { d: '2025/06/13', n: '土地精靈音樂會',                          s: 'sound'  },
  { d: '2025/06/27', n: '陳德中的正念生活道場｜初階',              s: 'mind'   },
  { d: '2025/07/18', n: '陳德中的正念生活道場｜進階',              s: 'mind'   },
  { d: '2025/07/25', n: '喚覺躺躺｜夏日聲波花園',                  s: 'sound'  },
  { d: '2025/08/29', n: '風土味蕾小宇宙',                          s: 'taste'  },
  { d: '2025/10/03', n: '水之旅｜離線之旅',                        s: 'nature' },
  { d: '2025/10/09', n: '森之旅｜離線之旅',                        s: 'nature' },
  { d: '2025/11/07', n: '聲音 × 書寫・療癒實驗室',                 s: 'sound'  },
  { d: '2025/11/21', n: 'RESET！讓內耗退場的動力發光術',           s: 'mind'   },
  { d: '2025/12/19', n: 'HR 特邀場｜森之聖誕・微醺療癒',           s: 'taste'  },
  { d: '2025/12/26', n: '呼吸清理・找回身體的原廠設定',            s: 'body'   },
  { d: '2026/01/16', n: '動態靜心｜敲開心流',                      s: 'sound'  },
  { d: '2026/03/20', n: '春野・開運・馬上好',                      s: 'body'   },
  { d: '2026/04/17', n: '漫步在樹梢',                              s: 'body'   },
  { d: '2026/05/22', n: '啟動身體原廠設定',                        s: 'body'   },
  { d: '2026/06/04', n: '鬆鬆在・小滿茶席',                        s: 'taste'  },
  { d: '2026/07/17', n: '苔球小精靈',                              s: 'touch'  },
  { d: '2026/07/31', n: '聲波共振',                                s: 'sound'  },
  { d: '2026/08/21', n: '香料野草茶',                              s: 'taste'  },
];

/* ── 滿版照片頁（Pro 版取 4 頁：神情／氛圍／講師／場域）───────
   imgs 張數要對得上版位容量（見 deck.js 的 LAYOUT_CAP）。          */
const PHOTO_PAGES = {
  face: {
    layout: 'm-stagger-12', badge: 'THE PEOPLE',
    title: '員工滿意度，從他們臉上看得見',
    sub: '閉上的眼睛、笑到瞇起來的眼角、捧著作品捨不得放下的手。<br>問卷上的分數，在現場長這個樣子。',
    imgs: [
      'p13-satisfaction/p13-01.jpg', 'p13-satisfaction/p13-02.jpg',
      'p13-satisfaction/p13-03.jpg', 'p13-satisfaction/p13-04.jpg',
      'p13-satisfaction/p13-05.jpg', 'p13-satisfaction/p13-06.jpg',
      'p13-satisfaction/p13-07.jpg', 'p13-satisfaction/p13-08.jpg',
      'p13-satisfaction/p13-09.jpg', 'p13-satisfaction/p13-10.jpg',
      'p13-satisfaction/p13-11.jpg', 'p13-satisfaction/p13-12.jpg',
    ],
  },
  scene: {
    layout: 'm-wide', badge: 'THE ATMOSPHERE',
    title: '跨組織的軟性橫向連結',
    sub: '不同公司、不同部門的人在同一個場域裡放慢下來。<br>沒有正式會議的壓力，反而更容易建立信任。',
    imgs: [
      'moss0730/scene-0134.jpg', 'tree/scene-0122.jpg', 'sound/scene-0031.jpg',
      'ride0320/scene-0008.jpg', 'moss0731/scene-0012.jpg',
    ],
  },
  teacher: {
    layout: 'm-4x2', badge: 'THE MASTERS',
    title: '找的是那個領域裡真的在做的人',
    sub: '樹藝師、聲療師、茶人、植物職人、正念導師、馬術教練。帶領者專業度平均 9.25／10。',
    imgs: [
      'sound/teacher-0093.jpg', 'tree/teacher-0001.jpg', 'moss0730/teacher-0012.jpg',
      'pro0901/0718正念-1.jpg', 'pro0901/0116-15.jpg', 'pro0901/聲音採集-84.jpg',
      'pro0901/0725-99.jpg', 'pro0901/坪林-78.jpg',
    ],
  },
  venue: {
    layout: 'm-hero', badge: 'THE PLACE',
    title: '場域，本身就是內容',
    sub: '老屋木構、林間草地、挑高展演廳、山上的茶屋。我們挑一走進去就會自動慢下來的地方。',
    imgs: [
      'pro0901/北藝.jpg', 'tree/venue-0007.jpg', 'sound/venue-0007.jpg',
      'pro0901/正念老屋.jpg', 'pro0901/坪林.jpg',
    ],
  },
};

window.PRO_DATA = { SENSES, COURSES, PHOTO_PAGES };
