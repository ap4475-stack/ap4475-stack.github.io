/* The Nod, in 3D. A classic script (loads from file://) that pulls three.js through the importmap.
   Fallbacks: reduced motion or no WebGL keeps the static <img> coin and skips all of this. */
(async function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  function webglOK() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  if (!webglOK() || !window.NOD_FACE) return;

  var THREE, RoomEnvironment;
  try {
    THREE = await import('three');
    RoomEnvironment = (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment;
  } catch (e) { return; } // CDN blocked: static coin stays

  function loadImg(src) {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; });
  }
  var faceImg, logoImg;
  try { faceImg = await loadImg(window.NOD_FACE); logoImg = await loadImg(window.NOD_LOGO); } catch (e) { return; }

  var canvas = document.getElementById('stage');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;

  var scene = new THREE.Scene();
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  var camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // soft studio light: a warm key from upper left, a cool fill, no bloom
  var key = new THREE.DirectionalLight(0xfff3e6, 0.62); key.position.set(-2.5, 3.5, 10); scene.add(key);
  var fill = new THREE.DirectionalLight(0xdfe8ff, 0.25); fill.position.set(5, -2, 4); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.26));

  // face textures: draw the artwork on a coral disc so the cap's circular UVs match the coin exactly
  var maxAniso = renderer.capabilities.getMaxAnisotropy();
  function faceTexture(img, mirror) {
    var s = 1024, c = document.createElement('canvas'); c.width = c.height = s;
    var g = c.getContext('2d');
    g.fillStyle = '#E66C57'; g.fillRect(0, 0, s, s);
    if (mirror) { g.translate(s, 0); g.scale(-1, 1); }
    g.drawImage(img, 0, 0, s, s);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
    return t;
  }
  // reeded edge: a tiling normal map of vertical grooves
  function reedNormal() {
    var w = 64, h = 4, c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'), d = g.createImageData(w, h);
    for (var x = 0; x < w; x++) {
      var nx = Math.sin((x / w) * Math.PI * 2) * 0.75, nz = Math.sqrt(1 - nx * nx);
      for (var y = 0; y < h; y++) {
        var i = (y * w + x) * 4;
        d.data[i] = (nx * 0.5 + 0.5) * 255; d.data[i + 1] = 128; d.data[i + 2] = (nz * 0.5 + 0.5) * 255; d.data[i + 3] = 255;
      }
    }
    g.putImageData(d, 0, 0);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(150, 1);
    return t;
  }

  var R = 1, H = 0.13;
  var geo = new THREE.CylinderGeometry(R, R, H, 160, 1, false);
  geo.rotateX(Math.PI / 2); // axis toward the camera: group 1 (top cap) faces +z
  var edgeMat = new THREE.MeshStandardMaterial({ color: 0xc9604d, metalness: 0.6, roughness: 0.36, envMapIntensity: 0.8, normalMap: reedNormal(), normalScale: new THREE.Vector2(0.9, 0.9) });
  var frontMat = new THREE.MeshStandardMaterial({ map: faceTexture(faceImg, false), metalness: 0.1, roughness: 0.62, envMapIntensity: 0.4 });
  var backMat = new THREE.MeshStandardMaterial({ map: faceTexture(logoImg, true), metalness: 0.1, roughness: 0.62, envMapIntensity: 0.4 });
  var coin = new THREE.Mesh(geo, [edgeMat, frontMat, backMat]);
  var pivot = new THREE.Group(); pivot.add(coin); scene.add(pivot);

  // orient cap UVs so the face reads upright (three's cap UVs run with x, -z after the rotation)
  [frontMat.map, backMat.map].forEach(function (t) { t.center.set(0.5, 0.5); });
  frontMat.map.rotation = Math.PI / 2; backMat.map.rotation = -Math.PI / 2; // upright after the half turn about x

  root.classList.add('gl');

  // layout anchors
  var heroSlot = document.querySelector('[data-hero-slot]');
  var dockM = document.querySelector('[data-dock="m"]');
  var dockD = document.querySelector('[data-dock="d"]');
  var dockLabel = document.querySelector('.dock-d .now');
  var dockMLabel = document.querySelector('.dock-m .now');
  var steps = Array.prototype.slice.call(document.querySelectorAll('[data-step]'));
  var letterEls = document.querySelectorAll('[data-now-letter]');
  var nameEls = document.querySelectorAll('[data-now-name]');

  var vw = 1, vh = 1;
  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    requestFrame();
  }
  window.addEventListener('resize', resize);

  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    pointer.tx = (e.clientX / vw) * 2 - 1; pointer.ty = (e.clientY / vh) * 2 - 1;
    requestFrame();
  }, { passive: true });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rectOf(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width }; }

  var flips = 0, flipsShown = 0, spin = 0, last = performance.now(), current = -1;
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;

    // where the coin should be: hero slot, easing to the dock as the hero leaves
    var desktop = vw >= 900;
    var hero = rectOf(heroSlot);
    var dock = rectOf(desktop ? dockD : dockM);
    var k = smooth((window.scrollY - vh * 0.15) / (vh * 0.6));
    var cx = hero.x + (dock.x - hero.x) * k;
    var cy = hero.y + (dock.y - hero.y) * k;
    var dia = hero.d + (dock.d - hero.d) * k;

    // flips: each step's top crossing the viewport from 85% to 45% is one half turn
    flips = 0; var active = 0;
    for (var i = 1; i < steps.length; i++) {
      var top = steps[i].getBoundingClientRect().top;
      var t = smooth((vh * 0.85 - top) / (vh * 0.4));
      flips += t; if (t > 0.5) active = i;
    }
    flipsShown += (flips - flipsShown) * (1 - Math.exp(-dt * 10));
    var frac = flipsShown - Math.floor(flipsShown);
    var hop = Math.sin(frac * Math.PI) * 0.35; // a small toss while it turns

    if (active !== current) {
      current = active;
      var s = steps[active];
      letterEls.forEach(function (el) { el.textContent = s.dataset.letter; });
      nameEls.forEach(function (el) { el.textContent = s.dataset.name; });
    }
    if (dockLabel) dockLabel.style.opacity = k > 0.9 && current > 0 ? 1 : 0;
    if (dockMLabel) dockMLabel.style.opacity = k > 0.9 ? 1 : 0;

    // world mapping at z = 0
    var worldH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    var wpp = worldH / vh;
    pivot.position.set((cx - vw / 2) * wpp, -(cy - vh / 2) * wpp + hop * (dia / 2) * wpp, 0);
    pivot.scale.setScalar((dia / 2) * wpp * 0.96);

    // idle: a slow turn back and forth in the hero (never edge-on); it settles face-on once docked
    var idle = window.__yaw !== undefined ? window.__yaw : Math.sin(now / 2600) * 0.55;
    spin += ((k < 0.5 ? idle : 0) - spin) * (1 - Math.exp(-dt * 3));
    pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 5));
    pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 5));
    var sway = Math.sin(now / 1600) * 0.06;

    // desktop: each step is a half turn, alternating face and logo.
    // mobile: the docked coin is under 64 px, so after the first half turn every flip is a full turn and lands on the logo.
    var turn = desktop || flipsShown <= 1 ? flipsShown * Math.PI : Math.PI + (flipsShown - 1) * 2 * Math.PI;
    coin.rotation.set(turn + pointer.y * 0.28, spin + pointer.x * 0.35 + sway, 0, 'XYZ');

    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }

  var raf = 0, running = true;
  function requestFrame() { if (!raf && running) raf = requestAnimationFrame(frame); }
  window.addEventListener('scroll', requestFrame, { passive: true });
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { last = performance.now(); requestFrame(); }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  // if the user turns on reduced motion mid-visit, freeze and fall back
  reduce.addEventListener && reduce.addEventListener('change', function (e) {
    if (e.matches) { running = false; root.classList.remove('gl'); renderer.setAnimationLoop(null); canvas.style.display = 'none'; }
  });

  // review hooks for headless screenshots: ?y=1800 scrolls, ?yaw=0.7 fixes the idle turn
  var q = new URLSearchParams(location.search);
  if (q.has('y')) window.scrollTo(0, +q.get('y'));
  if (q.has('yaw')) { Object.defineProperty(window, '__yaw', { value: +q.get('yaw') }); spin = window.__yaw; }

  resize();
  requestFrame();
})();
