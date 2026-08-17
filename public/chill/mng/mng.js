/* Chill Saleskit 後台 — 登入、即時編輯、圖片更換、儲存發布 */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var fr = $('#fr'), state = $('#state');
  var pending = { text: {}, images: {} };
  var dirty = false, pickKey = null, chosenUrl = null;
  var MANIFEST = null;

  /* ---------- 登入 ---------- */
  function setLogin(on) { $('#login').classList.toggle('on', on); }

  fetch('/api/chill/me').then(function (r) { return r.json(); })
    .then(function (j) { setLogin(!j.ok); })
    .catch(function () { setLogin(true); });

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#loginErr').classList.remove('on');
    fetch('/api/chill/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: $('#pw').value })
    }).then(function (r) {
      if (r.ok) { setLogin(false); $('#pw').value = ''; }
      else $('#loginErr').classList.add('on');
    });
  });

  $('#btnLogout').addEventListener('click', function () {
    fetch('/api/chill/logout', { method: 'POST' }).then(function () { setLogin(true); });
  });

  /* ---------- 編輯模式 ---------- */
  $('#editTog').addEventListener('change', function () {
    fr.contentWindow.postMessage({ type: 'edit-mode', on: this.checked }, '*');
  });

  function setState(kind, txt) {
    state.className = 'state' + (kind ? ' ' + kind : '');
    state.textContent = txt;
  }
  function markDirty() {
    dirty = true; $('#btnSave').disabled = false;
    setState('dirty', '有未儲存的變更');
  }

  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.type === 'ready') {
      if ($('#editTog').checked) fr.contentWindow.postMessage({ type: 'edit-mode', on: true }, '*');
    } else if (m.type === 'dirty') {
      markDirty();
    } else if (m.type === 'change') {
      pending.images = Object.assign(pending.images, m.images || {});
      markDirty();
    } else if (m.type === 'pick-image') {
      openPicker(m.key);
    } else if (m.type === 'collected' && m.token === saveToken) {
      doSave(m.text, m.images);
    }
  });

  /* ---------- 儲存 ---------- */
  var saveToken = null;
  $('#btnSave').addEventListener('click', function () {
    $('#btnSave').disabled = true;
    setState('', '儲存中…');
    saveToken = String(Date.now());
    fr.contentWindow.postMessage({ type: 'collect', token: saveToken }, '*');
  });

  function doSave(text, images) {
    fetch('/api/chill/content', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, images: Object.assign({}, pending.images, images || {}) })
    }).then(function (r) {
      if (r.status === 401) { setLogin(true); setState('dirty', '請重新登入'); return; }
      if (!r.ok) throw new Error('save failed');
      dirty = false; pending = { text: {}, images: {} };
      fr.contentWindow.postMessage({ type: 'saved' }, '*');
      setState('saved', '已發布 · 前台已更新');
      setTimeout(function () { if (!dirty) setState('', '已是最新'); }, 4000);
    }).catch(function () {
      $('#btnSave').disabled = false;
      setState('dirty', '儲存失敗，請再試一次');
    });
  }

  /* 還原：兩段式確認，不用 confirm() 彈窗 */
  var resetArmed = false, resetTimer = null;
  $('#btnReset').addEventListener('click', function () {
    var b = $('#btnReset');
    if (!resetArmed) {
      resetArmed = true;
      b.textContent = '再按一次＝清除所有修改';
      b.style.color = 'var(--red)';
      clearTimeout(resetTimer);
      resetTimer = setTimeout(disarmReset, 5000);
      return;
    }
    disarmReset();
    fetch('/api/chill/content', { method: 'DELETE' }).then(function (r) {
      if (r.status === 401) { setLogin(true); return; }
      dirty = false; pending = { text: {}, images: {} };
      $('#btnSave').disabled = true;
      setState('', '已還原預設');
      fr.contentWindow.location.reload();
    });
  });

  function disarmReset() {
    resetArmed = false;
    clearTimeout(resetTimer);
    var b = $('#btnReset');
    b.textContent = '還原預設';
    b.style.color = '';
  }

  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------- 圖片挑選 ---------- */
  function openPicker(key) {
    pickKey = key; chosenUrl = null;
    $('#pickKey').textContent = key;
    $('#urlIn').value = ''; $('#upHint').textContent = '';
    $('#pick').classList.add('on');
    buildLibrary();
  }
  function closePicker() { $('#pick').classList.remove('on'); }
  $('#pickCancel').addEventListener('click', closePicker);
  $('#pick').addEventListener('click', function (e) { if (e.target === this) closePicker(); });

  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      document.querySelectorAll('[data-pane]').forEach(function (p) {
        p.hidden = p.getAttribute('data-pane') !== t.getAttribute('data-tab');
      });
    });
  });

  var EVENT_LABEL = {
    ride0320: '騎馬 3/20', ride0327: '騎馬 3/27', tree: '攀樹 4/17',
    moss0717: '苔球 7/17', moss0730: '苔球 7/30', moss0731: '苔球 7/31', sound: '聲波躺躺 7/31'
  };
  var CAT_LABEL = { venue: '場域', scene: '氛圍', face: '神情', detail: '靜物', teacher: '講師', group: '合影' };
  var libFilter = { ev: null, cat: null };

  function buildLibrary() {
    if (MANIFEST) return paintLibrary();
    fetch('/assets/photos/manifest.json').then(function (r) { return r.json(); })
      .then(function (j) { MANIFEST = j; paintLibrary(); })
      .catch(function () { $('#libGrid').innerHTML = '<p class="hint">照片庫讀取失敗。</p>'; });
  }

  function paintLibrary() {
    var f = $('#libFilters');
    var evs = Object.keys(EVENT_LABEL), cats = Object.keys(CAT_LABEL);
    f.innerHTML =
      '<button class="chip' + (libFilter.cat ? '' : ' on') + '" data-cat="">全部類型</button>' +
      cats.map(function (c) { return '<button class="chip' + (libFilter.cat === c ? ' on' : '') + '" data-cat="' + c + '">' + CAT_LABEL[c] + '</button>'; }).join('') +
      '<span style="width:100%;height:0"></span>' +
      '<button class="chip' + (libFilter.ev ? '' : ' on') + '" data-ev="">全部場次</button>' +
      evs.map(function (e) { return '<button class="chip' + (libFilter.ev === e ? ' on' : '') + '" data-ev="' + e + '">' + EVENT_LABEL[e] + '</button>'; }).join('');
    f.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { libFilter.cat = b.getAttribute('data-cat') || null; paintLibrary(); });
    });
    f.querySelectorAll('[data-ev]').forEach(function (b) {
      b.addEventListener('click', function () { libFilter.ev = b.getAttribute('data-ev') || null; paintLibrary(); });
    });

    var list = MANIFEST.photos.filter(function (p) {
      return (!libFilter.cat || p.cat === libFilter.cat) && (!libFilter.ev || p.event === libFilter.ev);
    });
    $('#libGrid').innerHTML = list.map(function (p) {
      return '<figure data-url="/' + p.file + '"><img loading="lazy" src="/' + p.file + '" alt=""></figure>';
    }).join('') || '<p class="hint">這個條件下沒有照片。</p>';
    $('#libGrid').querySelectorAll('figure').forEach(function (fg) {
      fg.addEventListener('click', function () {
        chosenUrl = fg.getAttribute('data-url');
        apply();
      });
    });
  }

  /* 上傳：前端先壓縮到 1800px JPEG，再送到 Worker 存 KV */
  $('#drop').addEventListener('click', function () { $('#file').click(); });
  ['dragover', 'dragenter'].forEach(function (t) {
    $('#drop').addEventListener(t, function (e) { e.preventDefault(); $('#drop').classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (t) {
    $('#drop').addEventListener(t, function (e) { e.preventDefault(); $('#drop').classList.remove('over'); });
  });
  $('#drop').addEventListener('drop', function (e) {
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  $('#file').addEventListener('change', function () { if (this.files[0]) handleFile(this.files[0]); });

  function handleFile(file) {
    $('#upHint').textContent = '處理中…';
    compress(file, 1800, 0.82).then(function (blob) {
      return fetch('/api/chill/upload', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
    }).then(function (r) {
      if (r.status === 401) { setLogin(true); throw new Error('unauth'); }
      return r.json();
    }).then(function (j) {
      chosenUrl = j.url;
      $('#upHint').textContent = '上傳完成，按「套用」放上去。';
    }).catch(function () { $('#upHint').textContent = '上傳失敗，請再試一次。'; });
  }

  function compress(file, maxW, q) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cv.toBlob(function (b) { b ? res(b) : rej(); }, 'image/jpeg', q);
      };
      img.onerror = rej;
      img.src = URL.createObjectURL(file);
    });
  }

  $('#pickApply').addEventListener('click', apply);
  function apply() {
    var url = chosenUrl || $('#urlIn').value.trim();
    if (!url) { $('#upHint').textContent = '還沒選圖。'; return; }
    fr.contentWindow.postMessage({ type: 'set-image', key: pickKey, url: url }, '*');
    closePicker();
  }
})();
