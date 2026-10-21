/* v3 world (@world): one procedural basin, drawn as contour lines on paper.
   Classic script. three.js loads by dynamic import; any failure falls back to a static SVG contour sheet.
   Contract: reads html[data-active] and the 'atlas:site' event from site.js; exposes window.__world. */
(() => {
  'use strict';
  const root = document.documentElement;
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

  // Map coordinates: x east, y north, in map units. Grid cells are 20 units: columns A to D west to east, rows 1 to 4 north to south.
  const SITES = [
    { id: 'base',          x: -26, y:  26, cam: { d: 72, p: 56, yaw: -4 } },
    { id: 'live-field',    x:  -3, y:  28, cam: { d: 34, p: 58, yaw:  0 } },
    { id: 'fault-lines',   x:  25, y:  17, cam: { d: 36, p: 60, yaw:  6 } },
    { id: 'cone',          x:  24, y:  -8, cam: { d: 34, p: 56, yaw:  3 } },
    { id: 'pipeline',      x:   2, y:  -4, cam: { d: 34, p: 62, yaw: -3 } },
    { id: 'reservoir',     x: -24, y:  -2, cam: { d: 34, p: 55, yaw: -6 } },
    { id: 'settlements',   x: -20, y: -26, cam: { d: 34, p: 58, yaw:  0 } },
    { id: 'survey-office', x:  10, y: -28, cam: { d: 44, p: 64, yaw:  3 } },
  ];
  const LAST = SITES.length - 1;
  const N_LEVELS = 36;   // contour interval = 1 / 36 of unit height; every 5th is an index contour
  const HALF = 66;       // half size of the terrain plane
  const NEAT = 62;       // neatline (map border) half size
  const SEG = 448;       // vertices per side
  const HSCALE = 8;      // world units of height at exaggeration 1
  const EX_LO = 0.3, EX_HI = 1.0;

  const params = new URLSearchParams(location.search);
  const pinIdx = SITES.findIndex((s) => s.id === params.get('world'));
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqDark = matchMedia('(prefers-color-scheme: dark)');
  const isMobile = () => innerWidth < 900;

  const state = { t: pinIdx >= 0 ? pinIdx / LAST : 0, exag: EX_HI, mode: 'init' };
  window.__world = {
    t: () => state.t,
    site: () => (state.mode.startsWith('static') ? SITES[activeIndex()].id : SITES[Math.round(state.t * LAST)].id),
    mode: () => state.mode,
    sites: SITES.map((s) => ({ id: s.id, x: s.x, y: s.y, grid: gridRef(s) })),
  };

  function gridRef(s) {
    const col = 'ABCD'[Math.max(0, Math.min(3, Math.floor((s.x + 40) / 20)))];
    const row = 1 + Math.max(0, Math.min(3, Math.floor((40 - s.y) / 20)));
    return col + row;
  }
  const activeIndex = () => {
    if (pinIdx >= 0) return pinIdx;
    const i = SITES.findIndex((s) => s.id === root.dataset.active);
    return i >= 0 ? i : Math.round(state.t * LAST);
  };

  /* ---------------- map key ---------------- */
  const key = document.querySelector('.map-key');
  function syncKey() {
    if (!key) return;
    const i = activeIndex();
    key.querySelectorAll('ol a').forEach((a) => {
      if (a.getAttribute('href') === '#' + SITES[i].id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    const now = key.querySelector('.map-key-now');
    if (now) now.textContent = String(i).padStart(2, '0');
  }
  if (key) {
    const btn = key.querySelector('.map-key-btn');
    const setOpen = (open, focusBtn) => {
      key.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (!open && focusBtn) btn.focus();
    };
    btn.addEventListener('click', () => {
      const open = !key.classList.contains('is-open');
      setOpen(open);
      if (open) { const a = key.querySelector('a[aria-current]') || key.querySelector('ol a'); a && a.focus(); }
    });
    key.addEventListener('keydown', (e) => { if (e.key === 'Escape' && key.classList.contains('is-open')) setOpen(false, true); });
    key.querySelectorAll('ol a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('click', (e) => { if (!key.contains(e.target)) setOpen(false); });
    key.classList.add('is-ready');
    syncKey();
  }

  /* ---------------- heightfield (pure JS; shared by WebGL and the SVG fallback) ---------------- */
  function hash(ix, iy) {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function vnoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  function fbm(x, y, oct) {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f + i * 17.3, y * f - i * 9.1); n += amp; amp *= 0.5; f *= 2.03; }
    return s / n;
  }
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const gauss = (d2, s) => Math.exp(-d2 / (2 * s * s));
  const S = Object.fromEntries(SITES.map((s) => [s.id, s]));
  const rot = (u, v, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [u * c + v * s, -u * s + v * c]; };
  const HILLS = [[-5, 3, 0.14, 1.9], [-1, 6, 0.11, 1.5], [3, 2, 0.16, 2.2], [6, -3, 0.12, 1.7], [-3, -4, 0.13, 2.0], [1, -7, 0.09, 1.4], [-7, -2, 0.1, 1.6]];

  function heightAt(x, y) {
    // the basin floor: broad gentle relief
    let h = 0.24 + 0.4 * (fbm(x / 24, y / 24, 4) - 0.5) + 0.08 * (fbm(x / 7, y / 7, 3) - 0.5);
    let u, v, w;

    // 00 base camp: a gentle plain
    u = x - S.base.x; v = y - S.base.y;
    w = 1 - sstep(4, 10, Math.hypot(u, v));
    h += w * (0.2 + 0.035 * (fbm(x / 9, y / 9, 2) - 0.5) - h);

    // 01 the live field: twin ridges along a price axis (bid depth west, ask depth east), the spread a valley between
    u = x - S['live-field'].x; v = y - S['live-field'].y;
    {
      const env = gauss(v * v, 4.6) * (1 + 0.12 * Math.sin(v * 0.7 + 1.3));
      const steps = 1 + 0.06 * Math.sin(u * 3.1);
      const bid = 0.52 * gauss((u + 4.2) * (u + 4.2), 1.7) * (u < -4.2 ? 1 : 1) * steps;
      const ask = 0.44 * gauss((u - 4.0) * (u - 4.0), 1.5) * steps;
      const spread = -0.06 * gauss(u * u, 1.0);
      w = 1 - sstep(8, 13, Math.hypot(u * 0.8, v));
      h += env * (bid + ask) + w * spread;
    }

    // 02 fault lines: long linear scarps, a stepped staircase cut by straight faults
    u = x - S['fault-lines'].x; v = y - S['fault-lines'].y;
    {
      const [a, b] = rot(u, v, 28);
      w = (1 - sstep(8, 12, Math.abs(a))) * (1 - sstep(9, 14, Math.abs(b)));
      h += w * 0.75 * (0.26 - h); // calm the basin floor so the faults read
      let st = 0;
      for (const off of [-6, -2.5, 1, 4.5, 7.5]) st += 0.1 * sstep(-0.8, 0.8, a - off + 0.25 * Math.sin(b * 0.3 + off));
      h += w * (st - 0.25);
    }

    // 03 the cone: a fan that widens east from an apex
    u = x - S.cone.x; v = y - S.cone.y;
    {
      const r = u + 8;
      if (r > -3) {
        const k = 0.6 * Math.max(r, 0) + 1.2;
        const q = v / k;
        const fan = Math.exp(-q * q * 1.4) * sstep(-3, 5, r) * (1 - sstep(12, 18, r));
        h += 0.5 * fan;
      }
    }

    // 04 the pipeline: flat ground cut by straight channels
    u = x - S.pipeline.x; v = y - S.pipeline.y;
    {
      w = 1 - sstep(0.8, 1.15, Math.max(Math.abs(u) / 10, Math.abs(v) / 8.5));
      const ch = (d, hw) => 1 - sstep(hw, hw + 0.45, Math.abs(d));
      let cut = ch(v, 0.55) * (1 - sstep(8, 9, Math.abs(u)));
      for (const [cx, dir] of [[-6, 1], [-2, -1], [2, 1], [6, -1]]) cut = Math.max(cut, ch(u - cx, 0.4) * sstep(-0.5, 0.5, v * dir) * (1 - sstep(5.5, 6.5, Math.abs(v))));
      h += w * (0.34 - h) - w * 0.14 * cut;
    }

    // 05 the reservoir: an anticline dome, slightly asymmetric limbs
    u = x - S.reservoir.x; v = y - S.reservoir.y;
    {
      const [a, b] = rot(u, v, 22);
      const bb = b < 0 ? b * 1.25 : b;
      h += 0.6 * Math.exp(-((a * a) / (8.5 * 8.5) + (bb * bb) / (4.6 * 4.6)) * 1.15);
    }

    // 06 settlements: low hills
    u = x - S.settlements.x; v = y - S.settlements.y;
    for (const [hx, hy, amp, s] of HILLS) h += amp * gauss((u - hx) * (u - hx) + (v - hy) * (v - hy), s);

    // 07 survey office: a flat plain
    u = x - S['survey-office'].x; v = y - S['survey-office'].y;
    w = 1 - sstep(7, 13, Math.hypot(u, v));
    h += w * (0.16 + 0.02 * (fbm(x / 9, y / 9, 2) - 0.5) - h);

    return h;
  }

  /* ---------------- tokens ---------------- */
  function hex(v) {
    v = (v || '').trim();
    if (v[0] === '#') {
      if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      const n = parseInt(v.slice(1, 7), 16);
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    }
    const m = v.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map((c) => +c / 255) : [0, 0, 0];
  }
  function readTokens() {
    const cs = getComputedStyle(root);
    const g = (n) => cs.getPropertyValue(n);
    return {
      paper: hex(g('--paper')), c1: hex(g('--contour')), c2: hex(g('--contour-2')), ink: hex(g('--ink')),
      ink2: hex(g('--ink-2')), rust: hex(g('--rust')), sea: hex(g('--sea')), raw: { paper: g('--paper').trim(), ink2: g('--ink-2').trim(), ink: g('--ink').trim() },
    };
  }

  /* ---------------- static SVG contour sheet (reduced motion, no WebGL, CDN failure) ---------------- */
  const worldEl = document.querySelector('.world');
  const canvas = document.getElementById('world');
  let staticHere = null;
  function showStatic(reason) {
    state.mode = 'static' + (reason ? ':' + reason : '');
    if (!worldEl) return;
    worldEl.classList.add('is-static');
    const box = worldEl.querySelector('.world-static');
    if (!box || box.firstChild) return placeStaticHere();
    const R = 150, step = (2 * NEAT) / R;
    const H = new Float32Array((R + 1) * (R + 1));
    for (let j = 0; j <= R; j++) for (let i = 0; i <= R; i++) H[j * (R + 1) + i] = heightAt(-NEAT + i * step, NEAT - j * step);
    const minor = [], index = [];
    const f = (n) => n.toFixed(2);
    for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
      const a = H[j * (R + 1) + i], b = H[j * (R + 1) + i + 1], c = H[(j + 1) * (R + 1) + i + 1], d = H[(j + 1) * (R + 1) + i];
      const lo = Math.min(a, b, c, d) * N_LEVELS, hi = Math.max(a, b, c, d) * N_LEVELS;
      for (let k = Math.ceil(lo); k <= hi; k++) {
        if (k <= 0) continue;
        const L = k / N_LEVELS, x0 = -NEAT + i * step, y0 = -NEAT + j * step; // svg y is down
        const pts = [];
        const edge = (p, q, px, py, qx, qy) => { if ((p < L) !== (q < L)) { const t = (L - p) / (q - p); pts.push([px + (qx - px) * t, py + (qy - py) * t]); } };
        edge(a, b, x0, y0, x0 + step, y0);
        edge(b, c, x0 + step, y0, x0 + step, y0 + step);
        edge(c, d, x0 + step, y0 + step, x0, y0 + step);
        edge(d, a, x0, y0 + step, x0, y0);
        const out = k % 5 === 0 ? index : minor;
        for (let s = 0; s + 1 < pts.length; s += 2) out.push('M' + f(pts[s][0]) + ' ' + f(pts[s][1]) + 'L' + f(pts[s + 1][0]) + ' ' + f(pts[s + 1][1]));
      }
    }
    let grid = '';
    for (let g = -60; g <= 60; g += 10) grid += 'M' + g + ' ' + -NEAT + 'V' + NEAT + 'M' + -NEAT + ' ' + g + 'H' + NEAT;
    const ns = 'http://www.w3.org/2000/svg';
    box.innerHTML =
      '<svg xmlns="' + ns + '" viewBox="' + [-NEAT - 4, -NEAT - 4, 2 * NEAT + 8, 2 * NEAT + 8].join(' ') + '" preserveAspectRatio="xMidYMid meet">' +
      '<path class="gr" d="' + grid + '"/><path class="c1" d="' + minor.join('') + '"/><path class="c2" d="' + index.join('') + '"/>' +
      '<rect class="nl" x="' + -NEAT + '" y="' + -NEAT + '" width="' + 2 * NEAT + '" height="' + 2 * NEAT + '"/>' +
      '<g class="here-g"><circle class="here" r="1.8"/><circle class="here-dot" r="0.35"/></g></svg>';
    staticHere = box.querySelector('.here-g');
    placeStaticHere();
  }
  function placeStaticHere() {
    if (!staticHere) return;
    const s = SITES[activeIndex()];
    staticHere.setAttribute('transform', 'translate(' + s.x + ' ' + -s.y + ')');
  }

  /* ---------------- boot ---------------- */
  if (!worldEl || !canvas) return;
  let world = null;
  const onActive = () => { syncKey(); placeStaticHere(); world && world.here(); };
  window.addEventListener('atlas:site', onActive);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.attributeName === 'data-active') onActive();
      if (m.attributeName === 'data-theme' && world) world.theme();
    }
  }).observe(root, { attributes: true, attributeFilter: ['data-active', 'data-theme'] });
  mqDark.addEventListener && mqDark.addEventListener('change', () => world && world.theme());

  const webglOK = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (mqReduce.matches || params.has('world-static')) return showStatic('reduced');
  if (!webglOK) return showStatic('no-webgl');
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('three timeout')), 9000));
  Promise.race([import(THREE_URL), timeout])
    .then((THREE) => { world = createWorld(THREE); })
    .catch((err) => { console.warn('[world] fallback:', err && err.message); showStatic('fallback'); });
  mqReduce.addEventListener && mqReduce.addEventListener('change', () => { if (mqReduce.matches) { world && world.stop(); showStatic('reduced'); } });

  /* ---------------- WebGL world ---------------- */
  function createWorld(THREE) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (e) { showStatic('no-webgl'); return null; }
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 500);

    // terrain: one mesh, one draw call; height in an attribute, contours in the fragment shader
    const geo = new THREE.PlaneGeometry(2 * HALF, 2 * HALF, SEG - 1, SEG - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const aH = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) aH[i] = heightAt(pos.getX(i), -pos.getZ(i));
    geo.setAttribute('aH', new THREE.BufferAttribute(aH, 1));

    const v3 = (c) => new THREE.Vector3(c[0], c[1], c[2]);
    let tok = readTokens();
    const uniforms = {
      uExag: { value: state.exag }, uHS: { value: HSCALE }, uN: { value: N_LEVELS }, uDpr: { value: 1 }, uNeat: { value: NEAT },
      uPaper: { value: v3(tok.paper) }, uC1: { value: v3(tok.c1) }, uC2: { value: v3(tok.c2) }, uInk: { value: v3(tok.ink2) },
      uRust: { value: v3(tok.rust) }, uSea: { value: v3(tok.sea) }, uHere: { value: new THREE.Vector2() },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute float aH;
        uniform float uExag, uHS;
        varying float vH; varying vec2 vMap;
        void main() {
          vH = aH; vMap = vec2(position.x, -position.z);
          vec3 p = position; p.y = aH * uHS * uExag;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform float uN, uDpr, uNeat;
        uniform vec3 uPaper, uC1, uC2, uInk, uRust, uSea;
        uniform vec2 uHere;
        varying float vH; varying vec2 vMap;
        float iso(float v, float px, out float fw) {
          fw = max(fwidth(v), 1e-5);
          float d = abs(fract(v + 0.5) - 0.5) / fw;
          return clamp(px * 0.5 + 0.5 - d, 0.0, 1.0);
        }
        float ring(float d, float r, float px) { float fw = max(fwidth(d), 1e-5); return clamp(px * 0.5 + 0.5 - abs(d - r) / fw, 0.0, 1.0); }
        void main() {
          vec3 col = uPaper;
          float e = max(abs(vMap.x), abs(vMap.y));
          if (e > uNeat + 0.9) { gl_FragColor = vec4(0.0); return; }
          float fw;
          float nl = max(ring(e, uNeat, 1.3 * uDpr), ring(e, uNeat + 0.8, 0.8 * uDpr));
          if (e > uNeat) { gl_FragColor = vec4(uInk * nl, nl); return; }
          float gx = iso(vMap.x / 10.0, 0.8 * uDpr, fw), gy = iso(vMap.y / 10.0, 0.8 * uDpr, fw);
          col = mix(col, uSea, max(gx, gy) * 0.24);
          float minor = iso(vH * uN, 1.0 * uDpr, fw);
          minor *= 1.0 - smoothstep(0.28, 0.6, fw);
          col = mix(col, uC1, minor);
          float idx = iso(vH * uN / 5.0, 1.7 * uDpr, fw);
          idx *= 1.0 - smoothstep(0.4, 0.8, fw);
          col = mix(col, uC2, idx);
          col = mix(col, uInk, nl);
          float dh = length(vMap - uHere);
          float here = max(ring(dh, 1.4, 2.0 * uDpr), 1.0 - smoothstep(0.24, 0.34, dh));
          col = mix(col, uRust, here);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const terrain = new THREE.Mesh(geo, mat);
    scene.add(terrain);

    // a few elevation labels on index contours: small mono numbers on a paper patch, laid flat on the map
    const labels = [];
    const labelGroup = new THREE.Group();
    scene.add(labelGroup);
    function grad(x, y) { const e = 0.05; return [(heightAt(x + e, y) - heightAt(x - e, y)) / (2 * e), (heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e)]; }
    function placeLabels() {
      const picks = [];
      const want = { 'live-field': 2, 'fault-lines': 2, cone: 1, reservoir: 2, settlements: 1, pipeline: 0, base: 1, 'survey-office': 0 };
      for (const s of SITES) {
        let n = want[s.id] || 0;
        const cands = [];
        for (let r = 3; r <= 10; r += 1.5) for (let k = 0; k < 20; k++) {
          const a = (k / 20) * Math.PI * 2 + r;
          let x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
          const h0 = heightAt(x, y), L = Math.round((h0 * N_LEVELS) / 5) * 5;
          if (L <= 0) continue;
          for (let it = 0; it < 4; it++) {
            const [gx, gy] = grad(x, y), g2 = gx * gx + gy * gy;
            if (g2 < 1e-6) break;
            const dh = heightAt(x, y) - L / N_LEVELS;
            x -= (dh * gx) / g2; y -= (dh * gy) / g2;
          }
          const [gx, gy] = grad(x, y), gm = Math.hypot(gx, gy);
          if (Math.abs(heightAt(x, y) - L / N_LEVELS) > 0.002 || gm < 0.03 || gm > 0.16) continue;
          cands.push({ x, y, L, gx, gy, score: Math.abs(gm - 0.07) });
        }
        cands.sort((p, q) => p.score - q.score);
        for (const c of cands) {
          if (!n) break;
          if (picks.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < 6)) continue;
          picks.push(c); n--;
        }
      }
      for (const p of picks) {
        const cv = document.createElement('canvas');
        cv.width = 128; cv.height = 48;
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.72), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
        // lie flat, baseline along the contour, reading left to right
        let tx = -p.gy, tz = p.gx; // tangent in map (x, y)
        const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl;
        if (tx < 0) { tx = -tx; tz = -tz; }
        const X = new THREE.Vector3(tx, 0, -tz), Z = new THREE.Vector3(0, 1, 0), Y = new THREE.Vector3().crossVectors(Z, X);
        m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
        m.renderOrder = 2;
        labelGroup.add(m);
        labels.push({ mesh: m, cv, tex, text: String(p.L * 10), x: p.x, y: p.y, h: heightAt(p.x, p.y) });
      }
      drawLabels();
    }
    function drawLabels() {
      const t = readTokens();
      for (const l of labels) {
        const c = l.cv.getContext('2d');
        c.clearRect(0, 0, 128, 48);
        c.font = '500 26px "JetBrains Mono", ui-monospace, Menlo, monospace';
        const w = c.measureText(l.text).width + 14;
        c.fillStyle = t.raw.paper;
        c.fillRect(64 - w / 2, 9, w, 30);
        c.fillStyle = t.raw.ink2;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(l.text, 64, 25);
        l.tex.needsUpdate = true;
      }
    }
    placeLabels();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawLabels(); request(); });

    // camera path
    const curve = new THREE.CatmullRomCurve3(SITES.map((s) => new THREE.Vector3(s.x, 0, -s.y)), false, 'centripetal');
    const target = new THREE.Vector3(), tmp = new THREE.Vector3();
    const goal = { t: state.t, exag: EX_HI };
    const par = { x: 0, y: 0, gx: 0, gy: 0 };
    let centers = [];

    function measure() {
      const els = [...document.querySelectorAll('[data-site]')];
      centers = els.map((el) => {
        const idx = SITES.findIndex((s) => s.id === el.dataset.site);
        const r = el.getBoundingClientRect();
        return { idx, c: r.top + scrollY + r.height / 2 };
      }).filter((c) => c.idx >= 0).sort((a, b) => a.c - b.c);
    }
    function computeGoal() {
      if (pinIdx >= 0) { goal.t = pinIdx / LAST; goal.exag = EX_HI; return; }
      if (!centers.length) { goal.t = 0; goal.exag = EX_HI; return; }
      const sc = scrollY + innerHeight / 2;
      if (sc <= centers[0].c) { goal.t = centers[0].idx / LAST; goal.exag = EX_HI; return; }
      const end = centers[centers.length - 1];
      if (sc >= end.c) { goal.t = end.idx / LAST; goal.exag = EX_HI; return; }
      let i = 0;
      while (i < centers.length - 2 && sc > centers[i + 1].c) i++;
      const a = centers[i], b = centers[i + 1];
      const f = (sc - a.c) / Math.max(1, b.c - a.c);
      const fe = sstep(0.12, 0.88, f); // dwell near each site
      goal.t = (a.idx + (b.idx - a.idx) * fe) / LAST;
      const m = Math.abs(2 * f - 1);
      goal.exag = EX_LO + (EX_HI - EX_LO) * sstep(0.35, 0.95, m);
    }

    function lerpCam(t) {
      const p = t * LAST, i = Math.min(LAST - 1, Math.floor(p)), f = p - i;
      const a = SITES[i].cam, b = SITES[i + 1].cam, k = f * f * (3 - 2 * f);
      return { d: a.d + (b.d - a.d) * k, p: a.p + (b.p - a.p) * k, yaw: a.yaw + (b.yaw - a.yaw) * k };
    }

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, isMobile() ? 1.5 : 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(innerWidth, innerHeight, false);
      uniforms.uDpr.value = dpr;
      camera.aspect = innerWidth / innerHeight;
      // desktop: the active site sits in the right 55% of the viewport, beside the content sheets
      if (!isMobile()) camera.setViewOffset(innerWidth, innerHeight, -0.225 * innerWidth, 0, innerWidth, innerHeight);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      measure();
    }

    function place() {
      curve.getPoint(Math.min(1, Math.max(0, state.t)), target);
      const c = lerpCam(state.t);
      target.y = (0.55 * heightAt(target.x, -target.z) + 0.08) * HSCALE * state.exag; // aim at the feature's mid height
      const pr = (c.p * Math.PI) / 180, yr = (c.yaw * Math.PI) / 180;
      tmp.set(Math.sin(yr) * Math.cos(pr) * c.d, Math.sin(pr) * c.d, Math.cos(yr) * Math.cos(pr) * c.d);
      camera.position.copy(target).add(tmp);
      camera.position.x += par.x * 1.6;
      camera.position.z += par.y * 1.0;
      camera.lookAt(target);
      uniforms.uExag.value = state.exag;
      for (const l of labels) l.mesh.position.set(l.x, l.h * HSCALE * state.exag + 0.05, -l.y);
    }

    function here() {
      const s = SITES[activeIndex()];
      uniforms.uHere.value.set(s.x, s.y);
      request();
    }

    let raf = 0, last = 0, running = true, first = true;
    function frame(now) {
      raf = 0;
      if (!running || document.hidden) return;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      computeGoal();
      if (first || pinIdx >= 0) { state.t = goal.t; state.exag = goal.exag; first = false; }
      const k = 1 - Math.exp(-dt * 4.5), ke = 1 - Math.exp(-dt * 3);
      state.t += (goal.t - state.t) * k;
      state.exag += (goal.exag - state.exag) * ke;
      par.x += (par.gx - par.x) * k; par.y += (par.gy - par.y) * k;
      place();
      renderer.render(scene, camera);
      state.mode = 'webgl';
      const moving = Math.abs(goal.t - state.t) > 1e-4 || Math.abs(goal.exag - state.exag) > 1e-3 || Math.abs(par.gx - par.x) > 1e-3 || Math.abs(par.gy - par.y) > 1e-3;
      if (moving) raf = requestAnimationFrame(frame); else last = 0;
    }
    function request() { if (!raf && running) raf = requestAnimationFrame(frame); }

    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', () => { resize(); request(); });
    if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); request(); }).observe(document.body);
    addEventListener('load', () => { measure(); request(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = 0; request(); } });
    if (matchMedia('(pointer: fine)').matches) {
      addEventListener('pointermove', (e) => {
        if (isMobile()) return;
        par.gx = (e.clientX / innerWidth) * 2 - 1; par.gy = (e.clientY / innerHeight) * 2 - 1;
        request();
      }, { passive: true });
    }

    resize();
    here();
    request();

    return {
      here,
      theme() {
        tok = readTokens();
        uniforms.uPaper.value.set(...tok.paper); uniforms.uC1.value.set(...tok.c1); uniforms.uC2.value.set(...tok.c2);
        uniforms.uInk.value.set(...tok.ink2); uniforms.uRust.value.set(...tok.rust); uniforms.uSea.value.set(...tok.sea);
        drawLabels();
        request();
      },
      stop() { running = false; },
    };
  }
})();
