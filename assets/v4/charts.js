/* v4 charts from real data embedded in the page (#v4-data-kalshi). Coordinator-owned.
   slippage: backtest edge vs extra fill cost, with 95% intervals.
   ladder:   settled-YES minus price paid, for every price, against the toll band. */
(() => {
  let D = null;
  try { D = JSON.parse(document.getElementById('v4-data-kalshi').textContent); } catch (e) { return; }
  const NS = 'http://www.w3.org/2000/svg';
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const sgn = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + f1(Math.abs(v));
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const txt = (x, y, t, cls, extra = '') => `<text x="${f1(x)}" y="${f1(y)}" class="${cls}"${extra}>${esc(t)}</text>`;

  function slippage(W) {
    const rows = D.slippage, H = 240, L = 44, R = 16, T = 14, B = 58;
    const xs = (i) => L + (i + 0.5) * ((W - L - R) / rows.length);
    const lo = -4, hi = 8, ys = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
    let g = '';
    for (let v = lo; v <= hi; v += 2) g += `<line class="c-grid" x1="${L}" x2="${W - R}" y1="${f1(ys(v))}" y2="${f1(ys(v))}"/>` + txt(L - 8, ys(v) + 4, (v > 0 ? '+' : '') + v + 'c', 'c-tick', ' text-anchor="end"');
    g += `<line class="c-zero" x1="${L}" x2="${W - R}" y1="${f1(ys(0))}" y2="${f1(ys(0))}"/>`;
    rows.forEach((r, i) => {
      const x = xs(i), dead = r.lo <= 0, cls = dead ? 'c-dead' : 'c-live';
      g += `<line class="c-ci ${cls}" x1="${f1(x)}" x2="${f1(x)}" y1="${f1(ys(r.hi))}" y2="${f1(ys(r.lo))}"/>`;
      g += `<line class="c-cap ${cls}" x1="${f1(x - 8)}" x2="${f1(x + 8)}" y1="${f1(ys(r.hi))}" y2="${f1(ys(r.hi))}"/><line class="c-cap ${cls}" x1="${f1(x - 8)}" x2="${f1(x + 8)}" y1="${f1(ys(r.lo))}" y2="${f1(ys(r.lo))}"/>`;
      g += `<circle class="c-pt ${cls}" cx="${f1(x)}" cy="${f1(ys(r.avg_c))}" r="5"/>`;
      g += txt(x + 12, ys(r.avg_c) + 4, sgn(r.avg_c) + 'c', 'c-val ' + cls);
      g += txt(x, H - B + 18, '+' + r.extra_c + 'c', 'c-tick', ' text-anchor="middle"');
      g += txt(x, H - B + 32, 'p ' + r.p.toFixed(2), 'c-tick c-muted', ' text-anchor="middle"');
    });
    g += txt(L, H - 4, 'extra fill cost per trade (backtest fills = +0c)', 'c-axis');
    return `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Average profit per trade falls from +3.9 cents at backtest fills to −0.1 cents with 4 cents of extra cost; the 95 percent interval crosses zero from 1 cent onward.">${g}</svg>`;
  }

  function ladder(W) {
    const rows = D.ladder, H = 240, L = 44, R = 16, T = 14, B = 34;
    const xs = (p) => L + (p - 1) / 98 * (W - L - R);
    const lim = 8, ys = (v) => T + (lim - Math.max(-lim, Math.min(lim, v))) / (2 * lim) * (H - T - B);
    let g = '';
    for (let v = -8; v <= 8; v += 4) g += `<line class="c-grid" x1="${L}" x2="${W - R}" y1="${f1(ys(v))}" y2="${f1(ys(v))}"/>` + txt(L - 8, ys(v) + 4, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + 'c', 'c-tick', ' text-anchor="end"');
    // toll band: +/- toll at each price
    const up = rows.map((r) => `${f1(xs(r[0]))},${f1(ys(r[6]))}`), dn = rows.slice().reverse().map((r) => `${f1(xs(r[0]))},${f1(ys(-r[6]))}`);
    g += `<polygon class="c-band" points="${up.concat(dn).join(' ')}"/>`;
    g += `<line class="c-zero" x1="${L}" x2="${W - R}" y1="${f1(ys(0))}" y2="${f1(ys(0))}"/>`;
    rows.forEach((r) => {
      const x = xs(r[0]);
      g += `<line class="c-ci c-whisk" x1="${f1(x)}" x2="${f1(x)}" y1="${f1(ys(r[5]))}" y2="${f1(ys(r[4]))}"/>`;
    });
    rows.forEach((r) => { g += `<circle class="c-pt ${Math.abs(r[3]) > r[6] ? 'c-out' : 'c-live'}" cx="${f1(xs(r[0]))}" cy="${f1(ys(r[3]))}" r="2.6"><title>${r[0]}c: settled YES ${r[2]}%, gap ${sgn(r[3])}c, toll ${r[6]}c</title></circle>`; });
    const worst = rows.reduce((a, r) => (r[3] < a[3] ? r : a), rows[0]);
    g += txt(xs(worst[0]) + 8, ys(worst[3]) + 14, `worst ${sgn(worst[3])}c at ${worst[0]}c`, 'c-tick');
    [1, 25, 50, 75, 99].forEach((p) => { g += txt(xs(p), H - B + 18, p + 'c', 'c-tick', ' text-anchor="middle"'); });
    g += txt(W - R, H - 2, 'price paid', 'c-axis', ' text-anchor="end"');
    g += txt(L + 6, T + 12, 'settled YES minus price', 'c-axis');
    return `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="For each of 99 prices from 1 to 99 cents, the gap between the settled-YES rate and the price paid, with 95 percent intervals and the toll band. No interval clears the toll. The worst gap is minus 3.7 cents at 42 cents.">${g}</svg>`;
  }

  const R = { slippage, ladder };
  const figs = [...document.querySelectorAll('.v4-fig[data-chart]')];
  const draw = (fig) => {
    const box = fig.querySelector('.v4-plot'), fn = R[fig.dataset.chart];
    if (!box || !fn) return;
    const W = Math.max(280, Math.round(box.clientWidth || 520));
    if (fig._w === W) return;
    try { box.innerHTML = fn(W); fig._w = W; } catch (e) { /* keep text fallback */ }
  };
  figs.forEach(draw);
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => figs.forEach(draw), 150); });
  // Charts inside a closed drawer measure 0 wide; redraw everything once a drawer opens.
  document.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) dispatchEvent(new Event('resize')); }));
})();
