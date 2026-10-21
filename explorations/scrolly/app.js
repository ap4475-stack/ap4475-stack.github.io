/* Scroll-scrubbed driver. Progress t in [0, 5] comes from where the reading
 * line sits inside the five chapter steps. The stage eases toward t each frame
 * and redraws from Scene.render(t), so scrolling up runs it backwards.
 * ?chapter=N jumps to the settled end of chapter N; ?p=0..1 jumps to t = 5p.
 */
(function () {
  'use strict';
  var d = document.documentElement;
  window.__scrollyOk = true;
  clearTimeout(window.__failsafe);
  var q = new URLSearchParams(location.search);
  var jumpCh = parseInt(q.get('chapter'), 10), jumpP = parseFloat(q.get('p'));
  var jumpAt = q.get('at');
  var hasJump = jumpCh >= 1 || !isNaN(jumpP) || !!jumpAt;
  // Jump links scroll an inner body scroller: headless Chrome screenshots
  // capture that reliably, while window scroll offsets are often dropped.
  if (hasJump) d.classList.add('jump');
  var sc = hasJump ? document.body : null;
  function scrollTop() { return sc ? sc.scrollTop : scrollY; }
  function setScroll(y) { if (sc) sc.scrollTop = y; else scrollTo(0, y); }

  var cards = [].slice.call(document.querySelectorAll('.pcard'));
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');

  function montage() {
    if (!d.classList.contains('scrub')) { cards.forEach(function (c) { c.style.transform = ''; c.style.opacity = ''; }); return; }
    var vh = innerHeight;
    cards.forEach(function (c, i) {
      var r = c.getBoundingClientRect();
      var k = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.45) - i % 3 * 0.12));
      c.style.transform = 'translateY(' + ((1 - k) * 48).toFixed(1) + 'px)';
      c.style.opacity = (0.4 + 0.6 * k).toFixed(3);
    });
  }

  if (!d.classList.contains('scrub') || !window.Scene) {
    if (jumpAt) jumpCh = 0, document.getElementById(jumpAt) && document.getElementById(jumpAt).scrollIntoView({ block: 'start' });
    if (jumpCh >= 1) { var el = document.getElementById('ch' + jumpCh); if (el) el.scrollIntoView({ block: 'start' }); }
    return;
  }

  var svg = document.getElementById('stage');
  var tiltEl = document.querySelector('.tilt');
  var stage = document.querySelector('.stage');
  var steps = [].slice.call(document.querySelectorAll('.step'));
  var links = [].slice.call(document.querySelectorAll('.rail a'));
  // Each chapter animates over the first 60% of its step, then holds while the card is read.
  var HOLD = 0.6;
  var dbg = q.has('debug') ? document.body.appendChild(document.createElement('pre')) : null;
  if (dbg) dbg.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;color:#fff;background:#000;margin:0;padding:4px';
  var cur = -1, target = 0, drawn = -1, raf = 0, active = -1;

  function mobile() { return innerWidth <= 820; }
  function line() {
    var vh = innerHeight;
    if (!mobile()) return vh * 0.5;
    var sh = stage.getBoundingClientRect().height;
    return sh + (vh - sh) * 0.5;
  }
  function progress() {
    var y = line();
    for (var i = steps.length - 1; i >= 0; i--) {
      var r = steps[i].getBoundingClientRect();
      if (y >= r.top) return i + Math.min(0.999, (y - r.top) / r.height / HOLD);
    }
    return 0;
  }
  function draw(t) {
    svg.innerHTML = Scene.render(t);
    var k = Scene.tilt(t);
    tiltEl.style.transform = k > 0.001
      ? 'rotateX(' + (k * 16).toFixed(2) + 'deg) rotateY(' + (k * -9).toFixed(2) + 'deg) scale(' + (1 - 0.04 * k).toFixed(4) + ')'
      : 'none';
    var c = Math.min(4, Math.floor(t));
    if (c !== active) {
      active = c;
      steps.forEach(function (s, i) { s.classList.toggle('on', i === c); });
      links.forEach(function (a, i) { if (i === c) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    }
    drawn = t;
    if (dbg) dbg.textContent = 't=' + t.toFixed(4) + ' y=' + scrollTop();
  }
  window.__scrolly = { t: function () { return cur; } };
  function frame() {
    raf = 0;
    cur = cur < 0 || hasJump ? target : cur + (target - cur) * 0.16;
    if (Math.abs(target - cur) < 0.0008) cur = target;
    if (Math.abs(cur - drawn) > 0.0002) draw(cur);
    if (cur !== target) raf = requestAnimationFrame(frame);
  }
  function onScroll() {
    target = progress();
    montage();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function jump() {
    if (jumpAt) { var a = document.getElementById(jumpAt); if (a) setScroll(scrollTop() + a.getBoundingClientRect().top); cur = -1; return; }
    var t = jumpCh >= 1 ? Math.min(5, jumpCh - 1 + 0.999) : Math.max(0, Math.min(1, jumpP)) * 5;
    var i = Math.min(4, Math.floor(t)), loc = Math.min(0.999, t - i) * HOLD;
    if (t >= 5) { i = 4; loc = 0.999 * HOLD; }
    var r = steps[i].getBoundingClientRect();
    setScroll(Math.max(0, scrollTop() + r.top + loc * r.height - line()));
    cur = -1;
  }

  rm.addEventListener && rm.addEventListener('change', function () { location.reload(); });
  (sc || window).addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  if (hasJump) jump();
  target = progress(); cur = target; draw(target); montage();
  if (hasJump) {
    // Settle again after fonts and layout land, without easing.
    var settle = function () { jump(); target = progress(); cur = target; draw(target); montage(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
    addEventListener('load', settle);
    addEventListener('resize', settle);
    setTimeout(settle, 300); setTimeout(settle, 1200);
  }
})();
