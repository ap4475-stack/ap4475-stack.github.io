// v3-field (@field): pen-plotter reveal for the instruments in sites 05 to 07.
// The SVGs are baked into the partial and fully visible without this file.
// This script only hides strokes (adds .fd-armed) and then draws them (.fd-on) when a plot
// enters view or its site becomes active ('atlas:site' from site.js).
(() => {
  const SITES = ['reservoir', 'settlements', 'survey-office'];
  const sections = SITES.map((id) => document.querySelector(`[data-site="${id}"]`)).filter(Boolean);
  if (!sections.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const plots = sections.flatMap((s) => [...s.querySelectorAll('.fd-plot')]);
  const vh = () => window.innerHeight || document.documentElement.clientHeight;

  const draw = (plot) => {
    if (plot.classList.contains('fd-on')) return;
    plot.classList.add('fd-on');
    // After the last stroke lands, drop the dash trick so dashed lines and resizes behave.
    const n = plot.querySelectorAll('.fd-pen').length;
    const total = 1200 + Math.min(n, 60) * 70 + 400;
    setTimeout(() => plot.classList.add('fd-done'), total);
  };

  // Arm only plots that are not on screen yet, so nothing visible blinks out.
  plots.forEach((p) => {
    const r = p.getBoundingClientRect();
    if (r.top < vh() && r.bottom > 0) return;
    p.classList.add('fd-armed');
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      draw(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  plots.forEach((p) => { if (p.classList.contains('fd-armed')) io.observe(p); });

  window.addEventListener('atlas:site', (ev) => {
    const id = ev.detail && ev.detail.id;
    const sec = sections.find((s) => s.dataset.site === id);
    if (!sec) return;
    // Draw the plots of the active site that are already in or near view.
    sec.querySelectorAll('.fd-plot.fd-armed').forEach((p) => {
      const r = p.getBoundingClientRect();
      if (r.top < vh() * 1.1 && r.bottom > -vh() * 0.1) { draw(p); io.unobserve(p); }
    });
  });
})();
