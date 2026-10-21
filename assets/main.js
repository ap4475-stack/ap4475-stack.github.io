(() => {
  clearTimeout(window.__failsafe);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  // Theme toggle, remembered per viewer.
  const toggle = document.querySelector('.theme');
  const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const label = () => { if (toggle) toggle.setAttribute('aria-label', `Switch to ${current() === 'dark' ? 'light' : 'dark'} theme`); };
  label();
  if (toggle) toggle.addEventListener('click', () => {
    root.dataset.theme = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    label();
  });

  // Count a metric up from zero to its printed value.
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const dp = parseInt(el.dataset.dp || '0', 10);
    const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 800, 1);
      el.textContent = fmt(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Reveal on scroll, staggered within the hero and the grid.
  // The hero is the signature: show it at once rather than waiting for the observer.
  document.querySelectorAll('.hero .reveal').forEach((el) => el.classList.add('in'));
  const reveals = document.querySelectorAll('.reveal:not(.in)');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in', 'done'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
        el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 5) * 60}ms`;
        el.classList.add('in');
        // Drop the stagger delay once revealed so hover stays snappy.
        setTimeout(() => { el.style.transitionDelay = ''; el.classList.add('done'); }, 800);
        el.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(el);
      });
    }, { threshold: 0.15 });
    reveals.forEach((el) => io.observe(el));
  }

  // Highlight the nav link of the section in view; none over the hero, Contact at the bottom.
  const links = new Map([...document.querySelectorAll('.nav nav a')].map((a) => [a.hash.slice(1), a]));
  const setActive = (id) => links.forEach((a, key) => a.classList.toggle('active', key === id));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.classList.contains('hero') ? null : entry.target.id);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  const hero = document.querySelector('.hero');
  if (hero) spy.observe(hero);
  addEventListener('scroll', () => {
    if (innerHeight + scrollY >= document.body.scrollHeight - 4) setActive('contact');
  }, { passive: true });
})();
