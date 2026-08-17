/* 練息場 Chill Saleskit — 前台渲染 + 內容覆寫 + 編輯橋接
   1. 先用 data.js 把動態區塊（五感卡／課程牆／年度排程／滿版照片）畫出來
   2. 再向 /api/content 取得後台覆寫（文字 + 圖片），套用上去
   3. 若被 /chill/mng 以 iframe 載入，開啟編輯模式並與父視窗溝通            */
(function () {
  'use strict';
  var D = window.CHILL_DATA;
  var senseByKey = {};
  D.SENSES.forEach(function (s) { senseByKey[s.key] = s; });

  /* ---------- 1. 動態區塊 ---------- */

  function renderSenses() {
    var el = document.getElementById('senseGrid');
    if (!el) return;
    var counts = {};
    D.COURSES.forEach(function (c) { counts[c.s] = (counts[c.s] || 0) + 1; });
    el.innerHTML = D.SENSES.map(function (s, i) {
      return '<div class="sense" style="--c:' + s.color + '">' +
        '<span style="position:absolute;top:0;left:0;right:0;height:4px;background:' + s.color + '"></span>' +
        '<div class="num" data-edit="sense.' + s.key + '.n">' + (counts[s.key] || 0) + '</div>' +
        '<div class="k" data-edit="sense.' + s.key + '.k">' + s.ko + '</div>' +
        '<div class="t" data-edit="sense.' + s.key + '.t">' + s.name + '</div>' +
        '<div class="c" data-edit="sense.' + s.key + '.c">' + s.desc + '</div>' +
        '</div>';
    }).join('');
  }

  function renderWall() {
    var wall = document.getElementById('courseWall');
    var leg = document.getElementById('wallLegend');
    if (!wall) return;
    var counts = {};
    D.COURSES.forEach(function (c) { counts[c.s] = (counts[c.s] || 0) + 1; });
    leg.innerHTML = D.SENSES.map(function (s) {
      return '<span><i style="background:' + s.color + '"></i>' + s.name.split('・')[1] +
        ' <b style="color:' + s.color + '">' + (counts[s.key] || 0) + '</b></span>';
    }).join('');
    wall.innerHTML = D.COURSES.map(function (c, i) {
      var s = senseByKey[c.s] || { color: '#8A95A5' };
      return '<div class="course"><i style="background:' + s.color + '"></i><div>' +
        '<div class="n" data-edit="course.' + i + '.n">' + c.n + '</div>' +
        '<div class="d" data-edit="course.' + i + '.d">' + c.d + '</div>' +
        '</div></div>';
    }).join('');
  }

  function renderPlan() {
    var el = document.getElementById('planGrid');
    if (!el) return;
    el.innerHTML = D.PLAN.map(function (p, i) {
      return '<div class="m' + (p.done ? ' done' : '') + '">' +
        '<div class="mm" data-edit="plan.' + i + '.m">' + p.m + '</div>' +
        '<div class="nm" data-edit="plan.' + i + '.n">' + p.n + '</div>' +
        '<div class="cap2" data-edit="plan.' + i + '.c">' + p.c + '</div>' +
        '</div>';
    }).join('');
  }

  function renderPhotoPages() {
    Object.keys(D.PHOTO_PAGES).forEach(function (key) {
      var sec = document.querySelector('.slide.photo[data-photo="' + key + '"]');
      if (!sec) return;
      var p = D.PHOTO_PAGES[key];
      var figs = p.imgs.map(function (src, i) {
        return '<figure data-img-wrap data-img="photo.' + key + '.' + i + '">' +
          '<img loading="lazy" src="/assets/photos/' + src + '" alt="">' +
          '</figure>';
      }).join('');
      var pg = sec.querySelector('.pg');
      sec.insertAdjacentHTML('afterbegin',
        '<div class="mosaic ' + p.layout + '">' + figs + '</div>' +
        '<div class="photo-tag"><span class="logo-chip"><i class="logo"></i></span>' +
        '<span class="photo-badge" data-edit="photo.' + key + '.badge">' + p.badge + '</span></div>' +
        '<div class="photo-cap">' +
        '<h2 class="h1 w" style="font-size:40px;max-width:900px" data-edit="photo.' + key + '.title">' + p.title + '</h2>' +
        '<p class="body wt" style="margin-top:12px;max-width:820px;color:rgba(255,255,255,.8)" data-edit="photo.' + key + '.sub">' + p.sub + '</p>' +
        '</div>');
      if (pg) sec.appendChild(pg);
    });
  }

  /* ---------- 2. 套用後台覆寫 ---------- */

  function applyOverrides(c) {
    if (!c) return;
    var t = c.text || {};
    Object.keys(t).forEach(function (k) {
      var el = document.querySelector('[data-edit="' + cssEsc(k) + '"]');
      if (el) el.innerHTML = t[k];
    });
    var im = c.images || {};
    Object.keys(im).forEach(function (k) {
      var el = document.querySelector('[data-img="' + cssEsc(k) + '"]');
      if (!el) return;
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (img) img.src = im[k];
    });
  }
  function cssEsc(s) { return String(s).replace(/"/g, '\\"'); }

  function loadContent() {
    return fetch('/api/chill/content', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { applyOverrides(j); return j; })
      .catch(function () { return null; });
  }

  /* ---------- 3. 編輯模式（由 /chill/mng 以 iframe 載入時啟用）---------- */

  var isEmbedded = window.parent !== window;
  var edit = { on: false, dirty: false, text: {}, images: {} };

  function post(msg) { if (isEmbedded) window.parent.postMessage(msg, '*'); }

  function enableEditing(on) {
    edit.on = on;
    document.body.classList.toggle('editing', on);
    document.querySelectorAll('[data-edit]').forEach(function (el) {
      if (on) {
        el.setAttribute('contenteditable', 'true');
        el.addEventListener('input', onTextInput);
        el.addEventListener('blur', onTextBlur);
      } else {
        el.removeAttribute('contenteditable');
        el.removeEventListener('input', onTextInput);
        el.removeEventListener('blur', onTextBlur);
      }
    });
    document.querySelectorAll('[data-img]').forEach(function (el) {
      if (on) el.addEventListener('click', onImgClick);
      else el.removeEventListener('click', onImgClick);
    });
  }

  function markDirty(el) {
    edit.dirty = true;
    var s = el.closest('.slide');
    if (s) s.classList.add('dirty');
    post({ type: 'dirty' });
  }
  function onTextInput(e) { markDirty(e.currentTarget); }
  function onTextBlur(e) {
    var el = e.currentTarget;
    edit.text[el.getAttribute('data-edit')] = el.innerHTML;
    post({ type: 'change', text: edit.text, images: edit.images });
  }
  function onImgClick(e) {
    e.preventDefault();
    var el = e.currentTarget;
    post({ type: 'pick-image', key: el.getAttribute('data-img') });
  }

  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.type === 'edit-mode') enableEditing(!!m.on);
    else if (m.type === 'set-image') {
      var el = document.querySelector('[data-img="' + cssEsc(m.key) + '"]');
      if (el) {
        var img = el.tagName === 'IMG' ? el : el.querySelector('img');
        if (img) img.src = m.url;
        edit.images[m.key] = m.url;
        markDirty(el);
        post({ type: 'change', text: edit.text, images: edit.images });
      }
    } else if (m.type === 'collect') {
      // 全量收集，避免只靠 blur 事件漏掉
      var text = {};
      document.querySelectorAll('[data-edit]').forEach(function (el) {
        text[el.getAttribute('data-edit')] = el.innerHTML;
      });
      post({ type: 'collected', text: text, images: edit.images, token: m.token });
    } else if (m.type === 'saved') {
      edit.dirty = false;
      document.querySelectorAll('.slide.dirty').forEach(function (s) { s.classList.remove('dirty'); });
    } else if (m.type === 'reload') {
      location.reload();
    }
  });

  /* ---------- 啟動 ---------- */
  renderSenses();
  renderWall();
  renderPlan();
  renderPhotoPages();
  loadContent().then(function () {
    post({ type: 'ready', slides: document.querySelectorAll('.slide').length });
  });
})();
