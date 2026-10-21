/* The story of one number: the stage scene.
 * render(t) returns the inner SVG for a global progress t in [0, 5].
 * Chapter k (1..5) owns t in [k-1, k]. Pure function: the same t always gives
 * the same picture, so scrolling up replays the story backwards exactly.
 * Also loaded by build-static.mjs to bake the no-JS / reduced-motion figures.
 *
 * Real data: lobkit fill calibration, ~/work/kalshibot/STATUS.md (2026-09-02),
 * the same BINS as scripts/charts.py. The order book ladder and the queue
 * drain are illustrative and labeled so on the stage.
 */
(function (root) {
  'use strict';
  var W = 440, H = 500;
  var BINS = [ // predicted, n, observed
    [0.014, 9518, 0.044], [0.143, 231, 0.221], [0.238, 98, 0.286],
    [0.346, 44, 0.364], [0.449, 33, 0.515], [0.634, 15, 0.600], [0.752, 18, 0.722]
  ];
  // Shuffled control. Real: observed in the 0.6+ bins falls to 0.055.
  // The other bins' shuffled positions are not published, so they are drawn
  // near that level with a fixed jitter and labeled illustrative.
  var SHUF = [0.062, 0.048, 0.071, 0.052, 0.066, 0.055, 0.055];
  var CH = ['A resting order', 'Will it fill?', 'Predicted vs. observed', 'The control', 'The limit'];

  // Plot frame (calibration axes, top of axis = 0.8 like the main page)
  var X0 = 64, X1 = 364, YB = 356, YT = 56, TOP = 0.8;
  function sx(v) { return X0 + v / TOP * (X1 - X0); }
  function sy(v) { return YB - v / TOP * (YB - YT); }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function eio(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function eo(k) { return 1 - Math.pow(1 - k, 3); }
  function f(v) { return (Math.round(v * 10) / 10).toString(); }
  function op(v) { return ' opacity="' + (Math.round(v * 1000) / 1000) + '"'; }
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
  var CX = 214, BID_R = 190, ASK_L = 238, K = 1.1, ROW = 24, RY = 74, RH = 16, GAP = 10;

  function ladder(t, L, tilt, drain) {
    var o = L, d = 7 * tilt, s = '<g class="ladder">';
    if (o <= 0.001) return '';
    s += txt(CX, RY - 12, 'lad-h', 'price', ' text-anchor="middle"' + op(o));
    s += txt(BID_R - 6, RY - 12, 'lad-h', 'bids', ' text-anchor="end"' + op(o));
    s += txt(ASK_L + 6, RY - 12, 'lad-h', 'asks', op(o));
    for (var i = 0; i < 6; i++) {
      var y = RY + i * ROW, w = ASKS[i][1] * K * L;
      s += txt(CX, y + 12.5, 'px', ASKS[i][0] + '¢', ' text-anchor="middle"' + op(o));
      s += bar(ASK_L, y, w, RH, d, 'b ask', o);
    }
    for (var j = 0; j < 6; j++) {
      var yb = RY + (6 + j) * ROW + GAP;
      s += txt(CX, yb + 12.5, j === 0 ? 'px best' : 'px', BIDS[j][0] + '¢', ' text-anchor="middle"' + op(o));
      if (j > 0) { var wb = BIDS[j][1] * K * L; s += bar(BID_R - wb, yb, wb, RH, d, 'b bid', o); }
    }
    // Best bid: queue ahead (front first, nearest the price), then my order.
    var yq = RY + 6 * ROW + GAP, used = drain * DRAIN_MAX * AHEAD_SUM, x = BID_R, left = used;
    for (var q = 0; q < AHEAD.length; q++) {
      var rem = Math.max(0, AHEAD[q] - left); left = Math.max(0, left - AHEAD[q]);
      var wq = rem * K * L;
      if (wq > 0.2) { s += bar(x - wq, yq, wq, RH, d, 'b bid q', o); x -= wq + (L > 0.5 ? 1.5 : 0); }
    }
    var wm = MINE * K * L;
    s += bar(x - wm, yq, wm, RH, d, 'b mine', o);
    // marker above my order (sits in the spread gap, left side is clear)
    var mx = x - wm / 2;
    s += '<path class="you" d="M' + f(mx - 5) + ',' + f(yq - d - 9) + 'h10l-5,6z"' + op(o * seg(t, 0.05, 0.35)) + '/>';
    return s + '</g>';
  }

  function axes(A, diag) {
    if (A <= 0.001) return '';
    var s = '<g class="axes"' + op(A) + '>';
    [0, 0.2, 0.4, 0.6, 0.8].forEach(function (v) {
      s += '<line class="grid" x1="' + X0 + '" x2="' + X1 + '" y1="' + f(sy(v)) + '" y2="' + f(sy(v)) + '"/>';
      s += '<line class="grid" y1="' + YB + '" y2="' + YT + '" x1="' + f(sx(v)) + '" x2="' + f(sx(v)) + '"/>';
      s += txt(sx(v), YB + 17, 'tick', v.toFixed(1), ' text-anchor="middle"');
      s += txt(X0 - 8, sy(v) + 4, 'tick', v.toFixed(1), ' text-anchor="end"');
    });
    s += txt((X0 + X1) / 2, YB + 34, 'axis', 'predicted fill probability', ' text-anchor="middle"');
    s += txt(16, (YB + YT) / 2, 'axis', 'observed', ' text-anchor="middle" transform="rotate(-90 16 ' + (YB + YT) / 2 + ')"');
    s += '</g>';
    if (diag > 0.001) {
      var e = TOP * diag;
      s += '<line class="diag" x1="' + f(sx(0)) + '" y1="' + f(sy(0)) + '" x2="' + f(sx(e)) + '" y2="' + f(sy(e)) + '"/>';
      s += txt(sx(0.56) + 4, sy(0.5), 'note', 'y = x', op(seg(diag, 0.8, 1)));
    }
    return s;
  }

  function band(B, uid) {
    if (B <= 0.001) return '';
    var yU = sy(0.503), yL = sy(0.0571);
    return '<g class="band"' + op(B) + '>' +
      '<rect x="' + X0 + '" y="' + f(yU) + '" width="' + (X1 - X0) + '" height="' + f(yL - yU) + '" fill="url(#hatch-' + uid + ')"/>' +
      '<line class="band-l" x1="' + X0 + '" x2="' + X1 + '" y1="' + f(yU) + '" y2="' + f(yU) + '"/>' +
      '<line class="band-l" x1="' + X0 + '" x2="' + X1 + '" y1="' + f(yL) + '" y2="' + f(yL) + '"/>' +
      txt(X0 + 6, yU - 7, 'band-t', 'upper truth 50.3%') +
      txt(X1 - 6, yL - 7, 'band-t', 'lower truth 5.71%', ' text-anchor="end"') +
      '</g>';
  }

  function points(t, shuffle) {
    var s = '', pts = [];
    for (var i = 0; i < BINS.length; i++) {
      var b = BINS[i], k = eo(seg(t, 2.45 + i * 0.06, 2.6 + i * 0.06));
      if (k <= 0) continue;
      var o = lerp(b[2], SHUF[i], shuffle);
      var cy = lerp(YT - 24, sy(o), k), cx = sx(b[0]);
      var r = (3 + 1.6 * Math.log10(b[1])) * 1.05;
      pts.push([cx, cy]);
      s += '<circle class="pt' + (shuffle > 0.5 ? ' shuf' : '') + '" cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '"' + op(k) + '/>';
    }
    var c = seg(t, 2.85, 2.97);
    if (pts.length > 1 && c > 0) {
      var d = 'M' + pts.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' L');
      s = '<path class="curve' + (shuffle > 0.5 ? ' shuf' : '') + '" d="' + d + '"' + op(c) + '/>' + s;
    }
    var n0 = seg(t, 2.55, 2.7) * (1 - shuffle);
    if (n0 > 0) s += txt(sx(0.014) + 16, sy(0.044) - 12, 'note', 'n = 9,518', op(n0));
    var leg = seg(t, 2.8, 2.95) * (1 - seg(t, 4.3, 4.5));
    if (leg > 0) s += txt(X0 + 8, YT + 16, 'note dim', 'dot size grows with orders per bin', op(leg));
    if (shuffle > 0.05) {
      s += txt(X1 - 6, sy(0.16), 'note dim', 'shuffled positions illustrative,', ' text-anchor="end"' + op(shuffle));
      s += txt(X1 - 6, sy(0.16) + 15, 'note dim', 'except 0.6+ bins: 0.055 (real)', ' text-anchor="end"' + op(shuffle));
    }
    return s;
  }

  function bottom(t, L, drain, S, uid) {
    var s = '', y = 402;
    // ladder phase: clock and queue
    if (L > 0.001) {
      var sec = Math.round(drain * 60), ahead = Math.round(AHEAD_SUM * (1 - drain * DRAIN_MAX));
      s += '<g' + op(L) + '>' +
        txt(X0, y + 6, 'lab', 'horizon') + txt(X0, y + 28, 'val', sec + ' s / 60 s') +
        txt(214, y + 6, 'lab', 'queue ahead of me') + txt(214, y + 28, 'val', ahead + ' contracts') +
        '<rect class="trk" x="' + X0 + '" y="' + (y + 40) + '" width="' + (X1 - X0) + '" height="3"/>' +
        '<rect class="trk-on" x="' + X0 + '" y="' + (y + 40) + '" width="' + f((X1 - X0) * drain) + '" height="3"/>' +
        '<rect class="sw" x="' + X0 + '" y="' + (y + 52) + '" width="12" height="10"/>' +
        txt(X0 + 18, y + 61, 'lab', 'my order: size 10, back of the 48\u00a2 bid') +
        '</g>';
    }
    // control phase: Brier skill diverging bar
    // calibration phase: held-out stats
    var cv = seg(t, 2.85, 2.97) * (1 - seg(t, 3.0, 3.08));
    if (cv > 0.001) {
      s += '<g' + op(cv) + '>' +
        txt(X0, y + 6, 'lab', 'AUC, held-out half') + txt(X0, y + 28, 'val', '0.67 to 0.70') +
        txt(214, y + 6, 'lab', 'worst gap, n \u2265 25') + txt(214, y + 28, 'val', '0.078') +
        txt(X0, y + 56, 'lab', '5 of 7 bins sit above y = x: under-predicts') +
        '</g>';
    }
    var sv = seg(t, 3.02, 3.12) * (1 - seg(t, 4.0, 4.2));
    if (sv > 0.001) {
      var val = lerp(0.069, -0.122, S), zx = 214, sc = 120 / 0.13, wv = Math.abs(val) * sc;
      var snapped = S < 0.5 ? 0.069 : -0.122;
      s += '<g' + op(sv) + '>' +
        txt(X0, y + 6, 'lab', 'Brier skill over base rate') +
        txt(X1 + 20, y + 6, 'lab', S < 0.5 ? 'real outcomes' : 'shuffled outcomes', ' text-anchor="end"') +
        '<line class="zero" x1="' + zx + '" x2="' + zx + '" y1="' + (y + 14) + '" y2="' + (y + 40) + '"/>' +
        '<rect class="' + (val >= 0 ? 'pos' : 'neg') + '" x="' + f(val >= 0 ? zx : zx - wv) + '" y="' + (y + 18) + '" width="' + f(wv) + '" height="18" rx="2"/>' +
        txt(val >= 0 ? zx + wv + 8 : zx - wv - 8, y + 32, 'val ' + (snapped >= 0 ? 'pos-t' : 'neg-t'), fmtSkill(snapped), val >= 0 ? '' : ' text-anchor="end"') +
        txt(X0, y + 60, 'lab', 'Brier ' + (S < 0.5 ? '0.0502 real vs 0.0539 base' : '0.0604 shuffled vs 0.0502 real')) +
        '</g>';
    }
    // limit phase: 9,995 orders, 44.6% ambiguous
    var av = seg(t, 4.2, 4.45);
    if (av > 0.001) {
      var g = seg(t, 4.3, 4.8), wA = (X1 - X0) * 0.446 * eio(g);
      s += '<g' + op(av) + '>' +
        txt(X0, y + 6, 'lab', '9,995 orders, 209 markets') +
        '<rect class="trk" x="' + X0 + '" y="' + (y + 16) + '" width="' + (X1 - X0) + '" height="20" rx="2"/>' +
        '<rect class="amb" x="' + f(X1 - wA) + '" y="' + (y + 16) + '" width="' + f(wA) + '" height="20" fill="url(#hatchR-' + uid + ')"/>' +
        '<rect class="amb-o" x="' + f(X1 - wA) + '" y="' + (y + 16) + '" width="' + f(wA) + '" height="20"/>' +
        txt(X1, y + 56, 'val neg-t', '44.6% ambiguous from L2 alone', ' text-anchor="end"' + op(seg(g, 0.6, 1))) +
        '</g>';
    }
    return s;
  }

  function hud(t, drain, S) {
    var c = clamp(Math.floor(t), 0, 4), s = '';
    s += txt(16, 22, 'hud-k', '0' + (c + 1) + ' / 05');
    s += txt(16, 40, 'hud-t', CH[c]);
    var lab, val, cls = 'hud-v';
    if (c === 0) { lab = 'resting at'; val = '48¢ bid, back of queue'; }
    else if (c === 1) {
      var a = 1 - drain * DRAIN_MAX, p = a > 0.8 ? 0.014 : a > 0.6 ? 0.143 : a > 0.4 ? 0.238 : a > 0.2 ? 0.346 : 0.449;
      lab = 'P(fill within 60 s)'; val = p.toFixed(3);
    } else if (c === 2) { lab = 'Brier, 9,995 orders'; val = '0.0502 vs 0.0539'; }
    else if (c === 3) { lab = 'skill, ' + (S < 0.5 ? 'real' : 'shuffled'); val = fmtSkill(S < 0.5 ? 0.069 : -0.122); cls += S < 0.5 ? ' pos-t' : ' neg-t'; }
    else { lab = 'point fill estimates'; val = 'not trusted'; cls += ' neg-t'; }
    s += txt(W - 16, 22, 'hud-k', lab, ' text-anchor="end"');
    s += txt(W - 16, 42, cls, val, ' text-anchor="end"');
    return s;
  }

  function tags(L, A) {
    var s = '';
    if (L > 0.01) s += txt(ASK_L + 2, RY + 6 * ROW + GAP + 12.5, 'tag', '\u2190 best bid, my level', op(L));
    return s;
  }

  function render(t, uid) {
    uid = uid || 'live';
    t = clamp(t, 0, 5);
    var L = 1 - eio(seg(t, 2.0, 2.3));
    var tilt = 1 - eio(seg(t, 2.0, 2.35));
    var drain = eio(seg(t, 1.1, 1.85));
    var A = seg(t, 2.15, 2.4);
    var diag = eio(seg(t, 2.3, 2.55));
    var S = eio(seg(t, 3.1, 3.6)) * (1 - eio(seg(t, 4.0, 4.3)));
    var B = eio(seg(t, 4.35, 4.75));
    var s = '<defs>' +
      '<pattern id="hatch-' + uid + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" class="h-bg"/><line x1="0" y1="0" x2="0" y2="7" class="h-ln"/></pattern>' +
      '<pattern id="hatchR-' + uid + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="hr-bg"/><line x1="0" y1="0" x2="0" y2="6" class="hr-ln"/></pattern>' +
      '</defs>';
    s += '<rect class="frame" x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" rx="10"/>';
    s += '<line class="rule" x1="16" x2="' + (W - 16) + '" y1="52" y2="52"/>';
    s += hud(t, drain, S);
    s += txt(16, H - 12, 'src', L > 0.5 ? 'ILLUSTRATIVE BOOK · sizes made up' : 'REAL DATA · lobkit, snapshot 2026-09-02');
    s += band(B, uid);
    s += axes(A, diag);
    s += ladder(t, L, tilt, drain);
    s += tags(L, A);
    s += points(t, S);
    s += bottom(t, L, drain, S, uid);
    return s;
  }

  var api = { render: render, W: W, H: H, tilt: function (t) { return 1 - eio(seg(clamp(t, 0, 5), 2.0, 2.35)); }, chapters: CH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Scene = api;
})(this);
