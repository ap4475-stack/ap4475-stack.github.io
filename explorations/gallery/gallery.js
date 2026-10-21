/* Exhibit hall: splash, HTML controls, and a three.js hall loaded on demand.
   Classic script (not a module) so it runs from file://; three.js comes in through import(). */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const C = { bg: '#0b0e11', panel: '#131722', surface: '#1b2230', line: '#2a3345', text: '#f8fafc', muted: '#94a3b8', accent: '#26a69a', accent2: '#5b8cff', neg: '#ef5350' };
  const F = { head: '"Space Grotesk", Inter, sans-serif', body: 'Inter, system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };

  // Real data, same as scripts/charts.py
  const BINS = [[0.014, 9518, 0.044], [0.143, 231, 0.221], [0.238, 98, 0.286], [0.346, 44, 0.364], [0.449, 33, 0.515], [0.634, 15, 0.600], [0.752, 18, 0.722]];
  const FIRMS = [['Jump Trading', 29], ['IMC Trading', 18], ['Point72', 12], ['AQR', 12], ['Virtu Financial', 8], ['Tower Research', 8], ['DV Trading', 8], ['Qube RT', 5], ['Flow Traders', 5]];

  const EX = [
    { id: 'A', name: 'lobkit', tag: 'Research · market microstructure',
      line: 'Rebuilds Kalshi limit-order books from L2 data and models the chance that a resting order fills.',
      big: '0.0502', small: 'Brier vs 0.0539 base rate · 9,995 orders, 209 markets', prov: 'Real data · snapshot 2026-09-02', draw: drawCalib },
    { id: 'B', name: 'CallIt', tag: 'Live · team of 5',
      line: 'A private group posts a call, everyone answers once, and the group sees who called it.',
      big: 'Live', small: 'call-it.app · 300+ commits · marketing, coin and UI design', prov: 'call-it.app, captured Oct 20, 2026', draw: drawPhone },
    { id: 'C', name: 'Nudge', tag: 'AI agent',
      line: 'Chases unpaid invoices over WhatsApp and Gmail with a Claude tool-use loop, and hands off to a person when needed.',
      big: '60+', small: 'tests · ~8.3k lines TypeScript', prov: 'Cadence steps and tool names from the codebase', draw: drawCadence },
    { id: 'D', name: 'quant-roles', tag: 'Tool',
      line: 'Pulls quant roles from public job-board APIs into one list and checks each link before it ships.',
      big: '144', small: 'roles across 26 firms · Aug 28 snapshot', prov: 'Real data · Aug 28 snapshot', draw: drawFirms },
    { id: 'E', name: 'Orchestra', tag: 'Agents',
      line: 'Expensive tokens plan, cheap tokens type. Every model call is one row in a SQLite ledger.',
      big: '2', small: 'depth cap: a worker cannot recruit', prov: 'Structure from the codebase', draw: drawTiers },
    { id: 'F', name: 'Research Agent', tag: 'Data',
      line: 'Stores evidence and uncertainty before it ranks anything. Missing data never counts as negative evidence.',
      big: '485', small: 'tests in 42 files', prov: 'The four rules the codebase is built around', draw: drawRules },
  ];
  const N = EX.length;

  /* ---------------- shared state + HTML controls ---------------- */
  let cur = 0, hudShown = -1; // index the HUD shows
  let hall = null;           // set once the 3D hall is running
  const dialog = $('#dialog'), body = $('#dialog-body'), store = $('#exhibits');
  const articles = [...store.querySelectorAll('article')];

  function startIndex() {
    const p = (params.get('panel') || '').toUpperCase();
    if (/^[A-F]$/.test(p)) return p.charCodeAt(0) - 65;
    const n = parseInt(p, 10);
    return n >= 1 && n <= N ? n - 1 : 0;
  }

  // Minimap buttons A to F
  const map = $('#map');
  EX.forEach((e, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = e.id; b.setAttribute('aria-label', `Exhibit ${e.id}, ${e.name}`);
    b.addEventListener('click', () => go(i));
    li.appendChild(b); map.appendChild(li);
  });
  const mapBtns = [...map.querySelectorAll('button')];

  function setHud(i) {
    if (i === hudShown) return;
    cur = hudShown = i;
    $('#now-label').textContent = `Exhibit ${EX[i].id} of F`;
    $('#now-name').textContent = EX[i].name;
    mapBtns.forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    $('#prev').disabled = i === 0; $('#next').disabled = i === N - 1;
    $('#live').textContent = `Exhibit ${EX[i].id}, ${EX[i].name}. ${EX[i].big} ${EX[i].small}.`;
  }
  function setFill(s) { $('#map-fill').style.width = `${(s / (N - 1)) * 100}%`; }

  function go(i) {
    i = Math.max(0, Math.min(N - 1, i));
    if (hall) hall.goTo(i); else { setHud(i); setFill(i); }
  }

  // Dialog: move the real article in, so there is one copy of each exhibit in the DOM.
  let open = -1;
  function openEx(i) {
    if (open >= 0) store.appendChild(articles[open]);
    open = i;
    body.appendChild(articles[i]);
    $('#dialog-idx').textContent = `Exhibit ${EX[i].id} of F`;
    dialog.setAttribute('aria-label', `Exhibit ${EX[i].id}: ${EX[i].name}`);
    $('#dialog-prev').disabled = i === 0; $('#dialog-next').disabled = i === N - 1;
    body.scrollTop = 0; dialog.scrollTop = 0;
    if (!dialog.open) dialog.showModal();
    $('#dialog-close').focus();
  }
  dialog.addEventListener('close', () => {
    if (open >= 0) store.appendChild(articles[open]);
    open = -1;
    $('#stage').focus({ preventScroll: true });
  });
  $('#dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  $('#dialog-prev').addEventListener('click', () => { const i = Math.max(0, open - 1); go(i); openEx(i); });
  $('#dialog-next').addEventListener('click', () => { const i = Math.min(N - 1, open + 1); go(i); openEx(i); });
  $('#open').addEventListener('click', () => openEx(cur));
  $('#prev').addEventListener('click', () => go(cur - 1));
  $('#next').addEventListener('click', () => go(cur + 1));

  document.addEventListener('keydown', (e) => {
    if ($('#hall').hidden || dialog.open) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const onControl = tag === 'BUTTON' || tag === 'A';
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); go(cur + 1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); go(cur - 1); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(N - 1); }
    else if ((k === 'Enter' || k === ' ') && !onControl) { e.preventDefault(); openEx(cur); }
  });

  /* ---------------- splash and mode switching ---------------- */
  function webglOK() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  }
  const canGL = webglOK();
  if (!canGL) {
    $('#enter').disabled = true;
    $('#splash-note').innerHTML = 'This browser cannot run WebGL, so the 3D hall is off. <a href="../../index.html">The classic page</a> has the same six projects.';
  }

  function showHall() {
    $('#splash').hidden = true; $('#hall').hidden = false;
    document.title = 'Aviv Pinto · Exhibit hall';
    setHud(startIndex()); setFill(cur);
    if (!canGL) { $('#loading').hidden = true; $('#fallback').hidden = false; return; }
    if (hall) { hall.resume(); $('#stage').focus({ preventScroll: true }); return; }
    boot().catch((err) => {
      console.error(err);
      $('#loading').hidden = true; $('#fallback').hidden = false;
    });
  }
  function showSplash() {
    if (hall) hall.pause();
    $('#hall').hidden = true; $('#splash').hidden = false; $('#enter').focus();
  }
  $('#enter').addEventListener('click', () => { history.replaceState(null, '', '?mode=3d'); showHall(); });
  $('#back').addEventListener('click', () => { history.replaceState(null, '', location.pathname); showSplash(); });
  if (params.get('mode') === '3d') showHall();

  /* ---------------- panel drawing (CanvasTexture faces) ---------------- */
  function font(w, size, fam) { return `${w} ${size}px ${fam}`; }
  function track(ctx, em) { if ('letterSpacing' in ctx) ctx.letterSpacing = `${em}px`; }
  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  function layout(portrait) {
    return portrait
      ? { W: 960, H: 1536, pad: 64, top: 96, rule: 128, titleY: 252, titleS: 100, lineY: 318, lineS: 38, lineH: 52, textW: 832,
          vis: { x: 64, y: 560, w: 832, h: 560 }, bigY: 1258, bigS: 104, smallY: 1312, smallS: 28, footY: 1478 }
      : { W: 1536, H: 960, pad: 80, top: 104, rule: 136, titleY: 280, titleS: 108, lineY: 352, lineS: 34, lineH: 48, textW: 620,
          vis: { x: 790, y: 196, w: 666, h: 620 }, bigY: 712, bigS: 100, smallY: 768, smallS: 26, footY: 888 };
  }

  function drawPanel(ex, i, portrait, img) {
    const L = layout(portrait);
    const cv = document.createElement('canvas'); cv.width = L.W; cv.height = L.H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.panel; ctx.fillRect(0, 0, L.W, L.H);
    ctx.strokeStyle = C.line; ctx.lineWidth = 4; ctx.strokeRect(2, 2, L.W - 4, L.H - 4);
    ctx.textBaseline = 'alphabetic';
    // header
    track(ctx, 3); ctx.font = font(500, 24, F.mono); ctx.fillStyle = C.accent;
    ctx.fillText(`EXHIBIT ${ex.id}`, L.pad, L.top);
    const w0 = ctx.measureText(`EXHIBIT ${ex.id}`).width;
    const tagT = `  ·  ${ex.tag.toUpperCase()}`;
    ctx.fillStyle = C.muted; ctx.fillText(tagT, L.pad + w0, L.top);
    const headW = w0 + ctx.measureText(tagT).width, posT = `${ex.id} / F`;
    if (L.pad + headW + 40 < L.W - L.pad - ctx.measureText(posT).width) {
      ctx.textAlign = 'right'; ctx.fillText(posT, L.W - L.pad, L.top); ctx.textAlign = 'left';
    }
    track(ctx, 0);
    ctx.fillStyle = C.line; ctx.fillRect(L.pad, L.rule, L.W - 2 * L.pad, 2);
    // title + line
    ctx.fillStyle = C.text; ctx.font = font(600, L.titleS, F.head); track(ctx, -2);
    ctx.fillText(ex.name, L.pad, L.titleY); track(ctx, 0);
    ctx.font = font(400, L.lineS, F.body); ctx.fillStyle = '#c7d0dc';
    wrap(ctx, ex.line, L.textW).forEach((t, k) => ctx.fillText(t, L.pad, L.lineY + L.lineH * (k + 0.6)));
    // metric
    ctx.fillStyle = C.text; ctx.font = font(500, L.bigS, F.mono); track(ctx, -2);
    ctx.fillText(ex.big, L.pad, L.bigY); track(ctx, 0);
    ctx.fillStyle = C.muted; ctx.font = font(400, L.smallS, F.mono);
    wrap(ctx, ex.small, L.textW).forEach((t, k) => ctx.fillText(t, L.pad, L.smallY + k * L.smallS * 1.5));
    // visual
    ctx.save(); ex.draw(ctx, L.vis, img); ctx.restore();
    // footer
    ctx.fillStyle = C.line; ctx.fillRect(L.pad, L.footY - 44, L.W - 2 * L.pad, 2);
    track(ctx, 2); ctx.font = font(400, 22, F.mono); ctx.fillStyle = C.muted;
    ctx.fillText(ex.prov.toUpperCase(), L.pad, L.footY);
    ctx.textAlign = 'right'; ctx.fillStyle = C.accent2;
    ctx.fillText(portrait ? 'TAP TO OPEN' : 'CLICK OR ENTER TO OPEN', L.W - L.pad, L.footY); ctx.textAlign = 'left';
    track(ctx, 0);
    return cv;
  }

  function drawCalib(ctx, r) {
    const side = Math.min(r.w, r.h) - 60, top = 0.8;
    const x0 = r.x + (r.w - side) / 2 + 30, y0 = r.y + side + 4;
    const sx = (v) => x0 + (v / top) * side, sy = (v) => y0 - (v / top) * side;
    ctx.lineWidth = 2; ctx.strokeStyle = C.line; ctx.font = font(400, 20, F.mono); ctx.fillStyle = C.muted;
    for (const t of [0, 0.2, 0.4, 0.6, 0.8]) {
      ctx.beginPath(); ctx.moveTo(sx(0), sy(t)); ctx.lineTo(sx(top), sy(t)); ctx.moveTo(sx(t), sy(0)); ctx.lineTo(sx(t), sy(top)); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(t.toFixed(1), sx(t), y0 + 30);
      ctx.textAlign = 'right'; ctx.fillText(t.toFixed(1), x0 - 12, sy(t) + 7);
    }
    ctx.textAlign = 'center'; track(ctx, 2); ctx.font = font(400, 18, F.mono);
    ctx.fillText('PREDICTED FILL PROBABILITY', sx(top / 2), y0 + 58); track(ctx, 0);
    ctx.save(); ctx.translate(x0 - 66, sy(top / 2)); ctx.rotate(-Math.PI / 2); track(ctx, 2);
    ctx.fillText('OBSERVED', 0, 0); ctx.restore(); track(ctx, 0);
    // y = x
    ctx.setLineDash([12, 12]); ctx.strokeStyle = C.muted; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(top), sy(top)); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'left'; ctx.font = font(400, 22, F.mono); ctx.fillStyle = C.muted;
    ctx.fillText('y = x', sx(0.5), sy(0.4));
    // curve + points
    ctx.strokeStyle = C.accent; ctx.lineWidth = 4; ctx.beginPath();
    BINS.forEach(([p, , o], k) => (k ? ctx.lineTo(sx(p), sy(o)) : ctx.moveTo(sx(p), sy(o)))); ctx.stroke();
    for (const [p, n, o] of BINS) {
      const rad = (3 + 1.6 * Math.log10(n)) * 1.9;
      ctx.beginPath(); ctx.arc(sx(p), sy(o), rad, 0, Math.PI * 2);
      ctx.fillStyle = C.accent; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.panel; ctx.stroke();
    }
    ctx.fillStyle = C.muted; ctx.font = font(400, 20, F.mono);
    ctx.fillText('n = 9,518', sx(0.014) + 28, sy(0.01));
  }

  function drawPhone(ctx, r, img) {
    const h = r.h, w = h / 2, x = r.x + (r.w - w) / 2, y = r.y;
    rr(ctx, x, y, w, h, 44); ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = C.line; ctx.stroke();
    const ix = x + 12, iy = y + 12, iw = w - 24, ih = h - 24;
    ctx.save(); rr(ctx, ix, iy, iw, ih, 34); ctx.clip();
    if (img) ctx.drawImage(img, ix, iy, iw, ih);
    else {
      ctx.fillStyle = C.surface; ctx.fillRect(ix, iy, iw, ih);
      ctx.fillStyle = C.text; ctx.textAlign = 'center'; ctx.font = font(500, 26, F.mono);
      ctx.fillText('call-it.app', ix + iw / 2, iy + ih / 2 - 12);
      ctx.fillStyle = C.muted; ctx.font = font(400, 18, F.mono);
      ctx.fillText('capture opens in', ix + iw / 2, iy + ih / 2 + 24);
      ctx.fillText('the full exhibit', ix + iw / 2, iy + ih / 2 + 50);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function drawCadence(ctx, r) {
    const steps = [['−3d', 'heads-up'], ['0', 'due'], ['+3', ''], ['+7', ''], ['+14', ''], ['+30', ''], ['→', 'human']];
    track(ctx, 2); ctx.font = font(500, 20, F.mono); ctx.fillStyle = C.accent; ctx.fillText('REMINDER CADENCE', r.x, r.y + 20); track(ctx, 0);
    const ly = r.y + 150, x0 = r.x + 30, x1 = r.x + r.w - 30, dx = (x1 - x0) / (steps.length - 1);
    ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(x1, ly); ctx.stroke();
    steps.forEach(([a, b], k) => {
      const x = x0 + dx * k, esc = k === steps.length - 1;
      ctx.beginPath(); ctx.arc(x, ly, 13, 0, Math.PI * 2); ctx.fillStyle = esc ? C.accent2 : C.accent; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = C.panel; ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = C.text; ctx.font = font(500, 28, F.mono); ctx.fillText(a, x, ly - 36);
      if (b) { ctx.fillStyle = C.muted; ctx.font = font(400, 19, F.mono); ctx.fillText(b, x, ly + 48); }
    });
    ctx.textAlign = 'left';
    track(ctx, 2); ctx.font = font(500, 20, F.mono); ctx.fillStyle = C.accent; ctx.fillText('TOOL CALLS', r.x, r.y + 290); track(ctx, 0);
    const chips = ['record_promise_to_pay', 'flag_dispute', 'escalate_to_human'];
    chips.forEach((t, k) => {
      const y = r.y + 320 + k * 92; ctx.font = font(500, 28, F.mono);
      const w = ctx.measureText(t).width + 44;
      rr(ctx, r.x, y, w, 64, 10); ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.line; ctx.stroke();
      ctx.fillStyle = C.accent; ctx.fillText(t, r.x + 22, y + 42);
    });
  }

  function drawFirms(ctx, r) {
    track(ctx, 2); ctx.font = font(500, 20, F.mono); ctx.fillStyle = C.accent;
    ctx.fillText('ROLES PER FIRM, TOP 9 OF 26 (TIE AT 5)', r.x, r.y + 20); track(ctx, 0);
    const label = Math.min(250, r.w * 0.38), row = (r.h - 60) / FIRMS.length, mx = FIRMS[0][1];
    const bwMax = r.w - label - 70;
    FIRMS.forEach(([name, c], k) => {
      const y = r.y + 60 + k * row, bw = (bwMax * c) / mx, bh = Math.min(34, row * 0.55);
      ctx.font = font(400, 22, F.mono); ctx.fillStyle = C.muted; ctx.textAlign = 'right';
      ctx.fillText(name, r.x + label - 16, y + bh / 2 + 8);
      ctx.textAlign = 'left'; rr(ctx, r.x + label, y, bw, bh, 5); ctx.fillStyle = C.accent; ctx.fill();
      ctx.fillStyle = C.text; ctx.font = font(500, 24, F.mono); ctx.fillText(String(c), r.x + label + bw + 14, y + bh / 2 + 9);
    });
  }

  function drawTiers(ctx, r) {
    const tiers = [['Conductor', 'frontier model · cuts tickets'], ['Dept head', 'mid model · writes the brief'], ['Worker', 'local or cloud model · does the work'], ['Reviewer', 'mid model · accepts, retries, escalates']];
    const gap = 16, bh = (r.h - 90 - gap * 3) / 4;
    tiers.forEach(([a, b], k) => {
      const y = r.y + k * (bh + gap), cheap = k === 2;
      rr(ctx, r.x, y, r.w, bh, 12); ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = cheap ? 4 : 2; ctx.strokeStyle = cheap ? C.accent : C.line; ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = font(600, 36, F.head); ctx.fillText(a, r.x + 28, y + bh / 2 - 4);
      ctx.fillStyle = C.muted; ctx.font = font(400, 21, F.mono); ctx.fillText(b, r.x + 28, y + bh / 2 + 32);
    });
    ctx.font = font(500, 22, F.mono); ctx.fillStyle = C.accent; ctx.fillText('ledger', r.x, r.y + r.h - 20);
    const lw = ctx.measureText('ledger ').width; ctx.fillStyle = C.muted; ctx.font = font(400, 22, F.mono);
    ctx.fillText(' one SQLite row per model call', r.x + lw, r.y + r.h - 20);
  }

  function drawRules(ctx, r) {
    rr(ctx, r.x, r.y, r.w, r.h - 20, 14); ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.line; ctx.stroke();
    const size = Math.min(34, (r.w - 72) / 25);
    ctx.font = font(400, size, F.mono);
    const lh = size * 2.1; let y = r.y + 70 + size;
    ctx.fillStyle = C.muted; ctx.fillText('# evidence first. rank second.', r.x + 36, y); y += lh * 1.3;
    for (const [a, b] of [['UNKNOWN       ', 'LOW'], ['LOW VISIBILITY', 'LOW RELEVANCE'], ['CONFLICTING   ', 'FALSE'], ['STALE         ', 'FALSE']]) {
      let x = r.x + 36; ctx.fillStyle = C.text; ctx.fillText(a, x, y); x += ctx.measureText(a + ' ').width;
      ctx.fillStyle = C.accent; ctx.fillText('!=', x, y); x += ctx.measureText('!= ').width;
      ctx.fillStyle = C.text; ctx.fillText(b, x, y); y += lh;
    }
  }

  function floorLabel(text, w, h, size, color) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); ctx.font = font(500, size, F.mono); ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; track(ctx, 4); ctx.fillText(text, w / 2, h / 2);
    return cv;
  }

  function loadImage(src) {
    return new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
    });
  }
  // file:// taints canvases that draw local images; WebGL then refuses the upload. Detect and skip.
  function usable(img) {
    if (!img) return null;
    try { const c = document.createElement('canvas'); c.width = c.height = 2; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 2, 2); x.getImageData(0, 0, 1, 1); return img; }
    catch (e) { return null; }
  }

  /* ---------------- the 3D hall ---------------- */
  async function boot() {
    const THREE = await import('three');
    const fontsReady = Promise.all([
      document.fonts.load(font(600, 100, F.head)), document.fonts.load(font(400, 34, F.body)),
      document.fonts.load(font(400, 22, F.mono)), document.fonts.load(font(500, 22, F.mono)),
    ]).catch(() => {});
    await Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]);
    const phoneImg = usable(await loadImage(window.CALLIT_PANEL_IMG || '../../assets/img/callit-live.jpg'));

    const canvas = $('#gl'), stage = $('#stage');
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { throw new Error('WebGL context failed'); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    scene.fog = new THREE.Fog(C.bg, 9, 34);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);

    // Floor grid
    const gv = [];
    // short segments, so lines that pass behind the camera clip cleanly on every GPU
    for (let x = -40; x <= 40; x += 2) for (let z = 24; z > -84; z -= 2) gv.push(x, 0, z, x, 0, z - 2);
    for (let z = -84; z <= 24; z += 2) for (let x = -40; x < 40; x += 2) gv.push(x, 0, z, x + 2, 0, z);
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gv, 3));
    scene.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: 0x1f2736 })));

    // The path: a gentle S along -z. Panels hang alternately left and right of it.
    const pts = [];
    for (let k = 0; k <= 9; k++) pts.push(new THREE.Vector3(Math.sin(k * 0.75) * 2.6, 0, 6 - k * 6.2));
    const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal');

    // y = x motif: the dashed line on the floor that guides the walk
    const dashGeo = new THREE.BufferGeometry().setFromPoints(path.getSpacedPoints(600).map((p) => p.setY(0.012)));
    const dash = new THREE.Line(dashGeo, new THREE.LineDashedMaterial({ color: C.accent, dashSize: 0.32, gapSize: 0.26 }));
    dash.computeLineDistances(); scene.add(dash);

    const startTex = new THREE.CanvasTexture(floorLabel('y = x', 512, 128, 64, C.muted));
    startTex.colorSpace = THREE.SRGBColorSpace; startTex.anisotropy = maxAniso;
    const startLbl = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), new THREE.MeshBasicMaterial({ map: startTex, transparent: true }));
    startLbl.rotation.x = -Math.PI / 2; scene.add(startLbl);

    const up = new THREE.Vector3(0, 1, 0);
    const panels = [], meshes = [];
    const wireMat = new THREE.LineBasicMaterial({ color: 0x3a4558 });
    const frameMat = new THREE.MeshBasicMaterial({ color: C.surface });

    function frameAt(i) {
      const u = (i + 1) / (N + 1.6);
      const p = path.getPointAt(u), t = path.getTangentAt(u).setY(0).normalize();
      const n = new THREE.Vector3().crossVectors(up, t).normalize(); // points to the walker's left
      return { p, t, n, side: i % 2 ? -1 : 1 };
    }
    EX.forEach((ex, i) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      face.userData.i = i;
      const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), frameMat);
      back.position.z = -0.02; back.rotation.y = Math.PI;
      const wires = new THREE.LineSegments(new THREE.BufferGeometry(), wireMat);
      const lblTex = new THREE.CanvasTexture(floorLabel(`${ex.id} · ${ex.name.toUpperCase()}`, 1024, 128, 56, C.muted));
      lblTex.colorSpace = THREE.SRGBColorSpace; lblTex.anisotropy = maxAniso;
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.4), new THREE.MeshBasicMaterial({ map: lblTex, transparent: true, depthWrite: false }));
      lbl.rotation.x = -Math.PI / 2;
      g.add(face, back, wires); scene.add(g); scene.add(lbl);
      panels.push({ g, face, back, wires, mat, lbl, center: new THREE.Vector3(), stop: new THREE.Vector3() });
      meshes.push(face);
    });

    let portrait = null, stopsCurve = null;
    function build() {
      const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const nowPortrait = camera.aspect < 0.8;
      const PW = nowPortrait ? 2.0 : 3.2, PH = nowPortrait ? 3.2 : 2.0;
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * camera.aspect;
      // The HUD covers the bottom strip, so frame the panel slightly high and with margin.
      const fit = Math.max((PW / 2) * 1.1 / tanH, (PH / 2) * 1.32 / tanV);
      const dist = fit * (nowPortrait ? 1.04 : 1.42);
      const stops = [];
      panels.forEach((P, i) => {
        const { p, t, n, side } = frameAt(i);
        const off = nowPortrait ? 1.0 : 1.9;
        P.center.copy(p).addScaledVector(n, side * off).setY(PH / 2 + 0.75);
        const inward = n.clone().multiplyScalar(-side);
        const facing = t.clone().multiplyScalar(-1).multiplyScalar(nowPortrait ? 0.92 : 0.8).addScaledVector(inward, nowPortrait ? 0.38 : 0.6).normalize();
        P.g.position.copy(P.center); P.g.lookAt(P.center.clone().add(facing));
        P.face.scale.set(PW, PH, 1); P.back.scale.set(PW + 0.08, PH + 0.08, 1);
        const top = PH / 2, hx = PW * 0.42;
        P.wires.geometry.setFromPoints([new THREE.Vector3(-hx, top, 0), new THREE.Vector3(-hx, 12, 0), new THREE.Vector3(hx, top, 0), new THREE.Vector3(hx, 12, 0)]);
        // floor label in front of the panel, readable from the stop
        P.lbl.position.copy(P.center).addScaledVector(facing, 1.1).setY(0.02);
        P.lbl.rotation.set(-Math.PI / 2, 0, 0); P.lbl.rotateOnWorldAxis(up, Math.atan2(facing.x, facing.z));
        P.stop.copy(P.center).addScaledVector(facing, dist).setY(P.center.y + (nowPortrait ? 0.25 : 0.55));
        stops.push(P.stop.clone());
      });
      // approach point before A, so the first move has somewhere to come from
      startLbl.position.copy(path.getPointAt(0.085)).setY(0.02);
      startLbl.rotation.set(-Math.PI / 2, 0, 0); startLbl.rotateOnWorldAxis(up, Math.atan2(pts[0].x - pts[1].x, pts[0].z - pts[1].z));
      stopsCurve = new THREE.CatmullRomCurve3(stops, false, 'centripetal');
      if (nowPortrait !== portrait) {
        portrait = nowPortrait;
        panels.forEach((P, i) => {
          const tex = new THREE.CanvasTexture(drawPanel(EX[i], i, portrait, phoneImg));
          tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
          if (P.mat.map) P.mat.map.dispose();
          P.mat.map = tex; P.mat.needsUpdate = true;
        });
        $('#hint').textContent = portrait ? 'Swipe up or down · tap to open' : 'Drag, scroll or use ← → · Enter opens';
      }
    }

    // Motion state: s is a continuous position along the exhibits, 0 to N-1.
    let s = cur, target = cur, last = 0, raf = 0, running = true, dragging = false;
    const look = new THREE.Vector3(), pos = new THREE.Vector3();
    const ease = (x) => x * x * (3 - 2 * x);
    function place() {
      const sc = Math.max(0, Math.min(N - 1, s));
      stopsCurve.getPoint(sc / (N - 1), pos);
      const i0 = Math.min(N - 2, Math.floor(sc)), f = ease(sc - i0);
      look.lerpVectors(panels[i0].center, panels[i0 + 1].center, f);
      camera.position.copy(pos); camera.lookAt(look);
    }
    function frame(now) {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      if (reduceMQ.matches && !dragging) s = target;
      else s += (target - s) * (1 - Math.exp(-dt * 5.5));
      if (Math.abs(target - s) < 0.0008) s = target;
      place(); renderer.render(scene, camera);
      setFill(Math.max(0, Math.min(N - 1, s)));
      setHud(Math.round(Math.max(0, Math.min(N - 1, dragging ? s : target))));
      if ((s !== target || dragging) && running) raf = requestAnimationFrame(frame); else last = 0;
    }
    function kick() { if (!raf && running && !document.hidden) raf = requestAnimationFrame(frame); }

    // Inputs
    let snapT = 0;
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      target = Math.max(0, Math.min(N - 1, target + d * 0.0022));
      clearTimeout(snapT); snapT = setTimeout(() => { target = Math.round(target); kick(); }, 160);
      kick();
    }, { passive: false });

    let downX = 0, downY = 0, downT = 0, startTarget = 0, moved = false, vel = 0, lastMove = 0, lastVal = 0;
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      stage.setPointerCapture(e.pointerId); dragging = true; moved = false;
      downX = e.clientX; downY = e.clientY; downT = performance.now(); startTarget = target; vel = 0; lastMove = downT; lastVal = target;
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.hypot(dx, dy) > 6) moved = true;
      if (!moved) return;
      const span = portrait ? stage.clientHeight * 0.45 : stage.clientWidth * 0.4;
      const d = portrait ? -dy : -dx;
      target = Math.max(0, Math.min(N - 1, startTarget + d / span));
      const now = performance.now(); if (now > lastMove) { vel = (target - lastVal) / (now - lastMove); lastMove = now; lastVal = target; }
      kick();
    });
    const end = (e) => {
      if (!dragging) return; dragging = false;
      if (!moved) { pick(e); return; }
      const fling = Math.max(-0.6, Math.min(0.6, vel * 180));
      target = Math.max(0, Math.min(N - 1, Math.round(target + fling)));
      kick();
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', (e) => { dragging = false; target = Math.round(target); kick(); });

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(e) {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      if (!hit) return;
      const i = hit.object.userData.i;
      if (i === Math.round(s)) openEx(i); else hall.goTo(i);
    }
    stage.addEventListener('pointermove', (e) => {
      if (dragging || e.pointerType !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      stage.style.cursor = ray.intersectObjects(meshes, false).length ? 'pointer' : '';
    });

    let rT = 0;
    addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { build(); place(); renderer.render(scene, camera); }, 120); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; } else kick();
    });

    hall = {
      goTo(i) { target = Math.max(0, Math.min(N - 1, i)); setHud(target); kick(); },
      pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
      resume() { running = true; build(); place(); renderer.render(scene, camera); },
    };

    build(); place(); renderer.render(scene, camera);
    $('#loading').hidden = true;
    stage.focus({ preventScroll: true });
    if (params.get('open')) openEx(cur);
  }
})();
