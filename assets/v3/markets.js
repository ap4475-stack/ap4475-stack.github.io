/* v3 markets lane (@markets): draws the instruments for sites 01 to 04.
   Real charts read the inline JSON in partials/v3-markets.html (fetch() fails on file://).
   Charts plot in like a pen plotter when they enter view; with reduced motion they render drawn. */
(() => {
  const read = (id) => { try { return JSON.parse(document.getElementById(id).textContent); } catch (e) { return null; } };
  const K = read('mk-data-kalshi');
  const S = read('mk-data-statarb');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let uid = 0;

  const r1 = (v) => Math.round(v * 10) / 10;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const lin = (d0, d1, a, b) => (v) => a + ((v - d0) / (d1 - d0)) * (b - a);
  const pathD = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + r1(p[0]) + ',' + r1(p[1])).join(' ');
  const t = (x, y, s, cls, extra) => `<text x="${r1(x)}" y="${r1(y)}" class="${cls || 'mk-t'}"${extra || ''}>${esc(s)}</text>`;
  const ln = (x1, y1, x2, y2, cls) => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" class="${cls}"/>`;
  // An animated stroke: pathLength=1 lets CSS draw it with stroke-dashoffset.
  const ink = (d, cls, delay) => `<path d="${d}" pathLength="1" class="mk-ink ${cls}"${delay ? ` style="--mk-d:${delay}s"` : ''}/>`;
  const svg = (W, H, label, body) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">${body}</svg>`;
  const minus = (v, d) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d);

  /* Fig 1a: lobkit reliability diagram (real). Bins are [predicted, orders, observed]. */
  function calib(W) {
    if (!K) return null;
    const H = Math.round(Math.min(330, Math.max(250, W * 0.6)));
    const m = { l: 44, r: 14, t: 12, b: 40 };
    const x = lin(0, 0.8, m.l, W - m.r), y = lin(0, 0.8, H - m.b, m.t);
    let g = '';
    [0, 0.2, 0.4, 0.6, 0.8].forEach((v) => {
      g += ln(x(v), m.t, x(v), H - m.b, 'mk-grid') + ln(m.l, y(v), W - m.r, y(v), 'mk-grid');
      g += t(x(v), H - m.b + 15, v.toFixed(1), 'mk-tick', ' text-anchor="middle"');
      g += t(m.l - 6, y(v) + 4, v.toFixed(1), 'mk-tick', ' text-anchor="end"');
    });
    g += t((m.l + W - m.r) / 2, H - 6, 'predicted fill probability', 'mk-axt', ' text-anchor="middle"');
    g += t(12, (m.t + H - m.b) / 2, 'observed fill rate', 'mk-axt', ` text-anchor="middle" transform="rotate(-90 12 ${r1((m.t + H - m.b) / 2)})"`);
    g += ln(x(0), y(0), x(0.8), y(0.8), 'mk-diag');
    g += t(x(0.56) + 4, y(0.5) + 4, 'y = x', 'mk-tick');
    const bins = K.calibration_bins.map(([p, n, o]) => ({ p, n, o }));
    g += ink(pathD(bins.map((b) => [x(b.p), y(b.o)])), 'mk-sea mk-w2', 0);
    // Worst gap among bins with at least 25 orders (lobkit's reporting rule).
    let worst = null;
    bins.forEach((b) => { if (b.n >= 25 && (!worst || Math.abs(b.o - b.p) > Math.abs(worst.o - worst.p))) worst = b; });
    if (worst) {
      g += ink(pathD([[x(worst.p), y(worst.p)], [x(worst.p), y(worst.o)]]), 'mk-warn mk-w2', 1.2);
      g += t(x(worst.p) + 8, (y(worst.p) + y(worst.o)) / 2 + 4, 'gap ' + K.calibration.worst_gap.toFixed(3), 'mk-tick mk-fill-warn mk-fade');
    }
    bins.forEach((b, i) => {
      const r = 2.5 + 1.6 * Math.log10(b.n);
      g += `<circle cx="${r1(x(b.p))}" cy="${r1(y(b.o))}" r="${r1(r)}" class="mk-dot mk-fade" style="--mk-d2:${(0.4 + i * 0.12).toFixed(2)}s"/>`;
    });
    g += t(x(bins[0].p) + 18, y(bins[0].o) + 4, 'n = ' + bins[0].n.toLocaleString('en-US'), 'mk-tick mk-fade');
    const c = K.calibration;
    g += t(m.l + 8, m.t + 16, `Brier ${c.brier} vs ${c.brier_base} base`, 'mk-t mk-fade');
    g += t(m.l + 8, m.t + 32, `${c.orders.toLocaleString('en-US')} orders · ${c.markets} markets`, 'mk-tick mk-fade');
    return svg(W, H, `Reliability diagram, real data: seven bins of predicted versus observed fill rate. Brier ${c.brier} vs ${c.brier_base} base rate; worst gap ${c.worst_gap}.`, g);
  }

  /* Fig 1b: horizon verdict strip (real). */
  function horizon(W) {
    if (!K) return null;
    const hs = K.horizons, gap = 10;
    const cw = (W - gap * (hs.length - 1)) / hs.length;
    const tight = cw < 150, H = tight ? 172 : 150, dy = tight ? 14 : 0;
    const maxP = Math.max(...hs.map((h) => h.prints));
    let g = '';
    hs.forEach((h, i) => {
      const x0 = i * (cw + gap), pad = 12;
      g += `<rect x="${r1(x0 + 0.5)}" y="0.5" width="${r1(cw - 1)}" height="${H - 1}" rx="2" class="mk-cell"/>`;
      g += t(x0 + pad, 22, h.horizon_min + ' min', 'mk-hk');
      g += t(x0 + pad, 62, String(h.survivors), 'mk-big mk-fill-warn');
      g += t(x0 + pad, 80, tight ? 'surviving' : 'surviving edges', 'mk-tick');
      if (tight) g += t(x0 + pad, 94, 'edges', 'mk-tick');
      const bw = (cw - pad * 2) * (h.prints / maxP);
      g += ln(x0 + pad, 98 + dy, x0 + cw - pad, 98 + dy, 'mk-track');
      g += ink(pathD([[x0 + pad, 98 + dy], [x0 + pad + bw, 98 + dy]]), 'mk-sea mk-w4', 0.2 + i * 0.25);
      g += t(x0 + pad, 116 + dy, (h.prints / 1e6).toFixed(1) + 'M prints', 'mk-tick');
      const v = h.verdict === 'EFFICIENT_WITHIN_TOLL' ? ['efficient', 'within toll'] : [h.verdict.toLowerCase().replace(/_/g, ' ')];
      if (tight) v.forEach((l, j) => { g += t(x0 + pad, 137 + dy + j * 14, l, 'mk-verdict'); });
      else g += t(x0 + pad, 137, v.join(' '), 'mk-verdict');
    });
    const label = 'Horizon verdicts, real data: ' + hs.map((h) => `${h.horizon_min} minutes, ${h.prints.toLocaleString('en-US')} prints, ${h.survivors} surviving edges, ${h.verdict}`).join('; ') + `; ${hs[0].expiries} expiries.`;
    return svg(W, H, label, g);
  }

  /* Fig 2: cumulative return, two eras on one y-scale (real). */
  function statarb(W) {
    if (!S) return null;
    const mi = (s) => { const [yy, mm] = s.split('-').map(Number); return (yy - 1992) * 12 + (mm - 12); };
    const narrow = W < 500;
    const H = narrow ? 300 : 310;
    const m = { l: 30, r: 46, t: narrow ? 48 : 34, b: 28 };
    const all = S.series['P-only'];
    const xMax = mi(all[all.length - 1][0]);
    const brk = mi(all.find((p) => p[2] !== '1992-2015')[0]) - 0.5;
    const x = lin(0, xMax, m.l, W - m.r), y = lin(-2, 22, H - m.b, m.t);
    let g = `<rect x="${r1(x(brk))}" y="${m.t}" width="${r1(W - m.r - x(brk))}" height="${H - m.b - m.t}" class="mk-shade"/>`;
    [5, 10, 15, 20].forEach((v) => {
      g += ln(m.l, y(v), W - m.r, y(v), 'mk-grid') + t(m.l - 5, y(v) + 4, String(v), 'mk-tick', ' text-anchor="end"');
    });
    g += ln(m.l, y(0), W - m.r, y(0), 'mk-zero') + t(m.l - 5, y(0) + 4, '0', 'mk-tick', ' text-anchor="end"');
    for (let yr = 1995; yr <= 2025; yr += narrow ? 10 : 5) {
      const xv = x(mi(yr + '-01'));
      g += ln(xv, H - m.b, xv, H - m.b + 4, 'mk-axis') + t(xv, H - m.b + 17, String(yr), 'mk-tick', ' text-anchor="middle"');
    }
    g += ln(x(brk), m.t - 4, x(brk), H - m.b, 'mk-break');
    // Era headers above the plot.
    if (narrow) {
      g += t(m.l, 14, '1992 to 2015 · CRSP', 'mk-hk');
      g += t(W - m.r, 32, '2015 to 2025 · restarts at 0', 'mk-hk', ' text-anchor="end"');
    } else {
      g += t(m.l, 18, '1992 to 2015 · CRSP', 'mk-hk');
      g += t(W - m.r, 18, '2015 to 2025 extension · restarts at 0', 'mk-hk', ' text-anchor="end"');
    }
    const schemes = [['P-gate(0.05)', 'mk-rust'], ['P-only', 'mk-sea']];
    schemes.forEach(([k, cls], si) => {
      const s = S.series[k];
      ['1992-2015', '2015-2025'].forEach((era, ei) => {
        const pts = s.filter((p) => p[2] === era);
        g += ink(pathD(pts.map((p) => [x(mi(p[0])), y(p[1])])), cls + ' mk-w2', ei * 1.4 + si * 0.15);
        const last = pts[pts.length - 1];
        const lx = x(mi(last[0])), ly = y(last[1]);
        const neg = last[1] < 0 ? ' mk-fill-warn' : '';
        if (ei === 0) g += t(lx - 4, ly - 7, last[1].toFixed(1), 'mk-tick mk-fade' + neg, ' text-anchor="end"');
        else g += t(lx + 5, ly + 4, minus(last[1], 2), 'mk-tick mk-fade' + neg);
      });
    });
    // Legend, top left of the plot, where the curves have not risen yet.
    const lx = m.l + 10, ly = m.t + 14;
    schemes.forEach(([k, cls], i) => {
      g += ln(lx, ly + i * 16 - 4, lx + 18, ly + i * 16 - 4, 'mk-key-ln ' + cls) + t(lx + 24, ly + i * 16, k, 'mk-tick');
    });
    const sum = S.summary;
    const label = 'Cumulative sum of daily returns, real data, ENS1, 5 bps. 1992 to 2015: P-gate(0.05) ends at 21.13, P-only at 16.08. 2015 to 2025, restarted at 0 on the same scale: P-gate(0.05) ends at 2.55, P-only at minus 1.07. ' +
      sum.map((r) => `${r.scheme} ${r.era}: Sharpe ${r.sharpe.toFixed(2)} over ${r.trading_days} days`).join('; ') + '.';
    return svg(W, H, label, g);
  }

  /* Fig 3: illustrative Monte Carlo fan with a redemption step (seeded, not model output). */
  function mulberry32(a) {
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let z = Math.imul(a ^ (a >>> 15), 1 | a); z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z; return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
  }
  function cone(W) {
    const H = 250, m = { l: 18, r: 18, t: 24, b: 28 };
    const rnd = mulberry32(20260421);
    const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const N = 34, T = 72, vote = 22;
    const paths = [];
    for (let i = 0; i < N; i++) {
      let s = 1; const p = [s];
      const redeem = 0.2 + 0.75 * rnd(); // illustrative redemption rate
      for (let k = 1; k <= T; k++) {
        const vol = k > vote ? 0.026 : 0.016;
        s *= Math.exp(vol * gauss() - 0.5 * vol * vol);
        if (k === vote) s *= 1 - 0.22 * redeem * (0.6 + 0.8 * rnd()); // dilution step at the vote
        p.push(s);
      }
      paths.push(p);
    }
    const q = (arr, f) => { const a = [...arr].sort((u, v) => u - v); return a[Math.min(a.length - 1, Math.floor(f * a.length))]; };
    const lo = [], hi = [], med = [];
    for (let k = 0; k <= T; k++) { const col = paths.map((p) => p[k]); lo.push(q(col, 0.1)); hi.push(q(col, 0.9)); med.push(q(col, 0.5)); }
    const yMin = Math.min(...lo) * 0.85, yMax = Math.max(...hi) * 1.12;
    const x = lin(0, T, m.l, W - m.r), y = lin(yMin, yMax, H - m.b, m.t);
    const id = 'mk-clip-' + (++uid);
    let g = `<defs><clipPath id="${id}"><rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"/></clipPath></defs>`;
    g += ln(m.l, H - m.b, W - m.r, H - m.b, 'mk-axis') + ln(m.l, m.t, m.l, H - m.b, 'mk-axis');
    const band = hi.map((v, k) => [x(k), y(v)]).concat(lo.map((v, k) => [x(k), y(v)]).reverse());
    g += `<g clip-path="url(#${id})"><path d="${pathD(band)} Z" class="mk-band mk-fade" style="--mk-d2:1.4s"/>`;
    paths.forEach((p, i) => { g += ink(pathD(p.map((v, k) => [x(k), y(v)])), 'mk-path', (i % 11) * 0.06); });
    g += ink(pathD(med.map((v, k) => [x(k), y(v)])), 'mk-rust mk-w2', 0.9) + '</g>';
    const ks = 1.12;
    g += ln(m.l, y(ks), W - m.r, y(ks), 'mk-ref mk-fade') + t(W - m.r - 2, y(ks) - 6, 'strike', 'mk-tick mk-fade', ' text-anchor="end"');
    g += ln(x(vote), m.t - 6, x(vote), H - m.b, 'mk-ref mk-fade') + t(x(vote) + 6, m.t + 2, 'redemption vote', 'mk-tick mk-fade');
    g += `<circle cx="${r1(x(0))}" cy="${r1(y(1))}" r="3.5" class="mk-dot-rust"/>`;
    g += t(m.l + 4, H - 8, 'time →', 'mk-axt') + t(W - m.r, H - 8, 'band: 10th to 90th percentile · line: median', 'mk-tick', ' text-anchor="end"');
    g += t(m.l + 6, m.t - 8, 'stock price', 'mk-axt');
    return svg(W, H, 'Illustrative Monte Carlo fan, not model output: seeded random stock paths that widen over time and step down at a redemption vote, with a strike line, a 10th to 90th percentile band and the median.', g);
  }

  /* Fig 4: pipeline diagram plus an illustrative per-order state machine. */
  function pipeline(W) {
    const id = 'mk-ah-' + (++uid);
    const arrow = (d, delay, both) => `<path d="${d}" pathLength="1" class="mk-ink mk-edge" marker-end="url(#${id})"${both ? ` marker-start="url(#${id})"` : ''} style="--mk-d:${delay}s"/>`;
    const box = (x, y, w, h, lines, cls, bold) => {
      let s = `<rect x="${r1(x + 0.5)}" y="${r1(y + 0.5)}" width="${r1(w - 1)}" height="${r1(h - 1)}" rx="3" class="${cls || 'mk-box'}"/>`;
      const lh = 14, y0 = y + h / 2 - ((lines.length - 1) * lh) / 2 + 4;
      lines.forEach((l, i) => { s += t(x + w / 2, y0 + i * lh, l, i === 0 || bold ? 'mk-bt' : 'mk-tick', ' text-anchor="middle"'); });
      return s;
    };
    let g = `<defs><marker id="${id}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0.5 L8,4 L0,7.5 z" class="mk-ahead"/></marker></defs>`;
    let top;
    if (W >= 500) {
      const exW = Math.round(W * 0.2), c2 = Math.round(W * 0.43), bkW = Math.round(W * 0.26), bbX = c2 + bkW + Math.round(W * 0.05);
      g += box(0, 10, exW, 150, ['Simulated', 'exchange'], 'mk-box', true);
      g += box(c2, 10, W - c2, 52, ['Order manager', 'finite-state machine'], 'mk-box mk-box-hi');
      g += box(c2, 108, bkW, 52, ['Order book', 'reconstruction']);
      g += box(bbX, 108, W - bbX, 52, ['BBO peg', 'best bid and offer']);
      g += arrow(`M${exW + 2},36 H${c2 - 2}`, 0.1, true) + t((exW + c2) / 2, 28, 'TCP order entry', 'mk-tick', ' text-anchor="middle"');
      g += arrow(`M${exW + 2},134 H${c2 - 2}`, 0.3) + t((exW + c2) / 2, 126, 'UDP L2 data', 'mk-tick', ' text-anchor="middle"');
      g += arrow(`M${c2 + bkW + 1},134 H${bbX - 2}`, 0.6);
      const bc = Math.round(bbX + (W - bbX) / 2);
      g += arrow(`M${bc},107 V64`, 0.9) + t(bc + 6, 90, 'reprice', 'mk-tick');
      top = 182;
    } else {
      const cw = Math.round((W - 16) / 2), rx = cw + 16;
      g += box(0, 6, W, 40, ['Simulated exchange']);
      g += arrow('M18,48 V98', 0.1, true) + t(26, 77, 'TCP order entry', 'mk-tick');
      g += arrow(`M${rx + 18},48 V98`, 0.3) + t(rx + 26, 77, 'UDP L2 data', 'mk-tick');
      g += box(0, 100, cw, 48, ['Order manager', 'FSM'], 'mk-box mk-box-hi');
      g += box(rx, 100, cw, 48, ['Order book', 'reconstruction']);
      g += arrow(`M${rx + 18},150 V176`, 0.6);
      g += box(rx, 178, cw, 40, ['BBO peg']);
      g += arrow(`M${rx - 1},198 H${Math.round(cw / 2)} V150`, 0.9) + t((rx + cw / 2) / 2 + 8, 192, 'reprice', 'mk-tick', ' text-anchor="middle"');
      top = 240;
    }
    // Illustrative state machine.
    const sy = top + 66, bh = 32, bw = Math.min(100, Math.floor((W - 60) / 4));
    const gx = (W - 4 * bw) / 3, sx = (i) => i * (bw + gx);
    g += ln(0, top, W, top, 'mk-grid');
    g += t(0, top + 20, 'Per-order states', 'mk-hk');
    const tagW = 104, tagX = 128;
    g += `<rect x="${tagX + 0.5}" y="${top + 7.5}" width="${tagW - 1}" height="18" rx="3" class="mk-illus"/>` + t(tagX + tagW / 2, top + 20, 'ILLUSTRATIVE', 'mk-illus-t', ' text-anchor="middle"');
    ['NEW', 'ACK', 'PARTIAL', 'FILLED'].forEach((s, i) => { g += box(sx(i), sy, bw, bh, [s], i === 3 ? 'mk-box mk-box-hi' : 'mk-box'); });
    for (let i = 0; i < 3; i++) g += arrow(`M${r1(sx(i) + bw + 1)},${sy + bh / 2} H${r1(sx(i + 1) - 2)}`, 1.1 + i * 0.2);
    // ACK straight to FILLED, arcing over PARTIAL.
    const a1 = sx(1) + bw / 2, a3 = sx(3) + bw / 2;
    g += arrow(`M${r1(a1)},${sy - 1} C${r1(a1)},${sy - 34} ${r1(a3)},${sy - 34} ${r1(a3)},${sy - 3}`, 1.7) + t((a1 + a3) / 2, sy - 9, 'full fill', 'mk-tick', ' text-anchor="middle"');
    const cy = sy + bh + 44, cwid = Math.max(bw, 92), cxm = (sx(1) + sx(2) + bw) / 2;
    g += box(cxm - cwid / 2, cy, cwid, bh, ['CANCELED'], 'mk-box mk-box-warn');
    g += arrow(`M${r1(sx(1) + bw / 2)},${sy + bh + 1} L${r1(cxm - cwid / 4)},${cy - 2}`, 1.9);
    g += arrow(`M${r1(sx(2) + bw / 2)},${sy + bh + 1} L${r1(cxm + cwid / 4)},${cy - 2}`, 2.0);
    g += t(cxm + cwid / 2 + 8, cy + bh / 2 + 4, 'cancel', 'mk-tick');
    const H = cy + bh + 4;
    return svg(W, H, 'Pipeline diagram: a simulated exchange connects to the client over TCP order entry and UDP L2 market data. TCP links to the FSM order manager; UDP feeds order book reconstruction, then BBO pegging, which reprices orders in the FSM. Illustrative per-order states: NEW to ACK to PARTIAL to FILLED, ACK straight to FILLED, and ACK or PARTIAL to CANCELED.', g);
  }

  const renderers = { calib, horizon, statarb, cone, pipeline };
  const figs = [...document.querySelectorAll('.mk-fig[data-mk]')];

  function draw(fig) {
    const box = fig.querySelector('.mk-plot');
    const fn = renderers[fig.dataset.mk];
    if (!box || !fn) return;
    const W = Math.max(280, Math.round(box.clientWidth || 520));
    if (fig._mkW === W) return;
    let out = null;
    try { out = fn(W); } catch (e) { out = null; }
    if (!out) return; // keep the text fallback
    fig._mkW = W;
    box.innerHTML = out;
  }
  figs.forEach(draw);

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => figs.forEach(draw), 150); });

  // Pen-plotter reveal. Without motion support or IntersectionObserver, charts stay drawn.
  if (reduce || !('IntersectionObserver' in window)) return;
  const reveal = (f) => f.classList.add('mk-on');
  figs.forEach((f) => f.classList.add('mk-armed'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
  figs.forEach((f) => io.observe(f));
  // The shell announces the active site; reveal that site's figures that are already on screen.
  addEventListener('atlas:site', (ev) => {
    const sec = document.querySelector(`.mk-site[data-site="${ev.detail && ev.detail.id}"]`);
    if (!sec) return;
    sec.querySelectorAll('.mk-fig').forEach((f) => {
      const r = f.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) reveal(f);
    });
  });
  addEventListener('beforeprint', () => figs.forEach(reveal));
})();
