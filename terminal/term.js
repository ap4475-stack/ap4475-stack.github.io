/* AP terminal: the alternate mode of the site. Plain JS, no dependencies.
   Safety: every piece of output is built with DOM nodes and textContent, never
   innerHTML, so typed or linked text is always shown as text. */
(() => {
  clearTimeout(window.__failsafe);
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const log = $('#log');
  const input = $('#cmd');
  const form = $('#prompt');
  const caret = $('.caret');
  const status = $('#status');
  const detailR = $('#detail-r');
  const rows = $$('.ledger tbody tr');
  const exhibits = $$('.ex');

  // Projects read from the ledger, so the HTML stays the single source.
  const P = rows.map((tr) => ({
    id: tr.dataset.id,
    letter: tr.cells[0].textContent.trim(),
    name: tr.querySelector('.row').textContent.trim(),
    type: tr.querySelector('.c-type').textContent.trim(),
    metric: tr.querySelector('.num').textContent.trim(),
    status: tr.querySelector('.st').textContent.trim(),
  }));
  let current = null;

  /* ---------- output helpers ---------- */
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    kids.flat().forEach((k) => el.append(k instanceof Node ? k : document.createTextNode(k)));
    return el;
  };
  const cmdLink = (label, cmd) => h('button', { type: 'button', class: 'lnk', onclick: () => run(cmd || label) }, label);
  const entry = (cmd) => {
    const e = h('div', { class: 'entry' });
    if (cmd != null) e.append(h('p', { class: 'echo' }, h('b', { 'aria-hidden': 'true' }, 'AP>'), h('span', { class: 'sr' }, 'command: '), cmd));
    log.append(e);
    return e;
  };
  const out = (e, ...kids) => { const p = h('p', { class: 'out' }, ...kids); e.append(p); return p; };
  const scrollLog = () => { log.scrollTop = log.scrollHeight; };
  const trim = () => { while (log.children.length > 40) log.firstElementChild.remove(); };

  /* ---------- selection ---------- */
  const resolve = (q) => {
    q = (q || '').trim().toLowerCase();
    if (!q) return null;
    return P.find((p) => p.id === q || p.name.toLowerCase() === q || p.letter.toLowerCase() === q)
      || P.find((p) => p.id.startsWith(q) || p.name.toLowerCase().startsWith(q))
      || (/^[1-6]$/.test(q) ? P[+q - 1] : null);
  };
  const replay = (ex) => { ex.classList.remove('play'); void ex.offsetWidth; ex.classList.add('play'); };
  const select = (id, { play = true, scroll = false } = {}) => {
    const p = P.find((x) => x.id === id);
    if (!p) return;
    rows.forEach((tr) => {
      const on = tr.dataset.id === id;
      tr.classList.toggle('sel', on);
      const a = tr.querySelector('.row');
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    exhibits.forEach((ex) => { ex.hidden = ex.dataset.id !== id; });
    const ex = $(`#ex-${id}`);
    if (play && current !== id) replay(ex);
    current = id;
    detailR.textContent = `${p.letter} · ${p.name}`;
    status.textContent = `Showing exhibit ${p.letter}, ${p.name}`;
    if (scroll) reveal($('#detail'));
  };
  const reveal = (el) => {
    const r = el.getBoundingClientRect();
    if (r.top < 60 || r.top > innerHeight * 0.6) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  const flash = (el) => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };

  /* ---------- theme ---------- */
  const themeBtn = $('.chips [data-cmd="theme"]');
  const curTheme = () => root.dataset.theme || 'dark';
  const setTheme = (t) => {
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) {}
    $('meta[name="theme-color"]').content = t === 'light' ? '#f6f8fa' : '#0b0e11';
    themeBtn.setAttribute('aria-label', `theme: switch to ${t === 'dark' ? 'light' : 'dark'} theme`);
  };
  setTheme(curTheme());

  /* ---------- commands ---------- */
  const HELP = [
    ['help', 'this list'],
    ['ls', 'list the six projects'],
    ['open lobkit', 'show an exhibit (name, letter A to F, or 1 to 6)'],
    ['plot calibration', "draw lobkit's reliability diagram, print the bins"],
    ['whoami', 'school, degree, what I am looking for'],
    ['contact', 'how to reach me'],
    ['theme', 'switch dark and light'],
    ['classic', 'open the classic one-page site'],
    ['clear', 'clear this log'],
  ];
  const BINS = [ // predicted, observed, n: lobkit STATUS.md, 2026-09-02
    [0.014, 0.044, 9518], [0.143, 0.221, 231], [0.238, 0.286, 98], [0.346, 0.364, 44],
    [0.449, 0.515, 33], [0.634, 0.600, 15], [0.752, 0.722, 18],
  ];
  const cmds = {
    help(e) {
      const t = h('table', { class: 'otab' }, h('tbody', {}, HELP.map(([c, d]) => h('tr', {}, h('td', {}, cmdLink(c)), h('td', { class: 'm', style: 'text-align:left' }, d)))));
      e.append(t);
      out(e, h('span', { class: 'm' }, 'Keys: / focus prompt · ↑ ↓ in the ledger · 1 to 4 jump to a pane · Tab completes'));
    },
    ls(e) {
      const t = h('table', { class: 'otab' },
        h('thead', {}, h('tr', {}, ['id', 'name', 'metric', 'status'].map((x) => h('th', { scope: 'col' }, x)))),
        h('tbody', {}, P.map((p) => h('tr', {}, h('td', {}, p.letter), h('td', { style: 'text-align:left' }, cmdLink(p.name, `open ${p.id}`)), h('td', {}, p.metric), h('td', { class: p.status === 'live' ? 'up' : 'm' }, p.status)))));
      e.append(t);
      flash($('#ledger'));
    },
    open(e, arg) {
      if (!arg) { out(e, 'usage: open <project>. Try ', cmdLink('open lobkit'), '.'); return; }
      const p = resolve(arg);
      if (!p) { out(e, `no project "${arg}". Try `, cmdLink('ls'), '.').classList.add('err'); return; }
      select(p.id, { scroll: true });
      out(e, `opened ${p.letter} · ${p.name} `, h('span', { class: 'm' }, `${p.type} · ${p.metric}`));
    },
    plot(e, arg) {
      const a = (arg || '').toLowerCase();
      if (a && /^(roles|firms|quant)/.test(a)) { select('quant-roles', { scroll: true }); out(e, 'plotted roles per firm, top 9 of 26, Aug 28 snapshot'); return; }
      if (a && !/^calib/.test(a)) { out(e, `unknown plot "${arg}". Try `, cmdLink('plot calibration'), ' or ', cmdLink('plot roles'), '.').classList.add('err'); return; }
      const ex = $('#ex-lobkit');
      select('lobkit', { scroll: true, play: false });
      replay(ex);
      out(e, 'lobkit fill calibration · 9,995 orders · 209 markets · snapshot 2026-09-02');
      e.append(h('table', { class: 'otab' },
        h('thead', {}, h('tr', {}, ['bin', 'pred', 'obs', 'n', 'obs-pred'].map((x) => h('th', { scope: 'col' }, x)))),
        h('tbody', {}, BINS.map(([p, o, n], i) => h('tr', {},
          h('td', {}, String(i + 1)), h('td', {}, p.toFixed(3)), h('td', {}, o.toFixed(3)), h('td', {}, n.toLocaleString('en-US')),
          h('td', { class: o > p ? 'up' : 'm' }, (o - p >= 0 ? '+' : '−') + Math.abs(o - p).toFixed(3)))))));
      out(e, h('span', { class: 'm' }, '5 of 7 bins sit above y = x: the model under-predicts fills. Worst gap in bins with n ≥ 25: 0.078.'));
    },
    whoami(e) {
      out(e, 'Aviv Pinto · Columbia University · BA Mathematics and Statistics · class of 2028');
      out(e, h('span', { class: 'm' }, 'seeking '), 'Summer 2027 quant trading and research internships');
      const w = $('#whoami'); flash(w); reveal(w);
    },
    contact(e) {
      out(e, 'GitHub: ', h('a', { href: 'https://github.com/ap4475-stack', rel: 'noopener' }, 'github.com/ap4475-stack ↗'));
      out(e, h('span', { class: 'm' }, 'Code walkthroughs of the private projects are available on request.'));
      flash($('#whoami'));
    },
    theme(e, arg) {
      const t = arg === 'light' || arg === 'dark' ? arg : (curTheme() === 'dark' ? 'light' : 'dark');
      setTheme(t);
      out(e, `theme: ${t}`);
    },
    classic(e) {
      out(e, 'opening the ', h('a', { href: '../' }, 'classic site'));
      setTimeout(() => { location.href = '../'; }, reduce ? 0 : 350);
    },
    clear() { log.replaceChildren(); },
  };
  const alias = { '?': 'help', list: 'ls', dir: 'ls', cd: 'open', show: 'open', about: 'whoami', me: 'whoami', email: 'contact', github: 'contact', cls: 'clear', home: 'classic' };

  const history = [];
  let hIdx = 0;
  function run(raw, { echo = true } = {}) {
    const line = String(raw).trim().replace(/\s+/g, ' ');
    if (!line) return;
    history.push(line); hIdx = history.length;
    let [name, ...rest] = line.split(' ');
    name = name.toLowerCase();
    name = alias[name] || name;
    const arg = rest.join(' ');
    if (name === 'clear') { cmds.clear(); return; }
    const e = entry(echo ? line : null);
    // A bare project name opens it.
    if (!cmds[name] && resolve(line) && line.length > 1) { cmds.open(e, line); }
    else if (cmds[name]) cmds[name](e, arg);
    else { out(e, `command not found: ${name}. Type `, cmdLink('help'), '.').classList.add('err'); }
    trim();
    // Show the start of a long answer, otherwise stick to the bottom.
    if (e.isConnected && e.offsetHeight > log.clientHeight) log.scrollTop = e.offsetTop - 6; else scrollLog();
  }

  /* ---------- prompt ---------- */
  let cw = 0;
  const measure = () => {
    const c = document.createElement('canvas').getContext('2d');
    c.font = getComputedStyle(input).font;
    cw = c.measureText('0000000000').width / 10;
  };
  const moveCaret = () => {
    if (!cw) measure();
    const i = input.selectionStart ?? input.value.length;
    const x = Math.min(i * cw - input.scrollLeft, input.clientWidth - 8);
    caret.style.setProperty('--cx', `${Math.max(0, x)}px`);
    // restart the blink so the caret is solid while typing
    caret.style.animation = 'none'; void caret.offsetWidth; caret.style.animation = '';
  };
  ['input', 'keyup', 'click', 'focus', 'select'].forEach((ev) => input.addEventListener(ev, moveCaret));
  if (document.fonts) document.fonts.ready.then(() => { measure(); moveCaret(); });

  const completions = () => [...HELP.map(([c]) => c.split(' ')[0]), 'plot calibration', 'plot roles', ...P.map((p) => `open ${p.id}`)];
  form.addEventListener('submit', (ev) => { ev.preventDefault(); const v = input.value; input.value = ''; moveCaret(); run(v); });
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowUp' && history.length) { ev.preventDefault(); hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx]; }
    else if (ev.key === 'ArrowDown' && history.length) { ev.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; }
    else if (ev.key === 'Escape') { input.value = ''; }
    else if (ev.key === 'Tab' && input.value.trim()) {
      const v = input.value.toLowerCase();
      const m = [...new Set(completions())].filter((c) => c.startsWith(v) && c !== v);
      if (m.length) { ev.preventDefault(); input.value = m.length === 1 ? m[0] : m.reduce((a, b) => { let i = 0; while (a[i] && a[i] === b[i]) i++; return a.slice(0, i); }); }
    } else return;
    requestAnimationFrame(moveCaret);
  });

  /* ---------- buttons, rows, keys ---------- */
  $$('[data-cmd]').forEach((el) => el.addEventListener('click', (ev) => { ev.preventDefault(); run(el.dataset.cmd); }));
  rows.forEach((tr, i) => {
    const a = tr.querySelector('.row');
    tr.addEventListener('click', (ev) => { ev.preventDefault(); run(`open ${tr.dataset.id}`); });
    a.addEventListener('keydown', (ev) => {
      const k = ev.key;
      let j = null;
      if (k === 'ArrowDown' || k === 'j') j = Math.min(rows.length - 1, i + 1);
      else if (k === 'ArrowUp' || k === 'k') j = Math.max(0, i - 1);
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = rows.length - 1;
      if (j === null) return;
      ev.preventDefault();
      rows[j].querySelector('.row').focus();
      select(rows[j].dataset.id);
    });
  });
  const panes = { 1: () => ($('.ledger tr.sel .row') || $('.ledger .row')), 2: () => $('#detail'), 3: () => $('#whoami'), 4: () => log };
  $$('.pane').forEach((p) => { if (!p.hasAttribute('tabindex')) p.setAttribute('tabindex', '-1'); });
  document.addEventListener('keydown', (ev) => {
    const t = ev.target;
    if (ev.metaKey || ev.ctrlKey || ev.altKey || t === input || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (ev.key === '/') { ev.preventDefault(); input.focus(); }
    else if (panes[ev.key]) { ev.preventDefault(); const el = panes[ev.key](); el.focus(); flash(el.closest('.pane') || el); }
  });

  /* ---------- calibration readout ---------- */
  const readout = $('#readout');
  $$('#ex-lobkit .pt').forEach((pt, i) => {
    const show = () => {
      $$('#ex-lobkit .pt').forEach((x) => x.classList.toggle('on', x === pt));
      readout.replaceChildren(`bin ${i + 1} · predicted `, h('b', {}, pt.dataset.p), ' · observed ', h('b', {}, pt.dataset.o), ' · n ', h('b', {}, pt.dataset.n));
    };
    pt.addEventListener('mouseenter', show);
    pt.addEventListener('click', show);
  });

  /* ---------- ticker ---------- */
  const track = $('.tick-track');
  const clone = track.cloneNode(true);
  [...clone.children].forEach((li) => { li.setAttribute('aria-hidden', 'true'); track.append(li); });
  requestAnimationFrame(() => {
    track.style.setProperty('--dur', `${Math.round(track.scrollWidth / 2 / 45)}s`);
    if (!reduce) track.classList.add('run');
  });
  const tbtn = $('.tick-toggle');
  tbtn.addEventListener('click', () => {
    const paused = $('.ticker').classList.toggle('paused');
    tbtn.setAttribute('aria-pressed', String(paused));
    tbtn.setAttribute('aria-label', paused ? 'Play the ticker' : 'Pause the ticker');
    tbtn.textContent = paused ? '▶' : '❚❚';
  });

  /* ---------- boot ---------- */
  const BOOT = [
    'AP terminal · Aviv Pinto · Columbia Math and Stats, class of 2028',
    '6 exhibits loaded, A to F. Numbers trace to each project\'s files.',
  ];
  const params = new URLSearchParams(location.search);
  // Deep links: ?cmd=open%20lobkit (several with ";"). Only read-only commands
  // run from a URL: a link can never switch the theme, clear the log or
  // navigate away. Anything else is echoed as plain text and refused.
  const URL_SAFE = new Set(['help', 'ls', 'open', 'plot', 'whoami', 'contact']);
  const urlCmd = (c) => {
    const e = entry(c);
    out(e, 'not run from a link: ', h('code', {}, c), '. Type it at the prompt, or try ', cmdLink('help'), '.').classList.add('err');
  };
  const runFromUrl = (c) => {
    const n = c.split(' ')[0].toLowerCase();
    const name = alias[n] || n;
    if (URL_SAFE.has(name) || (!cmds[name] && resolve(c))) run(c); else urlCmd(c);
  };
  const queued = (params.get('cmd') || '').slice(0, 200).split(';').map((s) => s.trim().replace(/\s+/g, ' ').slice(0, 60)).filter(Boolean).slice(0, 4);
  const finish = () => {
    const e = entry(null);
    out(e, 'type ', cmdLink('help'), ', or pick a row. Press / to focus the prompt.');
    log.setAttribute('aria-busy', 'false');
    queued.forEach(runFromUrl);
    scrollLog();
  };
  select('lobkit', { play: false });
  log.replaceChildren();
  // Deep links (?cmd=) and reduced motion land instantly, with no boot sequence.
  if (reduce || queued.length) {
    const e = entry(null);
    BOOT.forEach((l) => out(e, l).classList.add('m'));
    finish();
    return;
  }
  log.setAttribute('aria-busy', 'true');
  root.classList.add('boot');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.classList.remove('boot'); root.classList.add('booted');
    setTimeout(() => replay($(`#ex-${current}`)), 250);
    // Failsafe: drop the entrance classes so panes can never stay hidden.
    setTimeout(() => root.classList.remove('booted'), 1800);
  }));
  const e = entry(null);
  let li = 0;
  const typeLine = () => {
    if (li >= BOOT.length) { $$('.typing', log).forEach((x) => x.classList.remove('typing')); finish(); return; }
    const p = out(e, ''); p.classList.add('m', 'typing');
    const text = BOOT[li]; let c = 0;
    const step = () => {
      c = Math.min(text.length, c + 3);
      p.textContent = text.slice(0, c);
      if (c < text.length) setTimeout(step, 12);
      else { p.classList.remove('typing'); li++; setTimeout(typeLine, 90); }
    };
    step();
  };
  setTimeout(typeLine, 200);
})();
