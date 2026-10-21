(() => {
  clearTimeout(window.__failsafe);
  const root = document.documentElement;

  // Theme toggle ("night survey"), remembered per viewer.
  const toggle = document.querySelector('.atlas-nav .theme');
  const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const label = () => toggle && toggle.setAttribute('aria-label', current() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  label();
  if (toggle) toggle.addEventListener('click', () => {
    root.dataset.theme = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme-v3', root.dataset.theme); } catch (e) {}
    label();
  });

  // Tell every lane which site is in view: sets data-active on <html> and fires 'atlas:site'.
  const sites = [...document.querySelectorAll('[data-site]')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = e.target.dataset.site;
      if (root.dataset.active === id) return;
      root.dataset.active = id;
      window.dispatchEvent(new CustomEvent('atlas:site', { detail: { id, index: sites.indexOf(e.target) } }));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sites.forEach((s) => io.observe(s));
})();
