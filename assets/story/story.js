/* lobkit story: scroll-scrubbed driver for Exhibit A.
 * Progress t in [0, 5] comes from where the reading line sits inside the five
 * chapter steps. The stage eases toward t each frame and redraws from
 * LobkitScene.render(t), so scrolling up runs it backwards.
 * Without JS, or under prefers-reduced-motion, the article never gets
 * .story-scrub and the baked static figures show instead.
 * ?chapter=N (1..5) scrolls to the settled end of chapter N, for screenshots.
 */
(function () {
  'use strict';
  var art = document.getElementById('lobkit');
  var Scene = window.LobkitScene;
  if (!art || !Scene) return; // the inline failsafe drops .story-scrub
  window.__storyOk = true;
  clearTimeout(window.__storyFailsafe);

  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mq = window.matchMedia('(max-width: 820px)');
  var svg = art.querySelector('.story-live');
  var tiltEl = art.querySelector('.story-tilt');
  var stage = art.querySelector('.story-stage');
  var steps = [].slice.call(art.querySelectorAll('.story-step'));
  var links = [].slice.call(art.querySelectorAll('.story-rail a'));
  var nav = document.querySelector('.nav');
  var jumpCh = parseInt(new URLSearchParams(location.search).get('chapter'), 10);
  if (!(jumpCh >= 1 && jumpCh <= 5)) jumpCh = 0;
  // Headless screenshots often drop window scroll offsets, so the jump hook
  // scrolls an inner body scroller instead. Normal visits never get this.
  var sc = jumpCh ? document.body : null;
  if (sc) document.documentElement.classList.add('story-jump');
  function getY() { return sc ? sc.scrollTop : scrollY; }
  function setY(y) { if (sc) sc.scrollTop = y; else scrollTo(0, y); }

  var cur = -1, target = 0, drawn = -1, raf = 0, active = -1, geo = null, on = false;

  function navH() { return nav ? nav.getBoundingClientRect().height : 57; }
  // Top of the area where cards are read: under the nav, and under the stage on mobile.
  function readTop() { return navH() + (mq.matches ? stage.getBoundingClientRect().height : 0); }
  function line() { var t0 = readTop(); return t0 + (innerHeight - t0) * 0.5; }
  // Each chapter animates over its first stretch, then holds while the card is read.
  function span(r) { return Math.max(1, Math.min(r.height * 0.6, (innerHeight - readTop()) * 0.45)); }
  function progress() {
    var y = line();
    for (var i = steps.length - 1; i >= 0; i--) {
      var r = steps[i].getBoundingClientRect();
      if (y >= r.top) return Math.min(4.999, i + Math.min(0.999, (y - r.top) / span(r)));
    }
    return 0;
  }

  // Pick the geometry that keeps SVG text at or above its CSS size.
  function pickGeo() {
    var w = stage.clientWidth, h = mq.matches ? innerHeight * 0.54 : stage.clientHeight - 32;
    var d = Scene.GEO.d, k = Math.min(w / d.W, h / d.H) >= 1 ? d : Scene.GEO.c;
    if (k !== geo) {
      geo = k;
      svg.setAttribute('viewBox', '0 0 ' + k.W + ' ' + k.H);
      svg.setAttribute('class', 'scene story-live g-' + k.id);
      art.style.setProperty('--story-ar', (k.W / k.H).toFixed(4));
      drawn = -1;
    }
  }
  function layout() {
    pickGeo();
    if (mq.matches) art.style.setProperty('--story-stage-h', Math.round(stage.getBoundingClientRect().height) + 'px');
    else art.style.removeProperty('--story-stage-h');
    art.style.setProperty('--story-nav', Math.round(navH()) + 'px');
  }

  function draw(t) {
    svg.innerHTML = Scene.render(t, 'live', geo);
    // No CSS tilt on the compact stage: it would shrink text under 11px.
    var k = geo.id === 'c' ? 0 : Scene.tilt(t);
    tiltEl.style.transform = k > 0.001
      ? 'rotateX(' + (k * 14).toFixed(2) + 'deg) rotateY(' + (k * -8).toFixed(2) + 'deg) scale(' + (1 - 0.09 * k).toFixed(4) + ')'
      : 'none';
    var c = Math.min(4, Math.floor(t));
    if (c !== active) {
      active = c;
      steps.forEach(function (s, i) { s.classList.toggle('on', i === c); });
      links.forEach(function (a, i) { if (i === c) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    }
    drawn = t;
  }
  function frame() {
    raf = 0;
    cur = cur < 0 || jumpCh ? target : cur + (target - cur) * 0.16;
    if (Math.abs(target - cur) < 0.0008) cur = target;
    if (Math.abs(cur - drawn) > 0.0002) draw(cur);
    if (cur !== target) raf = requestAnimationFrame(frame);
  }
  function onScroll() {
    if (!on) return;
    target = progress();
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function onResize() { if (!on) return; layout(); onScroll(); }
  function snap() { layout(); target = progress(); cur = target; draw(target); }

  // Screenshot hook: only runs when ?chapter=N is in the URL.
  function jump() {
    var r = steps[jumpCh - 1].getBoundingClientRect();
    setY(Math.max(0, getY() + r.top + span(r) * 0.999 - line()));
  }

  // Read-only hook for tests: current scroll progress, no side effects.
  window.__lobkitStory = { progress: function () { return on ? progress() : -1; } };

  function start() {
    on = true;
    art.classList.add('story-scrub');
    snap();
    if (jumpCh) {
      var settle = function () { if (on) { layout(); jump(); snap(); } };
      settle();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
      addEventListener('load', settle);
      addEventListener('resize', settle);
      setTimeout(settle, 300); setTimeout(settle, 1200);
    }
  }
  function stop() {
    on = false;
    art.classList.remove('story-scrub');
    tiltEl.style.transform = '';
    steps.forEach(function (s) { s.classList.remove('on'); });
    links.forEach(function (a) { a.removeAttribute('aria-current'); });
  }

  addEventListener('scroll', onScroll, { passive: true });
  if (sc) sc.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  var onRm = function () { if (rm.matches) stop(); else start(); };
  if (rm.addEventListener) rm.addEventListener('change', onRm);
  if (mq.addEventListener) mq.addEventListener('change', onResize);
  if (rm.matches) stop(); else start();
  if (!on && jumpCh) {
    var el = steps[jumpCh - 1];
    var go = function () { setY(getY() + el.getBoundingClientRect().top - navH()); };
    go(); addEventListener('load', go);
  }
})();
