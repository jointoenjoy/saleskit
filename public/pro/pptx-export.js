/* 練息場 Pro Saleskit — 下載可編輯 PPT
   把畫面上每一頁 1280×720 的投影片，逐一量出位置與樣式，轉成 PowerPoint 的原生物件：
   - 文字 → 文字方塊（可直接修改，保留字級、粗細、顏色、字距、行距與原本的換行位置）
   - 色塊、圓角卡片、圓點、邊框線 → 圖形
   - 照片、Logo、漸層、圖表（SVG） → 圖片（已依網頁裁切好）
   只有點按鈕時才會載入 PPT 元件，不影響平常開頁速度。                         */
(function () {
  'use strict';

  var LIB_URL = '/pro/vendor/pptxgen-3.12.0.bundle.js';
  var SLIDE_W = 1280, SLIDE_H = 720;
  var IN = 1 / 96;          // 1px = 1/96 英吋
  var PT = 0.75;            // 1px = 0.75pt
  var RASTER = 2;           // 圖片輸出倍率（清晰度）
  var FONT_CJK = 'Noto Sans TC';
  var FILE_NAME = '練息場｜企業身心能量管理方案.pptx';

  /* ---------- 小工具 ---------- */

  function loadLib() {
    if (window.PptxGenJS) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = LIB_URL;
      s.onload = res;
      s.onerror = function () { rej(new Error('PPT 元件載入失敗')); };
      document.head.appendChild(s);
    });
  }

  function parseColor(str) {
    if (!str || str === 'transparent') return null;
    var m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    var a = p.length > 3 ? p[3] : 1;
    if (a <= 0.001) return null;
    var hex = p.slice(0, 3).map(function (v) {
      return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    }).join('').toUpperCase();
    return { hex: hex, a: a };
  }

  function transp(alpha) { return Math.round(Math.max(0, Math.min(1, 1 - alpha)) * 100); }

  function splitTop(str, sep) {
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === sep && depth === 0) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function px(v) { return parseFloat(v) || 0; }

  function isCJK(ch) {
    return /[⺀-鿿가-힯豈-﫿︰-﹏＀-￯　-〿]/.test(ch);
  }

  function loadImage(src) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('image ' + src)); };
      img.src = src;
    });
  }

  function makeCanvas(w, h) {
    var scale = RASTER;
    // 避免單張圖過大
    var maxSide = 2600;
    if (Math.max(w, h) * scale > maxSide) scale = maxSide / Math.max(w, h);
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    var ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    return { c: c, ctx: ctx };
  }

  function radii(cs, w, h) {
    var r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius]
      .map(function (v) {
        var parts = v.split(' ');
        var x = parts[0];
        return x.indexOf('%') > -1 ? parseFloat(x) / 100 * Math.min(w, h) : px(x);
      });
    var f = Math.min(1, w / Math.max(1e-6, r[0] + r[1]), w / Math.max(1e-6, r[3] + r[2]),
      h / Math.max(1e-6, r[0] + r[3]), h / Math.max(1e-6, r[1] + r[2]));
    return r.map(function (v) { return v * f; });
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r[0], y);
    ctx.lineTo(x + w - r[1], y);
    ctx.arcTo(x + w, y, x + w, y + r[1], r[1]);
    ctx.lineTo(x + w, y + h - r[2]);
    ctx.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
    ctx.lineTo(x + r[3], y + h);
    ctx.arcTo(x, y + h, x, y + h - r[3], r[3]);
    ctx.lineTo(x, y + r[0]);
    ctx.arcTo(x, y, x + r[0], y, r[0]);
    ctx.closePath();
  }

  function applyFilter(ctx, filter) {
    if (!filter || filter === 'none') return false;
    if ('filter' in ctx) { ctx.filter = filter; return false; }
    // Safari 舊版不支援 canvas filter：處理「轉成白色」這種最常見的寫法
    return /brightness\(0\)/.test(filter) && /invert\(1\)/.test(filter);
  }

  function whiten(ctx, w, h) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  /* ---------- 漸層（CSS → canvas） ---------- */

  function parseStops(list, unitFull) {
    var stops = [];
    list.forEach(function (item) {
      var m = item.match(/^((?:rgba?|hsla?|color|lab|lch|oklab|oklch)\([^)]*\)|#[0-9a-f]+|[a-z]+)\s*(.*)$/i);
      if (!m) return;
      var color = m[1];
      var poss = m[2] ? m[2].trim().split(/\s+/) : [];
      var toFrac = function (p) {
        if (/%$/.test(p)) return parseFloat(p) / 100;
        if (/deg$/.test(p)) return parseFloat(p) / 360;
        if (/turn$/.test(p)) return parseFloat(p);
        if (/rad$/.test(p)) return parseFloat(p) / (2 * Math.PI);
        if (/px$/.test(p)) return parseFloat(p) / (unitFull || 1);
        var n = parseFloat(p);
        return isNaN(n) ? null : n / 100;
      };
      if (!poss.length) stops.push({ c: color, p: null });
      poss.forEach(function (p) { stops.push({ c: color, p: toFrac(p) }); });
    });
    if (!stops.length) return stops;
    if (stops[0].p == null) stops[0].p = 0;
    if (stops[stops.length - 1].p == null) stops[stops.length - 1].p = 1;
    var last = stops[0].p;
    for (var i = 1; i < stops.length; i++) {
      if (stops[i].p == null) {
        var j = i; while (stops[j].p == null) j++;
        var a = stops[i - 1].p, b = stops[j].p;
        for (var k = i; k < j; k++) stops[k].p = a + (b - a) * (k - i + 1) / (j - i + 1);
      }
      if (stops[i].p < last) stops[i].p = last;
      last = stops[i].p;
    }
    return stops;
  }

  function addStops(g, stops) {
    stops.forEach(function (s) {
      try { g.addColorStop(Math.max(0, Math.min(1, s.p)), s.c); } catch (e) {}
    });
  }

  function drawGradient(ctx, layer, x, y, w, h) {
    var m = layer.match(/^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/);
    if (!m) return;
    var type = m[2];
    var args = splitTop(m[3], ',');
    var g = null;
    var cx = x + w / 2, cy = y + h / 2;
    if (type === 'linear') {
      var ang = 180;
      var first = args[0];
      if (/^-?[\d.]+(deg|turn|rad|grad)$/.test(first)) {
        ang = parseFloat(first);
        if (/turn$/.test(first)) ang *= 360;
        else if (/rad$/.test(first)) ang = ang * 180 / Math.PI;
        else if (/grad$/.test(first)) ang *= 0.9;
        args.shift();
      } else if (/^to /.test(first)) {
        var t = first.slice(3);
        var dx = (/right/.test(t) ? 1 : /left/.test(t) ? -1 : 0) * w;
        var dy = (/bottom/.test(t) ? 1 : /top/.test(t) ? -1 : 0) * h;
        ang = Math.atan2(dx, -dy) * 180 / Math.PI;
        args.shift();
      }
      var rad = ang * Math.PI / 180;
      var sx = Math.sin(rad), sy = -Math.cos(rad);
      var L = Math.abs(w / 2 * sx) + Math.abs(h / 2 * sy);
      g = ctx.createLinearGradient(cx - sx * L, cy - sy * L, cx + sx * L, cy + sy * L);
      addStops(g, parseStops(args, 2 * L));
    } else if (type === 'conic') {
      var from = 0, ox = cx, oy = cy;
      if (/^(from|at) /.test(args[0])) {
        var head = args.shift();
        var fm = head.match(/from\s+(-?[\d.]+)(deg|turn|rad)?/);
        if (fm) from = parseFloat(fm[1]) * (fm[2] === 'turn' ? 360 : fm[2] === 'rad' ? 180 / Math.PI : 1);
        var am = head.match(/at\s+(\S+)\s+(\S+)/);
        if (am) {
          ox = x + (/%$/.test(am[1]) ? parseFloat(am[1]) / 100 * w : px(am[1]));
          oy = y + (/%$/.test(am[2]) ? parseFloat(am[2]) / 100 * h : px(am[2]));
        }
      }
      if (!ctx.createConicGradient) return;
      g = ctx.createConicGradient((from - 90) * Math.PI / 180, ox, oy);
      addStops(g, parseStops(args, 1));
    } else {
      if (/(circle|ellipse|at |closest|farthest)/.test(args[0]) && !/^(rgba?|#|transparent)/.test(args[0])) args.shift();
      var R = Math.sqrt(w * w + h * h) / 2;
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      addStops(g, parseStops(args, R));
    }
    if (!g) return;
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  function layerRect(sizeStr, posStr, natW, natH, W, H) {
    var s = (sizeStr || 'auto').trim();
    var w, h;
    if (s === 'cover' || s === 'contain') {
      var ratio = (s === 'cover' ? Math.max : Math.min)(W / natW, H / natH);
      w = natW * ratio; h = natH * ratio;
    } else {
      var parts = s.split(/\s+/);
      var dim = function (v, full) {
        if (v === 'auto' || v == null) return null;
        return /%$/.test(v) ? parseFloat(v) / 100 * full : px(v);
      };
      w = dim(parts[0], W); h = dim(parts[1] || 'auto', H);
      if (w == null && h == null) { w = natW || W; h = natH || H; }
      else if (w == null) w = natW ? h * natW / natH : W;
      else if (h == null) h = natH ? w * natH / natW : H;
    }
    var pp = (posStr || '0% 0%').trim().split(/\s+/);
    var pos = function (v, free) {
      if (v == null) return free / 2;
      return /%$/.test(v) ? parseFloat(v) / 100 * free : px(v);
    };
    return { x: pos(pp[0], W - w), y: pos(pp[1], H - h), w: w, h: h };
  }

  /* ---------- 元素幾何 ---------- */

  function geometry(el, cs, sr, scale) {
    var r = el.getBoundingClientRect();
    var g = {
      x: (r.left - sr.left) / scale, y: (r.top - sr.top) / scale,
      w: r.width / scale, h: r.height / scale, rot: 0
    };
    if (cs.transform && cs.transform !== 'none' && el.offsetWidth != null) {
      var m = cs.transform.match(/matrix\(([^)]+)\)/);
      if (m) {
        var v = m[1].split(',').map(parseFloat);
        var ang = Math.atan2(v[1], v[0]) * 180 / Math.PI;
        if (Math.abs(ang) > 0.5) {
          var ow = el.offsetWidth, oh = el.offsetHeight;
          var cx = g.x + g.w / 2, cy = g.y + g.h / 2;
          g = { x: cx - ow / 2, y: cy - oh / 2, w: ow, h: oh, rot: (ang + 360) % 360 };
        }
      }
    }
    return g;
  }

  function effOpacity(el, slide) {
    var o = 1;
    for (var n = el; n && n !== slide.parentNode; n = n.parentElement) {
      o *= parseFloat(getComputedStyle(n).opacity);
    }
    return o;
  }

  function zIndexOf(el, slide) {
    var z = 0;
    for (var n = el; n && n !== slide; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.position !== 'static' && cs.zIndex !== 'auto') z = parseInt(cs.zIndex, 10) || 0;
    }
    return z;
  }

  function hidden(el, cs) {
    return cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0;
  }

  /* ---------- 偽元素（::before / ::after）暫時轉成真元素，才量得到位置 ---------- */

  function materializePseudos(root) {
    var made = [];
    root.querySelectorAll('*').forEach(function (el) {
      if (el.closest('svg')) return;
      ['::before', '::after'].forEach(function (p) {
        var cs = getComputedStyle(el, p);
        var c = cs.content;
        if (!c || c === 'none' || c === 'normal' || cs.display === 'none') return;
        var span = document.createElement('span');
        span.setAttribute('data-pptx-pseudo', '');
        for (var i = 0; i < cs.length; i++) {
          var n = cs[i];
          span.style.setProperty(n, cs.getPropertyValue(n));
        }
        var m = c.match(/^"([\s\S]*)"$/);
        span.textContent = m ? m[1].replace(/\\"/g, '"').replace(/\\a\s?/g, '\n') : '';
        made.push({ span: span, el: el, before: p === '::before' });
      });
    });
    made.forEach(function (m) {
      if (m.before) m.el.insertBefore(m.span, m.el.firstChild);
      else m.el.appendChild(m.span);
      m.el.classList.add('pptx-nopseudo');
    });
    return function restore() {
      made.forEach(function (m) {
        m.span.remove();
        m.el.classList.remove('pptx-nopseudo');
      });
    };
  }

  /* ---------- 背景／邊框／陰影 ---------- */

  function hasPaintLayers(cs) {
    return cs.backgroundImage && cs.backgroundImage !== 'none';
  }

  function shadowOf(cs) {
    if (!cs.boxShadow || cs.boxShadow === 'none') return null;
    var first = splitTop(cs.boxShadow, ',')[0];
    if (/inset/.test(first)) return null;
    var col = (first.match(/rgba?\([^)]+\)/) || [])[0];
    var nums = first.replace(/rgba?\([^)]+\)/, '').trim().split(/\s+/).map(px);
    var c = parseColor(col);
    if (!c) return null;
    var ox = nums[0] || 0, oy = nums[1] || 0, blur = nums[2] || 0;
    return {
      type: 'outer', color: c.hex, opacity: Math.min(1, c.a),
      blur: Math.min(100, blur * PT), offset: Math.min(200, Math.sqrt(ox * ox + oy * oy) * PT),
      angle: Math.round(((Math.atan2(oy, ox) * 180 / Math.PI) + 360) % 360)
    };
  }

  function borders(cs) {
    return ['Top', 'Right', 'Bottom', 'Left'].map(function (s) {
      var st = cs['border' + s + 'Style'];
      var w = px(cs['border' + s + 'Width']);
      var c = parseColor(cs['border' + s + 'Color']);
      if (st === 'none' || st === 'hidden' || !w || !c) return null;
      return { w: w, c: c, style: st };
    });
  }

  function sameBorder(b) {
    if (!b[0]) return false;
    return b.every(function (x) {
      return x && Math.abs(x.w - b[0].w) < 0.01 && x.c.hex === b[0].c.hex && Math.abs(x.c.a - b[0].c.a) < 0.01;
    });
  }

  // 背景含漸層／背景圖，或需旋轉的不規則邊框 → 畫成圖片
  async function rasterBox(el, cs, g, opacity, withBorders) {
    var cv = makeCanvas(g.w, g.h), ctx = cv.ctx;
    var r = radii(cs, g.w, g.h);
    var whitenAfter = applyFilter(ctx, cs.filter);
    ctx.save();
    roundRectPath(ctx, 0, 0, g.w, g.h, r);
    ctx.clip();
    var bg = parseColor(cs.backgroundColor);
    if (bg) { ctx.fillStyle = cs.backgroundColor; ctx.fillRect(0, 0, g.w, g.h); }
    var layers = hasPaintLayers(cs) ? splitTop(cs.backgroundImage, ',') : [];
    var sizes = splitTop(cs.backgroundSize, ','), poss = splitTop(cs.backgroundPosition, ',');
    for (var i = layers.length - 1; i >= 0; i--) {
      var L = layers[i];
      var size = sizes[i % sizes.length], pos = poss[i % poss.length];
      var um = L.match(/^url\(["']?(.*?)["']?\)$/);
      if (um) {
        try {
          var img = await loadImage(um[1]);
          var lr = layerRect(size, pos, img.naturalWidth, img.naturalHeight, g.w, g.h);
          ctx.drawImage(img, lr.x, lr.y, lr.w, lr.h);
        } catch (e) {}
      } else {
        var gr = layerRect(size, pos, 0, 0, g.w, g.h);
        if (size === 'auto' || size === 'auto auto') gr = { x: 0, y: 0, w: g.w, h: g.h };
        drawGradient(ctx, L, gr.x, gr.y, gr.w, gr.h);
      }
    }
    if (withBorders) {
      // 照 CSS 的斜角接合畫四邊（梯形），CSS 三角形也能正確呈現
      var b = borders(cs);
      var t = px(cs.borderTopWidth), rr = px(cs.borderRightWidth), bb = px(cs.borderBottomWidth), l = px(cs.borderLeftWidth);
      var W = g.w, H = g.h;
      var polys = [
        [b[0], cs.borderTopColor, [[0, 0], [W, 0], [W - rr, t], [l, t]]],
        [b[1], cs.borderRightColor, [[W, 0], [W, H], [W - rr, H - bb], [W - rr, t]]],
        [b[2], cs.borderBottomColor, [[0, H], [W, H], [W - rr, H - bb], [l, H - bb]]],
        [b[3], cs.borderLeftColor, [[0, 0], [l, t], [l, H - bb], [0, H]]]
      ];
      polys.forEach(function (p) {
        if (!p[0]) return;
        ctx.fillStyle = p[1];
        ctx.beginPath();
        p[2].forEach(function (pt, i) { if (i) ctx.lineTo(pt[0], pt[1]); else ctx.moveTo(pt[0], pt[1]); });
        ctx.closePath();
        ctx.fill();
      });
    }
    ctx.restore();
    if (whitenAfter) whiten(ctx, g.w, g.h);
    return { data: cv.c.toDataURL('image/png'), opacity: opacity };
  }

  /* ---------- 圖片 ---------- */

  async function rasterImg(el, cs, g) {
    var src = el.currentSrc || el.src;
    var img;
    try { img = await loadImage(src); } catch (e) { return null; }
    var cv = makeCanvas(g.w, g.h), ctx = cv.ctx;
    var whitenAfter = applyFilter(ctx, cs.filter);
    // object-fit 只對內容框起作用：扣掉 padding／border
    var bl = px(cs.borderLeftWidth) + px(cs.paddingLeft), bt = px(cs.borderTopWidth) + px(cs.paddingTop);
    var cw = g.w - bl - px(cs.borderRightWidth) - px(cs.paddingRight);
    var ch = g.h - bt - px(cs.borderBottomWidth) - px(cs.paddingBottom);
    var nw = img.naturalWidth, nh = img.naturalHeight;
    var fit = cs.objectFit, dw = cw, dh = ch;
    if (fit === 'cover' || fit === 'contain' || fit === 'scale-down') {
      var ratio = (fit === 'cover' ? Math.max : Math.min)(cw / nw, ch / nh);
      if (fit === 'scale-down') ratio = Math.min(1, ratio);
      dw = nw * ratio; dh = nh * ratio;
    } else if (fit === 'none') { dw = nw; dh = nh; }
    var op = (cs.objectPosition || '50% 50%').split(/\s+/);
    var ofs = function (v, free) { return /%$/.test(v) ? parseFloat(v) / 100 * free : px(v); };
    var dx = bl + ofs(op[0], cw - dw), dy = bt + ofs(op[1] || '50%', ch - dh);
    ctx.save();
    roundRectPath(ctx, 0, 0, g.w, g.h, radii(cs, g.w, g.h));
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    if (whitenAfter) whiten(ctx, g.w, g.h);
    var isPhoto = /\.jpe?g(\?|$)/i.test(src) && !whitenAfter;
    var rr = radii(cs, g.w, g.h).some(function (v) { return v > 0.5; });
    try {
      return cv.c.toDataURL(isPhoto && !rr ? 'image/jpeg' : 'image/png', 0.9);
    } catch (e) { return null; }
  }

  /* ---------- SVG（圖表、圖示）---------- */

  var SVG_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap',
    'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'font-size', 'font-family',
    'font-weight', 'text-anchor', 'dominant-baseline', 'letter-spacing', 'visibility', 'display'];

  async function rasterSvg(svg, g) {
    var clone = svg.cloneNode(true);
    var src = svg.querySelectorAll('*'), dst = clone.querySelectorAll('*');
    var inline = function (from, to) {
      var cs = getComputedStyle(from);
      SVG_PROPS.forEach(function (p) {
        var v = cs.getPropertyValue(p);
        if (v) to.style.setProperty(p, v);
      });
    };
    inline(svg, clone);
    for (var i = 0; i < src.length; i++) inline(src[i], dst[i]);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', g.w);
    clone.setAttribute('height', g.h);
    clone.style.background = 'none';
    clone.style.border = 'none';
    var xml = new XMLSerializer().serializeToString(clone);
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    try {
      var img = await loadImage(url);
      var cv = makeCanvas(g.w, g.h);
      cv.ctx.drawImage(img, 0, 0, g.w, g.h);
      return cv.c.toDataURL('image/png');
    } catch (e) { return null; }
  }

  /* ---------- 文字 ---------- */

  function blockOwner(node, slide) {
    var el = node.parentElement;
    while (el && el !== slide && getComputedStyle(el).display === 'inline') el = el.parentElement;
    return el;
  }

  function runStyle(cs, opacity, ch) {
    var c = parseColor(cs.color) || { hex: '000000', a: 1 };
    var fam = (cs.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim();
    var face = isCJK(ch) || !fam || /sans-serif|serif|system/.test(fam) ? FONT_CJK : fam;
    var ls = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing);
    var deco = cs.textDecorationLine || cs.textDecoration || '';
    return {
      fontFace: face,
      fontSize: Math.round(px(cs.fontSize) * PT * 2) / 2,
      bold: parseInt(cs.fontWeight, 10) >= 600,
      italic: cs.fontStyle === 'italic',
      underline: /underline/.test(deco) ? { style: 'sng' } : undefined,
      strike: /line-through/.test(deco) ? 'sngStrike' : undefined,
      color: c.hex,
      transparency: transp(c.a * opacity) || undefined,
      charSpacing: ls ? Math.round(ls * PT * 10) / 10 : undefined
    };
  }

  function styleKey(s) {
    return [s.fontFace, s.fontSize, s.bold, s.italic, s.color, s.transparency, s.charSpacing, !!s.underline, s.strike].join('|');
  }

  function lineHeightPx(cs) {
    if (cs.lineHeight === 'normal') return px(cs.fontSize) * 1.25;
    return px(cs.lineHeight);
  }

  function transformText(t, tt) {
    if (tt === 'uppercase') return t.toUpperCase();
    if (tt === 'lowercase') return t.toLowerCase();
    return t;
  }

  // 依瀏覽器實際排版，一個字一個字量位置，切出每一行
  function measureText(nodes, sr, scale, slide) {
    var range = document.createRange();
    var lines = [], cur = null;
    nodes.forEach(function (node) {
      var parent = node.parentElement;
      var cs = getComputedStyle(parent);
      var op = effOpacity(parent, slide);
      var text = node.nodeValue;
      var lh = lineHeightPx(cs);
      for (var i = 0; i < text.length;) {
        var cp = text.codePointAt(i);
        var len = cp > 0xffff ? 2 : 1;
        var ch = text.substr(i, len);
        range.setStart(node, i); range.setEnd(node, i + len);
        i += len;
        var rects = range.getClientRects();
        if (!rects.length) continue;
        var r = rects[rects.length - 1];
        var ws = /\s/.test(ch);
        if (ws && r.width < 0.5) continue;
        if (ch === '\n') continue;
        var top = (r.top - sr.top) / scale, bottom = (r.bottom - sr.top) / scale;
        var left = (r.left - sr.left) / scale, right = (r.right - sr.left) / scale;
        var mid = (top + bottom) / 2;
        if (!cur || mid > cur.bottom || (left < cur.right - 2 && mid > cur.top + (cur.bottom - cur.top) * 0.6)) {
          if (ws) continue; // 行首空白不要
          cur = { top: top, bottom: bottom, left: left, right: right, runs: [], lh: lh, mid: mid };
          lines.push(cur);
        }
        cur.top = Math.min(cur.top, top); cur.bottom = Math.max(cur.bottom, bottom);
        cur.left = Math.min(cur.left, left); cur.right = Math.max(cur.right, right);
        cur.lh = Math.max(cur.lh, lh);
        var out = ws ? ' ' : transformText(ch, cs.textTransform);
        var st = runStyle(cs, op, ch);
        var key = styleKey(st);
        var last = cur.runs[cur.runs.length - 1];
        if (last && last.key === key) last.text += out;
        else cur.runs.push({ text: out, options: st, key: key });
      }
    });
    lines.forEach(function (l) {
      var last = l.runs[l.runs.length - 1];
      if (last) last.text = last.text.replace(/\s+$/, '');
      l.runs = l.runs.filter(function (r) { return r.text.length; });
    });
    return lines.filter(function (l) { return l.runs.length; });
  }

  function textItem(owner, lines, sr, scale) {
    var cs = getComputedStyle(owner);
    var align = cs.textAlign;
    align = align === 'center' ? 'center' : (align === 'right' || align === 'end') ? 'right' : 'left';
    var left = Math.min.apply(null, lines.map(function (l) { return l.left; }));
    var right = Math.max.apply(null, lines.map(function (l) { return l.right; }));
    if (align !== 'left') {
      var r = owner.getBoundingClientRect();
      var ol = (r.left - sr.left) / scale + px(cs.borderLeftWidth) + px(cs.paddingLeft);
      var orr = (r.right - sr.left) / scale - px(cs.borderRightWidth) - px(cs.paddingRight);
      if (orr - ol >= right - left - 1) { left = Math.min(left, ol); right = Math.max(right, orr); }
    }
    // 每一行的行高：用實際量到的行距，讓文字上下位置和網頁一致
    var pitches = lines.map(function (l, i) {
      if (i < lines.length - 1) {
        var p = lines[i + 1].mid - l.mid;
        if (p > 0) return p;
      }
      return Math.max(l.lh, l.bottom - l.top);
    });
    if (lines.length > 1) pitches[lines.length - 1] = Math.max(pitches[lines.length - 1], pitches[lines.length - 2] * 0.5);
    var y = lines[0].mid - pitches[0] / 2;
    var h = pitches.reduce(function (a, b) { return a + b; }, 0);
    var runs = [];
    lines.forEach(function (l, i) {
      l.runs.forEach(function (r, j) {
        var o = Object.assign({}, r.options);
        if (j === 0) { o.lineSpacing = Math.round(pitches[i] * PT * 10) / 10; o.align = align; }
        if (j === l.runs.length - 1 && i < lines.length - 1) o.breakLine = true;
        runs.push({ text: r.text, options: o });
      });
    });
    var slack = 6; // PowerPoint 字寬可能略大，留一點空間
    var x = left, w = right - left;
    if (align === 'left') w += slack;
    else if (align === 'right') { x -= slack; w += slack; }
    else { x -= slack / 2; w += slack; }
    return { runs: runs, x: x, y: y, w: w, h: h };
  }

  /* ---------- 單頁轉換 ---------- */

  function clipFor(el, slide, sr, scale) {
    var c = { l: 0, t: 0, r: SLIDE_W, b: SLIDE_H };
    for (var n = el.parentElement; n && n !== slide; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.overflow !== 'visible' || cs.overflowX !== 'visible') {
        var r = n.getBoundingClientRect();
        c.l = Math.max(c.l, (r.left - sr.left) / scale); c.t = Math.max(c.t, (r.top - sr.top) / scale);
        c.r = Math.min(c.r, (r.right - sr.left) / scale); c.b = Math.min(c.b, (r.bottom - sr.top) / scale);
      }
    }
    return c;
  }

  async function convertSlide(pptx, slide) {
    var sr = slide.getBoundingClientRect();
    var scale = sr.width / SLIDE_W || 1;
    var ps = pptx.addSlide();
    var scs = getComputedStyle(slide);
    var sbg = parseColor(scs.backgroundColor);
    ps.background = { color: sbg ? sbg.hex : 'FFFFFF' };
    if (hasPaintLayers(scs)) {
      var bgImg = await rasterBox(slide, scs, { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H }, 1, false);
      ps.background = { data: bgImg.data };
    }

    var items = [];          // { z, order, add: fn }
    var order = 0;
    var textNodes = new Map();

    // 文字分組（以最近的區塊元素為單位）
    var tw = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
    var tn;
    while ((tn = tw.nextNode())) {
      var pe = tn.parentElement;
      if (!pe || pe.closest('svg,script,style,button.present-toggle,textarea')) continue;
      var owner = blockOwner(tn, slide);
      if (!owner) continue;
      if (!textNodes.has(owner)) textNodes.set(owner, []);
      textNodes.get(owner).push(tn);
    }

    async function visit(el) {
      var cs = getComputedStyle(el);
      if (hidden(el, cs)) return;
      var isSlide = el === slide;
      var g = isSlide ? null : geometry(el, cs, sr, scale);
      var z = zIndexOf(el, slide);
      if (g && g.w > 0.5 && g.h > 0.5 && g.x < SLIDE_W && g.y < SLIDE_H && g.x + g.w > 0 && g.y + g.h > 0) {
        var op = effOpacity(el, slide);
        var clip = clipFor(el, slide, sr, scale);
        if (g.rot === 0 && (g.x < clip.l - 0.5 || g.y < clip.t - 0.5 || g.x + g.w > clip.r + 0.5 || g.y + g.h > clip.b + 0.5)
          && (clip.l > 0 || clip.t > 0 || clip.r < SLIDE_W || clip.b < SLIDE_H)) {
          // 被卡片等容器裁切：只保留看得到的部分
          var nx = Math.max(g.x, clip.l), ny = Math.max(g.y, clip.t);
          var nr = Math.min(g.x + g.w, clip.r), nb = Math.min(g.y + g.h, clip.b);
          if (nr - nx < 0.5 || nb - ny < 0.5) return;
          g = { x: nx, y: ny, w: nr - nx, h: nb - ny, rot: 0, clipped: true };
        }
        await paintBox(el, cs, g, op, z);
      }
      if (el.tagName === 'svg' || el.tagName === 'IMG' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) await visit(c);
      if (textNodes.has(el)) {
        var lines = measureText(textNodes.get(el), sr, scale, slide);
        if (lines.length) {
          var t = textItem(el, lines, sr, scale);
          pushText(t, z);
        }
      }
    }

    function pushText(t, z) {
      items.push({ z: z, order: order++, add: function () {
        ps.addText(t.runs, {
          x: t.x * IN, y: t.y * IN, w: Math.max(t.w, 4) * IN, h: Math.max(t.h, 4) * IN,
          margin: [0, 0, 0, 0], valign: 'top', wrap: false, fit: 'none', paraSpaceBefore: 0, paraSpaceAfter: 0
        });
      } });
    }

    async function paintBox(el, cs, g, op, z) {
      var pos = { x: g.x * IN, y: g.y * IN, w: g.w * IN, h: g.h * IN };
      if (g.rot) pos.rotate = g.rot;

      if (el.tagName === 'IMG') {
        var data = await rasterImg(el, cs, g);
        if (data) items.push({ z: z, order: order++, add: function () {
          ps.addImage(Object.assign({ data: data, transparency: op < 1 ? transp(op) : undefined }, pos));
        } });
        return;
      }
      if (el.tagName === 'svg') {
        // 先畫 svg 自己的背景
        if (parseColor(cs.backgroundColor) || hasPaintLayers(cs)) {
          var b0 = await rasterBox(el, cs, g, op, false);
          items.push({ z: z, order: order++, add: function () { ps.addImage(Object.assign({ data: b0.data }, pos)); } });
        }
        var sd = await rasterSvg(el, g);
        if (sd) items.push({ z: z, order: order++, add: function () {
          ps.addImage(Object.assign({ data: sd, transparency: op < 1 ? transp(op) : undefined }, pos));
        } });
        return;
      }

      var bg = parseColor(cs.backgroundColor);
      var bd = borders(cs);
      var anyBorder = bd.some(Boolean);
      var uniform = sameBorder(bd);
      var r = radii(cs, g.w, g.h);
      var maxR = Math.max.apply(null, r);
      var shadow = shadowOf(cs);

      // 有寬度但透明的邊（CSS 三角形寫法）→ 需要照實畫出斜角
      var hiddenSide = ['Top', 'Right', 'Bottom', 'Left'].some(function (s, i) {
        return !bd[i] && px(cs['border' + s + 'Width']) > 0.5 && cs['border' + s + 'Style'] !== 'none';
      });
      var needRaster = hasPaintLayers(cs) || (anyBorder && !uniform && (g.rot || hiddenSide)) ||
        (g.clipped && maxR > 0.5) || (maxR > 0.5 && Math.max.apply(null, r) - Math.min.apply(null, r) > 0.5 && !(maxR >= Math.min(g.w, g.h) / 2 - 0.5));

      if (needRaster) {
        var rb = await rasterBox(el, cs, g, op, !uniform);
        items.push({ z: z, order: order++, add: function () {
          ps.addImage(Object.assign({ data: rb.data, transparency: op < 1 ? transp(op) : undefined }, pos));
        } });
        if (uniform) addShape(null, bd[0]);
        return;
      }

      if (bg || uniform) addShape(bg, uniform ? bd[0] : null);
      if (anyBorder && !uniform) {
        // 只有單邊框線（例如左側色條）→ 畫成細長色塊
        var sides = [
          bd[0] && { x: g.x, y: g.y, w: g.w, h: bd[0].w, c: bd[0].c },
          bd[1] && { x: g.x + g.w - bd[1].w, y: g.y, w: bd[1].w, h: g.h, c: bd[1].c },
          bd[2] && { x: g.x, y: g.y + g.h - bd[2].w, w: g.w, h: bd[2].w, c: bd[2].c },
          bd[3] && { x: g.x, y: g.y, w: bd[3].w, h: g.h, c: bd[3].c }
        ].filter(Boolean);
        sides.forEach(function (s) {
          items.push({ z: z, order: order++, add: function () {
            ps.addShape(pptx.ShapeType.rect, {
              x: s.x * IN, y: s.y * IN, w: s.w * IN, h: s.h * IN,
              fill: { color: s.c.hex, transparency: transp(s.c.a * op) || undefined },
              line: { type: 'none' }
            });
          } });
        });
      }

      function addShape(fillC, line) {
        var circle = maxR >= Math.min(g.w, g.h) / 2 - 0.5 && maxR > 0.5;
        var type = circle && Math.abs(g.w - g.h) < 1 ? pptx.ShapeType.ellipse
          : maxR > 0.5 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
        var opts = Object.assign({}, pos);
        opts.fill = fillC ? { color: fillC.hex, transparency: transp(fillC.a * op) || undefined } : { type: 'none' };
        if (line) {
          opts.line = { color: line.c.hex, width: line.w * PT, transparency: transp(line.c.a * op) || undefined };
          if (line.style === 'dashed') opts.line.dashType = 'dash';
          else if (line.style === 'dotted') opts.line.dashType = 'sysDot';
        } else opts.line = { type: 'none' };
        if (type === pptx.ShapeType.roundRect) opts.rectRadius = Math.min(maxR, Math.min(g.w, g.h) / 2) * IN;
        if (shadow && fillC) opts.shadow = shadow;
        items.push({ z: z, order: order++, add: function () { ps.addShape(type, opts); } });
      }
    }

    await visit(slide);

    // 表單欄位（例如試算表的輸入框）→ 把目前的數值寫成文字
    slide.querySelectorAll('input, textarea, select').forEach(function (inp) {
      var cs = getComputedStyle(inp);
      if (hidden(inp, cs) || !inp.value) return;
      var g = geometry(inp, cs, sr, scale);
      var st = runStyle(cs, effOpacity(inp, slide), inp.value);
      var align = cs.textAlign === 'center' ? 'center' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'right' : 'left';
      items.push({ z: zIndexOf(inp, slide) + 0.5, order: order++, add: function () {
        ps.addText([{ text: inp.value, options: Object.assign({ align: align }, st) }], {
          x: (g.x + px(cs.paddingLeft) + px(cs.borderLeftWidth)) * IN, y: g.y * IN,
          w: Math.max(4, g.w - px(cs.paddingLeft) - px(cs.paddingRight) - px(cs.borderLeftWidth) - px(cs.borderRightWidth)) * IN,
          h: g.h * IN, margin: [0, 0, 0, 0], valign: 'middle', wrap: false, fit: 'none'
        });
      } });
    });

    items.sort(function (a, b) { return a.z - b.z || a.order - b.order; });
    items.forEach(function (it) { it.add(); });
  }

  /* ---------- 主流程 ---------- */

  function waitImages() {
    var imgs = Array.prototype.slice.call(document.querySelectorAll('.deck img'));
    return Promise.all(imgs.map(function (img) {
      if (img.complete) return null;
      return new Promise(function (res) { img.onload = img.onerror = res; });
    }));
  }

  async function exportPptx(onProgress) {
    await loadLib();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await waitImages();
    var style = document.createElement('style');
    style.textContent = '.pptx-nopseudo::before,.pptx-nopseudo::after{content:none!important}';
    document.head.appendChild(style);
    var slides = Array.prototype.slice.call(document.querySelectorAll('.deck .slide'));
    var restore = materializePseudos(document.querySelector('.deck'));
    var pptx = new window.PptxGenJS();
    pptx.defineLayout({ name: 'SALESKIT', width: SLIDE_W * IN, height: SLIDE_H * IN });
    pptx.layout = 'SALESKIT';
    pptx.author = '練息場 Join to Enjoy';
    pptx.company = '練息場 Join to Enjoy';
    pptx.title = document.title;
    pptx.theme = { headFontFace: FONT_CJK, bodyFontFace: FONT_CJK };
    try {
      for (var i = 0; i < slides.length; i++) {
        if (onProgress) onProgress(i + 1, slides.length);
        await convertSlide(pptx, slides[i]);
        await new Promise(function (r) { setTimeout(r, 0); }); // 讓畫面有機會更新進度
      }
    } finally {
      restore();
      style.remove();
    }
    if (onProgress) onProgress(slides.length, slides.length, '打包中…');
    return pptx.writeFile({ fileName: FILE_NAME });
  }

  /* ---------- 按鈕 ---------- */

  function init() {
    var btn = document.getElementById('pptxDownload');
    if (!btn) return;
    var label = btn.textContent;
    var busy = false;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (busy || document.body.classList.contains('is-presenting')) return;
      busy = true;
      btn.disabled = true;
      exportPptx(function (i, n, msg) { btn.textContent = msg || ('產生中 ' + i + '/' + n); })
        .catch(function (err) {
          console.error(err);
          alert('PPT 產生失敗，請重新整理頁面後再試一次。\n' + (err && err.message ? err.message : ''));
        })
        .then(function () {
          busy = false;
          btn.disabled = false;
          btn.textContent = label;
        });
    });
  }

  window.SaleskitPptx = { export: exportPptx };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
