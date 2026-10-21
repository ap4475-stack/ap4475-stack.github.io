// Hero: order-book terrain. A synthetic, slowly evolving depth heightfield.
// x = price level (1c to 99c), z = time (front row is "now"), y = resting depth.
// The data is generated here and is illustrative only. It is not market data.
//
// Classic script on purpose: three.js arrives through a dynamic import(), so the page also works
// from file://. A Canvas 2D drawing of the same book is the static fallback for reduced motion,
// no WebGL, or a failed import. Colors are read from the CSS tokens and follow the theme toggle.
// Screenshot hook: ?p=0..1 pins the tilt (0 oblique, 1 top-down heatmap).
(function () {
  'use strict';
  var hero = document.querySelector('.hero-terrain');
  if (!hero) return;
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  var root = document.documentElement;
  var scene = hero.querySelector('.terrain-scene');
  var staticCanvas = hero.querySelector('.terrain-static');
  var textEl = hero.querySelector('.terrain-text');
  var heatCap = hero.querySelector('.terrain-heatcap');
  var modeEl = hero.querySelector('.terrain-mode');
  var labelEls = {};
  hero.querySelectorAll('.terrain-tlabel').forEach(function (el) { labelEls[el.dataset.k] = el; });

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pinned = new URLSearchParams(location.search).get('p');
  var forcedP = pinned === null || pinned === '' || isNaN(+pinned) ? null : Math.min(1, Math.max(0, +pinned));

  // ---------- synthetic book model (deterministic seed) ----------
  var NX = 99, NZ = 84, W = 10, D = 8, HMAX = 1.05;
  var dx = W / (NX - 1), dz = D / (NZ - 1);
  var seed = 20261020;
  function rand() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function gauss() { var u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  var H = new Float32Array(NX * NZ), S = new Int8Array(NX * NZ);
  var levelNoise = new Float32Array(NX), rowNew = new Float32Array(NX), walls = [];
  var book = { mid: 52, bid: 51, ask: 53 };
  function stepBook() {
    book.mid += gauss() * 0.55 + 0.012 * (50 - book.mid);
    if (rand() < 0.012) book.mid += (rand() < 0.5 ? -1 : 1) * (3 + rand() * 4);
    book.mid = Math.min(82, Math.max(18, book.mid));
    var spread = 1 + (rand() < 0.35 ? 1 : 0) + (rand() < 0.1 ? 1 : 0);
    book.bid = Math.round(book.mid - spread / 2); book.ask = book.bid + spread;
    if (rand() < 0.06 && walls.length < 7) {
      var side = rand() < 0.5 ? -1 : 1, dist = 2 + Math.floor(rand() * 16);
      walls.push({ p: side < 0 ? book.bid - dist : book.ask + dist, side: side, amp: 0.35 + rand() * 0.6, life: 50 + rand() * 120, age: 0 });
    }
    for (var i = walls.length - 1; i >= 0; i--) {
      var w = walls[i]; w.age++;
      if (w.age > w.life || (w.side < 0 ? w.p >= book.ask : w.p <= book.bid)) walls.splice(i, 1);
    }
    for (var x = 0; x < NX; x++) {
      levelNoise[x] = 0.9 * levelNoise[x] + 0.1 * gauss();
      var price = x + 1, h = 0, s = 0, d;
      if (price <= book.bid) { s = -1; d = book.bid - price + 1; h = (1 - Math.exp(-d / 2.4)) * Math.exp(-d / 15); }
      else if (price >= book.ask) { s = 1; d = price - book.ask + 1; h = (1 - Math.exp(-d / 2.4)) * Math.exp(-d / 15); }
      if (s) {
        h *= 0.8 * (1 + 0.45 * levelNoise[x]);
        for (var j = 0; j < walls.length; j++) {
          var wl = walls[j]; if (wl.side !== s) continue;
          var env = Math.min(1, wl.age / 12, (wl.life - wl.age) / 18), k = (price - wl.p) / 0.9;
          h += wl.amp * env * Math.exp(-k * k);
        }
      }
      rowNew[x] = Math.max(0, s ? 0.5 * H[x] + 0.5 * h : 0);
      S[x] = s;
    }
  }
  function pushRow() {
    H.copyWithin(NX, 0, (NZ - 1) * NX); S.copyWithin(NX, 0, (NZ - 1) * NX);
    stepBook(); H.set(rowNew, 0);
  }
  for (var w0 = 0; w0 < NZ + 30; w0++) pushRow();

  // ---------- palette from CSS tokens ----------
  var probe = document.createElement('canvas').getContext('2d');
  function toRGB(str, fallback) {
    probe.fillStyle = fallback; probe.fillStyle = (str || '').trim() || fallback;
    var c = probe.fillStyle; // "#rrggbb" or "rgba(r, g, b, a)"
    if (c.charAt(0) === '#') return [parseInt(c.substr(1, 2), 16) / 255, parseInt(c.substr(3, 2), 16) / 255, parseInt(c.substr(5, 2), 16) / 255];
    var m = c.match(/[\d.]+/g) || [0, 0, 0];
    return [m[0] / 255, m[1] / 255, m[2] / 255];
  }
  var pal = {};
  function readPalette() {
    var cs = getComputedStyle(hero);
    pal.bg = toRGB(cs.getPropertyValue('--bg'), '#0b0e11');
    pal.line = toRGB(cs.getPropertyValue('--line'), '#2a3345');
    pal.dim = toRGB(cs.getPropertyValue('--surface'), '#1b2230');
    pal.bid = toRGB(cs.getPropertyValue('--accent'), '#26a69a');
    pal.ask = toRGB(cs.getPropertyValue('--ask'), '#7c8db5');
  }
  readPalette();
  function mix(out, a, b, t) { out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t; return out; }
  function css(c) { return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')'; }

  // ---------- shared camera rig: oblique (p = 0) to top-down (p = 1) ----------
  var vw = 1, vh = 1, mobile = false;
  var ease = function (t) { return t * t * (3 - 2 * t); };
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rig(p, px, py) {
    var e = ease(p);
    var theta = lerp(0.98, 0.0001, e) + py * 0.04 * (1 - e);
    var az = lerp(-0.42, 0, e) + px * 0.08 * (1 - e * 0.7);
    var R = mobile ? lerp(19, 21, e) : lerp(20, 19.5, e);
    return {
      e: e, fov: mobile ? 40 : 30,
      pos: [Math.sin(theta) * Math.sin(az) * R, Math.cos(theta) * R, Math.sin(theta) * Math.cos(az) * R],
      target: [0, 0.2 * (1 - e), 0],
      // shift the projection, not the look-at: desktop weights the surface right of the text column,
      // mobile weights it below the text; top-down recentres once the headline has faded
      offX: mobile ? 0 : -vw * lerp(0.3, 0, e),
      offY: mobile ? -vh * lerp(0.17, 0.04, e) : -vh * lerp(0.13, 0, e)
    };
  }
  function sizeOf() {
    var r = scene.getBoundingClientRect();
    vw = Math.max(1, r.width); vh = Math.max(1, r.height); mobile = vw < 720;
  }
  // manual projection used by the static fallback and its labels (matches the three.js camera)
  function projector(c) {
    var f = norm(sub(c.target, c.pos)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
    var tanH = Math.tan(c.fov * Math.PI / 360), aspect = vw / vh;
    return function (x, y, z, out) {
      var d = [x - c.pos[0], y - c.pos[1], z - c.pos[2]];
      var zc = dot(d, f), nx = dot(d, r) / (zc * tanH * aspect), ny = dot(d, u) / (zc * tanH);
      out[0] = (nx * 0.5 + 0.5) * vw - c.offX; out[1] = (-ny * 0.5 + 0.5) * vh - c.offY; out[2] = zc;
      return out;
    };
  }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  var xOf = function (price) { return -W / 2 + (price - 1) * dx; };
  function labelPoints() {
    var front = D / 2 + 0.35;
    return {
      lo: [xOf(1), 0, front], hi: [xOf(99), 0, front],
      bids: [xOf(Math.max(6, book.bid - 14)), 1.15, D / 2 - 0.6],
      asks: [xOf(Math.min(94, book.ask + 14)), 1.15, D / 2 - 0.6],
      now: [W / 2 + 0.55, 0, D / 2], old: [W / 2 + 0.55, 0, -D / 2]
    };
  }
  // keep labels off the text column so they never sit under the headline
  var textBox = null;
  function measureText() {
    if (!textEl) return;
    var a = textEl.getBoundingClientRect(), b = scene.getBoundingClientRect();
    textBox = { l: a.left - b.left, t: a.top - b.top, r: a.right - b.left, b: a.bottom - b.top };
  }
  function placeLabel(k, sx, sy, front, fadeText) {
    var el = labelEls[k]; if (!el) return;
    var vis = front && sx > 24 && sx < vw - 24 && sy > 24 && sy < vh - 64;
    if (vis && textBox && fadeText < 0.5 && sx > textBox.l - 40 && sx < textBox.r + 40 && sy > textBox.t - 16 && sy < textBox.b + 16) vis = false;
    el.style.opacity = vis ? 1 : 0;
    el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) translate(-50%,-50%)';
  }

  // ---------- static fallback: Canvas 2D ridgelines, painter's order, back rows first ----------
  function drawStatic() {
    sizeOf(); measureText();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    staticCanvas.width = Math.round(vw * dpr); staticCanvas.height = Math.round(vh * dpr);
    var g = staticCanvas.getContext('2d');
    if (!g) return false;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, vw, vh);
    var c = rig(forcedP === null ? 0 : Math.min(forcedP, 0.6), 0, 0), proj = projector(c);
    var ptsX = new Float32Array(NX), ptsY = new Float32Array(NX), baseY = new Float32Array(NX), o = [0, 0, 0];
    var col = [0, 0, 0], fogged = [0, 0, 0];
    g.lineWidth = 1; g.lineJoin = 'round';
    for (var z = NZ - 1; z >= 0; z--) {
      var zw = D / 2 - z * dz, depth = 0;
      for (var x = 0; x < NX; x++) {
        proj(-W / 2 + x * dx, H[z * NX + x] * HMAX, zw, o); ptsX[x] = o[0]; ptsY[x] = o[1]; depth = o[2];
        proj(-W / 2 + x * dx, 0, zw, o); baseY[x] = o[1];
      }
      var fog = Math.min(1, Math.max(0, (depth - 15) / 15));
      // occluder: fill the ridge down to its base in the page color
      g.beginPath(); g.moveTo(ptsX[0], baseY[0]);
      for (x = 0; x < NX; x++) g.lineTo(ptsX[x], ptsY[x]);
      g.lineTo(ptsX[NX - 1], baseY[NX - 1]); g.closePath();
      g.fillStyle = css(pal.bg); g.fill();
      // ridgeline, colored by side and depth
      for (x = 0; x < NX - 1; x++) {
        var k = z * NX + x, s = S[k] || S[k + 1], t = Math.min(1, (H[k] + H[k + 1]) / 1.9);
        if (!s) col = pal.line.slice(); else mix(col, pal.dim, s < 0 ? pal.bid : pal.ask, 0.28 + 0.72 * t);
        mix(fogged, col, pal.bg, fog);
        g.strokeStyle = css(fogged);
        g.beginPath(); g.moveTo(ptsX[x], ptsY[x]); g.lineTo(ptsX[x + 1], ptsY[x + 1]); g.stroke();
      }
    }
    var lp = labelPoints();
    for (var key in lp) { proj(lp[key][0], lp[key][1], lp[key][2], o); placeLabel(key, o[0], o[1], o[2] > 0, 0); }
    return true;
  }

  function hasWebGL() {
    try { var t = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (t.getContext('webgl2') || t.getContext('webgl'))); }
    catch (e) { return false; }
  }
  var staticOn = false;
  function useStatic() {
    hero.classList.remove('terrain-motion', 'is-gl');
    hero.classList.add('is-static');
    if (textEl) { textEl.style.opacity = ''; textEl.style.transform = ''; textEl.style.visibility = ''; }
    staticOn = true;
    try { drawStatic(); } catch (e) { hero.classList.remove('is-static'); }
  }
  function watchTheme(onChange) {
    new MutationObserver(function () { readPalette(); onChange(); }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    var mq = matchMedia('(prefers-color-scheme: light)');
    var h = function () { readPalette(); onChange(); };
    if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h);
  }
  var redrawStatic = function () { if (staticOn) { try { drawStatic(); } catch (e) {} } };

  // The static drawing shows first; WebGL replaces it when three.js has loaded.
  var glOK = !reduce && hasWebGL();
  useStatic();
  if (glOK) hero.classList.add('terrain-motion');
  watchTheme(function () { redrawStatic(); if (gl) gl.recolor(); });
  var rz = 0;
  addEventListener('resize', function () {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(function () { if (gl) gl.resize(); else redrawStatic(); });
  }, { passive: true });

  var gl = null;
  if (!glOK) return;
  var importer;
  try { importer = new Function('u', 'return import(u)'); } catch (e) { importer = null; }
  if (!importer) { hero.classList.remove('terrain-motion'); redrawStatic(); return; }
  importer(THREE_URL).then(function (THREE) {
    gl = startGL(THREE);
  }).catch(function (err) {
    if (window.console) console.warn('terrain: static fallback (' + (err && err.message) + ')');
    gl = null; useStatic();
  });

  // ---------- WebGL scene ----------
  function startGL(THREE) {
    var canvas = document.createElement('canvas');
    canvas.className = 'terrain-gl';
    scene.insertBefore(canvas, scene.firstChild);
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    } catch (e) { canvas.remove(); useStatic(); return null; }
    // treat every color as display sRGB, like CSS, so the canvas matches --bg exactly
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    var LIN = THREE.LinearSRGBColorSpace;
    var bgColor = new THREE.Color();
    var s3 = new THREE.Scene();
    s3.fog = new THREE.Fog(bgColor, 15, 30);
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    var pos = new Float32Array(NX * NZ * 3), lineCol = new Float32Array(NX * NZ * 3), fillCol = new Float32Array(NX * NZ * 3);
    for (var z = 0; z < NZ; z++) for (var x = 0; x < NX; x++) { var i = (z * NX + x) * 3; pos[i] = -W / 2 + x * dx; pos[i + 2] = D / 2 - z * dz; }
    var posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
    var lineAttr = new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage);
    var fillAttr = new THREE.BufferAttribute(fillCol, 3).setUsage(THREE.DynamicDrawUsage);
    var tri = [];
    for (z = 0; z < NZ - 1; z++) for (x = 0; x < NX - 1; x++) { var a = z * NX + x, b = a + 1, c = a + NX, d = c + 1; tri.push(a, c, b, b, c, d); }
    var surfGeo = new THREE.BufferGeometry();
    surfGeo.setAttribute('position', posAttr); surfGeo.setAttribute('color', fillAttr); surfGeo.setIndex(tri);
    var surfMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    var surf = new THREE.Mesh(surfGeo, surfMat);
    var seg = [];
    for (z = 0; z < NZ; z++) for (x = 0; x < NX - 1; x++) seg.push(z * NX + x, z * NX + x + 1);
    for (x = 0; x < NX; x += 7) for (z = 0; z < NZ - 1; z++) seg.push(z * NX + x, (z + 1) * NX + x);
    var lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', posAttr); lineGeo.setAttribute('color', lineAttr); lineGeo.setIndex(seg);
    var lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
    var lines = new THREE.LineSegments(lineGeo, lineMat);
    var frameMat = new THREE.LineBasicMaterial({ color: new THREE.Color() });
    var baseFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(W, D)), frameMat);
    baseFrame.rotation.x = -Math.PI / 2; baseFrame.position.y = -0.002;
    var bookG = new THREE.Group(); bookG.add(surf, lines);
    var world = new THREE.Group(); world.add(bookG, baseFrame); s3.add(world);

    var tmp = [0, 0, 0], heat = 0;
    function applyPalette() {
      bgColor.setRGB(pal.bg[0], pal.bg[1], pal.bg[2], LIN);
      renderer.setClearColor(bgColor, 1);
      s3.fog.color.copy(bgColor);
      frameMat.color.setRGB(pal.line[0], pal.line[1], pal.line[2], LIN);
    }
    // fill: a pure occluder in the page color when oblique, the depth heatmap when top-down
    function writeBuffers() {
      for (var k = 0; k < NX * NZ; k++) {
        var h = H[k], s = S[k], j = k * 3, t = Math.min(1, h / 0.95);
        pos[j + 1] = h * HMAX;
        if (!s) tmp = pal.line.slice(); else mix(tmp, pal.dim, s < 0 ? pal.bid : pal.ask, 0.28 + 0.72 * t);
        lineCol[j] = tmp[0]; lineCol[j + 1] = tmp[1]; lineCol[j + 2] = tmp[2];
        if (!s) tmp = pal.bg.slice(); else mix(tmp, pal.bg, s < 0 ? pal.bid : pal.ask, (0.03 + 0.72 * t * t) * heat);
        fillCol[j] = tmp[0]; fillCol[j + 1] = tmp[1]; fillCol[j + 2] = tmp[2];
      }
      posAttr.needsUpdate = true; lineAttr.needsUpdate = true; fillAttr.needsUpdate = true;
    }

    var px = 0, py = 0, tx = 0, ty = 0, trackPx = 0, lineBase = 0.95;
    if (!reduce) addEventListener('pointermove', function (e) { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    function readTrack() { trackPx = parseFloat(getComputedStyle(hero).getPropertyValue('--terrain-track')) || 0; }
    function progress() {
      if (forcedP !== null) return forcedP;
      if (!trackPx) return 0;
      var nav = parseFloat(getComputedStyle(hero).getPropertyValue('--terrain-nav')) || 0;
      return Math.min(1, Math.max(0, (nav - hero.getBoundingClientRect().top) / trackPx));
    }
    function resize() {
      sizeOf(); readTrack(); measureText();
      renderer.setSize(vw, vh, false);
      camera.aspect = vw / vh; camera.updateProjectionMatrix();
      lineBase = mobile ? 0.6 : 0.95;
    }
    var lastMode = '', lastHeat = -1, v3 = new THREE.Vector3();
    function place(p) {
      var c = rig(p, px, py);
      camera.fov = c.fov;
      camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
      camera.lookAt(c.target[0], c.target[1], c.target[2]);
      camera.setViewOffset(vw, vh, c.offX, c.offY, vw, vh);
      var fade = Math.min(1, Math.max(0, (c.e - 0.3) / 0.45));
      if (textEl) {
        textEl.style.opacity = (1 - fade).toFixed(3);
        textEl.style.transform = fade ? 'translateY(' + (-28 * fade).toFixed(1) + 'px)' : '';
        textEl.style.visibility = fade > 0.99 ? 'hidden' : '';
      }
      if (heatCap) heatCap.style.opacity = Math.max(0, (c.e - 0.7) / 0.3).toFixed(3);
      heat = c.e;
      lineMat.opacity = lineBase * (1 - 0.5 * c.e); // let the heatmap fill read when top-down
      var mode = c.e > 0.92 ? 'view: top-down heatmap' : c.e < 0.08 ? 'view: oblique' : 'view: tilting';
      if (mode !== lastMode && modeEl) { modeEl.textContent = mode; lastMode = mode; }
      return fade;
    }
    function labels(fade) {
      var lp = labelPoints();
      for (var key in lp) {
        v3.set(lp[key][0], lp[key][1], lp[key][2]).applyMatrix4(world.matrixWorld).project(camera);
        placeLabel(key, (v3.x * 0.5 + 0.5) * vw, (-v3.y * 0.5 + 0.5) * vh, v3.z < 1, fade);
      }
    }

    var visible = true, raf = 0, last = performance.now(), acc = 0, TICK = 150, shown = false;
    function render() {
      var fade = place(progress());
      if (Math.abs(heat - lastHeat) > 0.002) { writeBuffers(); lastHeat = heat; }
      world.updateMatrixWorld();
      renderer.render(s3, camera);
      labels(fade);
      if (!shown) { shown = true; staticOn = false; hero.classList.remove('is-static'); hero.classList.add('is-gl'); }
    }
    function frame(now) {
      raf = 0;
      var dt = Math.min(100, now - last); last = now; acc += dt;
      if (acc >= TICK) { acc %= TICK; pushRow(); writeBuffers(); }
      bookG.position.z = (acc / TICK) * dz; // glide rows forward between ticks
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      render();
      schedule();
    }
    function schedule() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { last = performance.now(); schedule(); } }, { threshold: 0 }).observe(hero);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { last = performance.now(); schedule(); } });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; visible = false; canvas.remove(); useStatic(); });

    applyPalette(); resize(); writeBuffers(); render(); schedule();
    return {
      resize: function () { resize(); render(); },
      recolor: function () { applyPalette(); writeBuffers(); render(); }
    };
  }
})();
