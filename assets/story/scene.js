/* lobkit, the story of one number: the stage scene.
 * LobkitScene.render(t, uid, g) returns the inner SVG for progress t in [0, 5].
 * Chapter k (1..5) owns t in [k-1, k]. Pure function: the same t always gives
 * the same picture, so scrolling up replays the story backwards exactly.
 * Two geometries: GEO.d (440 x 500) and GEO.c (340 x 392) for narrow stages,
 * so SVG text never drops under 11 CSS px.
 *
 * Real data: ~/work/kalshibot/STATUS.md (2026-09-02), the same BINS as
 * scripts/charts.py. Illustrative and labeled so on the stage: the ladder
 * sizes and queue drain (chapters 1 and 2) and the shuffled positions of the
 * bins under 0.6 (chapter 4). Real: the 0.055 shuffled rate of the 0.6+ bins.
 *
 * Re-bake the no-JS figures in the partial after editing:
 *   node assets/story/scene.js --bake partials/lobkit-story.html
 */
(function (root) {
  'use strict';
  var BINS = [ // predicted, n, observed
    [0.014, 9518, 0.044], [0.143, 231, 0.221], [0.238, 98, 0.286],
    [0.346, 44, 0.364], [0.449, 33, 0.515], [0.634, 15, 0.600], [0.752, 18, 0.722]
  ];
  // Shuffled control. Real: observed in the 0.6+ bins falls to 0.055.
  // The other bins' shuffled positions are not published: drawn hollow, near
  // that level with a fixed offset, and labeled "illustrative positions".
  var SHUF = [0.062, 0.048, 0.071, 0.052, 0.066, 0.055, 0.055];
  var REAL_SHUF_FROM = 5;
  var CH = ['A resting order', 'Will it fill?', 'Predicted vs. observed', 'The control', 'The limit'];
  var TOP = 0.8;

  var GEO = {
    d: { id: 'd', W: 440, H: 500, X0: 64, X1: 364, YT: 56, YB: 356, tickDy: 17, axisDy: 34, ylabX: 16,
         y0: 402, src: 488, CX: 214, BID_R: 190, ASK_L: 238, K: 1.1, ROW: 24, RY: 74, RH: 16, GAP: 10,
         col2: 214, sc: 120 / 0.13, rScale: 1.05, limDy: 26 },
    c: { id: 'c', W: 340, H: 392, X0: 46, X1: 324, YT: 60, YB: 262, tickDy: 15, axisDy: 30, ylabX: 12,
         y0: 306, src: 384, CX: 170, BID_R: 148, ASK_L: 192, K: 1.2, ROW: 17, RY: 76, RH: 12, GAP: 8,
         col2: 190, sc: 70 / 0.122, rScale: 0.9, limDy: 0 }
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function eio(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function eo(k) { return 1 - Math.pow(1 - k, 3); }
  function f(v) { return (Math.round(v * 10) / 10).toString(); }
  function op(v) { return v >= 0.999 ? '' : ' opacity="' + (Math.round(v * 1000) / 1000) + '"'; }
  function txt(x, y, cls, s, extra) {
    return '<text class="' + cls + '" x="' + f(x) + '" y="' + f(y) + '"' + (extra || '') + '>' + s + '</text>';
  }
  function fmtSkill(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3); }

  // Extruded bar: front face plus a top and right face of depth d.
  function bar(x, y, w, h, d, cls, o) {
    if (w <= 0.2) return '';
    var s = '<g class="' + cls + '"' + op(o) + '>';
    if (d > 0.3) {
      s += '<path class="side" d="M' + f(x + w) + ',' + f(y) + 'l' + f(d) + ',' + f(-d) + 'v' + f(h) + 'l' + f(-d) + ',' + f(d) + 'z"/>';
      s += '<path class="top" d="M' + f(x) + ',' + f(y) + 'l' + f(d) + ',' + f(-d) + 'h' + f(w) + 'l' + f(-d) + ',' + f(d) + 'z"/>';
    }
    s += '<rect class="face" x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + h + '"/>';
    return s + '</g>';
  }

  // Illustrative ladder. Sizes are made up; only the order (size 10, back of an
  // existing level, 60 s horizon) matches the lobkit setup.
  var ASKS = [[54, 60], [53, 85], [52, 40], [51, 70], [50, 55], [49, 35]];
  var BIDS = [[48, 0], [47, 75], [46, 50], [45, 90], [44, 45], [43, 65]];
  var AHEAD = [30, 15, 25, 20], AHEAD_SUM = 90, MINE = 10, DRAIN_MAX = 0.85;

  function ladder(g, t, L, tilt, drain) {
    var o = L, d = (g.id === 'c' ? 5 : 7) * tilt, s = '<g class="ladder">', ty = g.RH * 0.78;
    if (o <= 0.001) return '';
    s += txt(g.CX, g.RY - 12, 'lad-h', 'price', ' text-anchor="middle"' + op(o));
    s += txt(g.BID_R - 6, g.RY - 12, 'lad-h', 'bids', ' text-anchor="end"' + op(o));
    s += txt(g.ASK_L + 6, g.RY - 12, 'lad-h', 'asks', op(o));
    for (var i = 0; i < 6; i++) {
      var y = g.RY + i * g.ROW, w = ASKS[i][1] * g.K * L;
      s += txt(g.CX, y + ty, 'px', ASKS[i][0] + '¢', ' text-anchor="middle"' + op(o));
      s += bar(g.ASK_L, y, w, g.RH, d, 'b ask', o);
    }
    for (var j = 0; j < 6; j++) {
      var yb = g.RY + (6 + j) * g.ROW + g.GAP;
      s += txt(g.CX, yb + ty, j === 0 ? 'px best' : 'px', BIDS[j][0] + '¢', ' text-anchor="middle"' + op(o));
      if (j > 0) { var wb = BIDS[j][1] * g.K * L; s += bar(g.BID_R - wb, yb, wb, g.RH, d, 'b bid', o); }
    }
    // Best bid: queue ahead (front first, nearest the price), then my order.
    var yq = g.RY + 6 * g.ROW + g.GAP, left = drain * DRAIN_MAX * AHEAD_SUM, x = g.BID_R;
    for (var q = 0; q < AHEAD.length; q++) {
      var rem = Math.max(0, AHEAD[q] - left); left = Math.max(0, left - AHEAD[q]);
      var wq = rem * g.K * L;
      if (wq > 0.2) { s += bar(x - wq, yq, wq, g.RH, d, 'b bid q', o); x -= wq + (L > 0.5 ? 1.5 : 0); }
    }
    var wm = MINE * g.K * L;
    s += bar(x - wm, yq, wm, g.RH, d, 'b mine', o);
    var mx = x - wm / 2;
    s += '<path class="you" d="M' + f(mx - 5) + ',' + f(yq - d - 9) + 'h10l-5,6z"' + op(o * seg(t, 0.05, 0.35)) + '/>';
    s += txt(g.ASK_L + 2, yq + ty, 'tag', '← best bid, my level', op(o));
    return s + '</g>';
  }

  function sx(g, v) { return g.X0 + v / TOP * (g.X1 - g.X0); }
  function sy(g, v) { return g.YB - v / TOP * (g.YB - g.YT); }

  function axes(g, A, diag) {
    if (A <= 0.001) return '';
    var s = '<g class="axes"' + op(A) + '>';
    [0, 0.2, 0.4, 0.6, 0.8].forEach(function (v) {
      s += '<line class="grid" x1="' + g.X0 + '" x2="' + g.X1 + '" y1="' + f(sy(g, v)) + '" y2="' + f(sy(g, v)) + '"/>';
      s += '<line class="grid" y1="' + g.YB + '" y2="' + g.YT + '" x1="' + f(sx(g, v)) + '" x2="' + f(sx(g, v)) + '"/>';
      s += txt(sx(g, v), g.YB + g.tickDy, 'tick', v.toFixed(1), ' text-anchor="middle"');
      s += txt(g.X0 - 8, sy(g, v) + 4, 'tick', v.toFixed(1), ' text-anchor="end"');
    });
    var my = (g.YB + g.YT) / 2;
    s += txt((g.X0 + g.X1) / 2, g.YB + g.axisDy, 'axis', 'predicted fill probability', ' text-anchor="middle"');
    s += txt(g.ylabX, my, 'axis', 'observed', ' text-anchor="middle" transform="rotate(-90 ' + g.ylabX + ' ' + f(my) + ')"');
    if (diag > 0.001) {
      var e = TOP * diag;
      s += '<line class="diag" x1="' + f(sx(g, 0)) + '" y1="' + f(sy(g, 0)) + '" x2="' + f(sx(g, e)) + '" y2="' + f(sy(g, e)) + '"/>';
      s += txt(sx(g, 0.56) + 4, sy(g, 0.5), 'note', 'y = x', op(seg(diag, 0.8, 1)));
    }
    return s + '</g>';
  }

  function points(g, t, shuffle, C) {
    var s = '', pts = [];
    for (var i = 0; i < BINS.length; i++) {
      var b = BINS[i], k = eo(seg(t, 2.45 + i * 0.06, 2.6 + i * 0.06));
      if (k <= 0) continue;
      var o = lerp(b[2], SHUF[i], shuffle);
      var cy = lerp(g.YT - 24, sy(g, o), k), cx = sx(g, b[0]);
      var r = (3 + 1.6 * Math.log10(b[1])) * g.rScale;
      var cls = 'pt' + (shuffle > 0.5 ? (i < REAL_SHUF_FROM ? ' ill' : ' shuf') : '');
      pts.push([cx, cy]);
      s += '<circle class="' + cls + '" cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '"' + op(k) + '/>';
    }
    var c = seg(t, 2.85, 2.97);
    if (pts.length > 1 && c > 0) {
      var d = 'M' + pts.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' L');
      s = '<path class="curve' + (shuffle > 0.5 ? ' shuf' : '') + '" d="' + d + '"' + op(c) + '/>' + s;
    }
    var n0 = seg(t, 2.55, 2.7) * (1 - shuffle);
    if (n0 > 0) s += txt(sx(g, 0.06), sy(g, 0.012), 'note', 'n = 9,518', op(n0));
    var leg = seg(t, 2.8, 2.95) * (1 - shuffle);
    if (leg > 0.001) s += txt(g.X0 + 8, g.YT + 16, 'note dim', 'dot size grows with orders per bin', op(leg));
    if (shuffle > 0.02) {
      // Visible key: which shuffled positions are published and which are not.
      var lx = g.X0 + 8, ly = g.YT + 10;
      s += '<g class="key"' + op(shuffle) + '>' +
        '<rect class="key-bg" x="' + f(lx - 4) + '" y="' + f(ly - 4) + '" width="' + (g.id === 'c' ? 232 : 250) + '" height="48" rx="4"/>' +
        '<circle class="pt ill" cx="' + f(lx + 6) + '" cy="' + f(ly + 9) + '" r="5"/>' +
        txt(lx + 18, ly + 13, 'note', 'illustrative positions') +
        '<circle class="pt shuf" cx="' + f(lx + 6) + '" cy="' + f(ly + 29) + '" r="5"/>' +
        txt(lx + 18, ly + 33, 'note', '0.6+ bins: 0.055, real') +
        '</g>';
    }
    return '<g' + op(C) + '>' + s + '</g>';
  }

  // Chapter 5 overlay: the ambiguous share and the two truths.
  function limit(g, t, uid) {
    var a = seg(t, 4.2, 4.45);
    if (a <= 0.001) return '';
    var y = g.YT + g.limDy, w = g.X1 - g.X0, s = '<g class="limit-o">';
    var grow = eio(seg(t, 4.3, 4.6)), wA = w * 0.446 * grow;
    s += '<g' + op(a) + '>' + txt(g.X0, y + 22, 'lab', '9,995 orders, 209 markets') +
      '<rect class="trk" x="' + g.X0 + '" y="' + (y + 32) + '" width="' + w + '" height="18" rx="2"/>' +
      '<rect class="amb" fill="url(#hatch-' + uid + ')" x="' + f(g.X1 - wA) + '" y="' + (y + 32) + '" width="' + f(wA) + '" height="18"/>' +
      '<rect class="amb-o" x="' + f(g.X1 - wA) + '" y="' + (y + 32) + '" width="' + f(wA) + '" height="18"/>' +
      txt(g.X1, y + 70, 'val neg-t', '44.6% ambiguous from L2 alone', ' text-anchor="end"' + op(seg(t, 4.45, 4.6))) +
      '</g>';
    var b = seg(t, 4.5, 4.72);
    if (b > 0.001) {
      var xl = g.X0 + w * 0.0571, xu = g.X0 + w * 0.503, ty = y + 114;
      s += '<g' + op(b) + '>' + txt(g.X0, y + 102, 'lab', 'base rate under each truth, 0 to 100%') +
        '<rect class="trk" x="' + g.X0 + '" y="' + ty + '" width="' + w + '" height="6" rx="1"/>' +
        '<rect class="gap" x="' + f(xl) + '" y="' + ty + '" width="' + f((xu - xl) * eio(seg(t, 4.55, 4.8))) + '" height="6"/>' +
        '<line class="mk" x1="' + f(xl) + '" x2="' + f(xl) + '" y1="' + (ty - 5) + '" y2="' + (ty + 11) + '"/>' +
        '<line class="mk" x1="' + f(xu) + '" x2="' + f(xu) + '" y1="' + (ty - 5) + '" y2="' + (ty + 11) + '"/>' +
        txt(xl, ty + 26, 'note', 'lower truth 5.71%') +
        txt(xu, ty + 44, 'note', 'upper truth 50.3%') +
        txt(g.X0, ty + 72, 'band-t', 'no model closes this gap from L2', op(seg(t, 4.7, 4.85))) +
        '</g>';
    }
    return s + '</g>';
  }

  function bottom(g, t, L, drain, S) {
    var s = '', y = g.y0, X0 = g.X0, X1 = g.X1;
    if (L > 0.001) {
      var sec = Math.round(drain * 60), ahead = Math.round(AHEAD_SUM * (1 - drain * DRAIN_MAX));
      s += '<g' + op(L) + '>' +
        txt(X0, y + 6, 'lab', 'horizon') + txt(X0, y + 26, 'val', sec + ' s / 60 s') +
        txt(g.col2, y + 6, 'lab', 'queue ahead of me') + txt(g.col2, y + 26, 'val', ahead + ' contracts') +
        '<rect class="trk" x="' + X0 + '" y="' + (y + 36) + '" width="' + (X1 - X0) + '" height="3"/>' +
        '<rect class="trk-on" x="' + X0 + '" y="' + (y + 36) + '" width="' + f((X1 - X0) * drain) + '" height="3"/>' +
        '<rect class="sw" x="' + X0 + '" y="' + (y + 48) + '" width="12" height="10"/>' +
        txt(X0 + 18, y + 57, 'lab', 'my order: size 10, back of the 48¢ bid') +
        '</g>';
    }
    var cv = seg(t, 2.85, 2.97) * (1 - seg(t, 3.0, 3.08));
    if (cv > 0.001) {
      s += '<g' + op(cv) + '>' +
        txt(X0, y + 6, 'lab', 'AUC, held-out half') + txt(X0, y + 26, 'val', '0.67 to 0.70') +
        txt(g.col2, y + 6, 'lab', 'worst gap, n ≥ 25') + txt(g.col2, y + 26, 'val', '0.078') +
        txt(X0, y + 52, 'lab', '5 of 7 bins above y = x: under-predicts') +
        '</g>';
    }
    var sv = seg(t, 3.02, 3.12) * (1 - seg(t, 4.0, 4.2));
    if (sv > 0.001) {
      var val = lerp(0.069, -0.122, S), zx = (X0 + X1) / 2, wv = Math.abs(val) * g.sc;
      var snapped = S < 0.5 ? 0.069 : -0.122;
      s += '<g' + op(sv) + '>' +
        txt(X0, y + 6, 'lab', 'skill vs base rate') +
        txt(g.W - 16, y + 6, 'lab', S < 0.5 ? 'real outcomes' : 'shuffled outcomes', ' text-anchor="end"') +
        '<line class="zero" x1="' + f(zx) + '" x2="' + f(zx) + '" y1="' + (y + 12) + '" y2="' + (y + 38) + '"/>' +
        '<rect class="' + (val >= 0 ? 'pos' : 'neg') + '" x="' + f(val >= 0 ? zx : zx - wv) + '" y="' + (y + 16) + '" width="' + f(wv) + '" height="18" rx="2"/>' +
        txt(val >= 0 ? zx + wv + 8 : zx - wv - 8, y + 30, 'val ' + (snapped >= 0 ? 'pos-t' : 'neg-t'), fmtSkill(snapped), val >= 0 ? '' : ' text-anchor="end"') +
        txt(X0, y + 56, 'lab', 'Brier ' + (S < 0.5 ? '0.0502 real vs 0.0539 base' : '0.0604 shuffled vs 0.0502 real')) +
        '</g>';
    }
    var lv = seg(t, 4.6, 4.85);
    if (lv > 0.001) {
      s += '<g' + op(lv) + '>' +
        txt(X0, y + 6, 'lab', 'calibrated against') + txt(X0, y + 26, 'val', 'the lower truth (conservative)') +
        txt(X0, y + 52, 'lab', 'trusted for book reconstruction') +
        '</g>';
    }
    return s;
  }

  function hud(g, t, drain, S) {
    var c = clamp(Math.floor(t), 0, 4), s = '', W = g.W;
    s += txt(16, 22, 'hud-k', '0' + (c + 1) + ' / 05');
    s += txt(16, 40, 'hud-t', CH[c]);
    var lab, val, cls = 'hud-v';
    if (c === 0) { lab = 'resting at'; val = '48¢, back of queue'; }
    else if (c === 1) {
      var a = 1 - drain * DRAIN_MAX, p = a > 0.8 ? 0.014 : a > 0.6 ? 0.143 : a > 0.4 ? 0.238 : a > 0.2 ? 0.346 : 0.449;
      lab = 'P(fill in 60 s), illustrative'; val = p.toFixed(3);
    } else if (c === 2) { lab = 'Brier vs 0.0539 base'; val = '0.0502'; }
    else if (c === 3) { lab = 'skill, ' + (S < 0.5 ? 'real' : 'shuffled'); val = fmtSkill(S < 0.5 ? 0.069 : -0.122); cls += S < 0.5 ? ' pos-t' : ' neg-t'; }
    else { lab = 'point fill estimates'; val = 'not trusted'; cls += ' neg-t'; }
    s += txt(W - 16, 22, 'hud-k', lab, ' text-anchor="end"');
    s += txt(W - 16, 42, cls, val, ' text-anchor="end"');
    return s;
  }

  function render(t, uid, g) {
    g = g || GEO.d;
    uid = (uid || 'live') + g.id;
    t = clamp(t, 0, 5);
    var L = 1 - eio(seg(t, 2.0, 2.3));
    var tilt = 1 - eio(seg(t, 2.0, 2.35));
    var drain = eio(seg(t, 1.1, 1.85));
    var A = seg(t, 2.15, 2.4);
    var diag = eio(seg(t, 2.3, 2.55));
    var S = eio(seg(t, 3.1, 3.6)) * (1 - eio(seg(t, 4.0, 4.3)));
    var C = 1 - 0.93 * eio(seg(t, 4.1, 4.4)); // calibration dims for the limit
    var s = '<defs><pattern id="hatch-' + uid + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="6" height="6" class="hr-bg"/><line x1="0" y1="0" x2="0" y2="6" class="hr-ln"/></pattern></defs>';
    s += '<rect class="frame" x="0.5" y="0.5" width="' + (g.W - 1) + '" height="' + (g.H - 1) + '" rx="8"/>';
    s += '<line class="rule" x1="16" x2="' + (g.W - 16) + '" y1="52" y2="52"/>';
    s += hud(g, t, drain, S);
    s += txt(16, g.src, 'src', L > 0.5 ? 'ILLUSTRATIVE BOOK · sizes made up' : 'REAL DATA · lobkit, snapshot 2026-09-02');
    s += axes(g, A * C, diag);
    s += ladder(g, t, L, tilt, drain);
    s += points(g, t, S, C);
    s += limit(g, t, uid);
    s += bottom(g, t, L, drain, S);
    return s;
  }

  var api = {
    render: render, GEO: GEO, chapters: CH,
    tilt: function (t) { return 1 - eio(seg(clamp(t, 0, 5), 2.0, 2.35)); }
  };

  // Node only: bake the static figures (no JS, reduced motion) into the partial.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    if (typeof require !== 'undefined' && require.main === module && process.argv[2] === '--bake') {
      var fs = require('fs'), file = process.argv[3];
      var T = [0.9, 1.95, 2.98, 3.95, 4.99];
      var DESC = [
        'Illustrative order book. My order, size 10, sits at the back of the 48 cent bid behind 90 contracts.',
        'Illustrative queue drain. The queue ahead empties over the 60 second horizon.',
        'lobkit calibration, real data: seven bins of predicted versus observed fill rate around the dashed y = x line. Brier 0.0502 vs 0.0539 base.',
        'Shuffled-outcome control: Brier skill flips from +0.069 to -0.122. Shuffled positions of bins under 0.6 are illustrative; the 0.6+ bins fall to 0.055, which is real.',
        'The limit: 44.6% of 9,995 orders are ambiguous from L2 data alone. Base rate is 5.71% under the lower truth and 50.3% under the upper.'
      ];
      var html = fs.readFileSync(file, 'utf8');
      T.forEach(function (t, i) {
        var n = i + 1, re = new RegExp('<!-- static:' + n + ' -->[\\s\\S]*?<!-- /static:' + n + ' -->');
        if (!re.test(html)) throw new Error('marker static:' + n + ' missing');
        var svgs = ['d', 'c'].map(function (k) {
          var g = GEO[k];
          return '<svg class="scene g-' + k + '" viewBox="0 0 ' + g.W + ' ' + g.H + '" role="img" aria-label="' + DESC[i] + '">' + render(t, 's' + n, g) + '</svg>';
        }).join('\n');
        html = html.replace(re, function () { return '<!-- static:' + n + ' -->\n' + svgs + '\n<!-- /static:' + n + ' -->'; });
      });
      fs.writeFileSync(file, html);
      console.log('static figures baked into', file);
    }
  } else {
    root.LobkitScene = api;
  }
})(this);
