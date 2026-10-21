// Bakes one static figure per chapter into index.html, so the story reads
// without JavaScript and under prefers-reduced-motion.
// Run: node explorations/scrolly/build-static.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const Scene = createRequire(import.meta.url)(join(here, 'scene.js'));
// Settled moment of each chapter (end of its own animation).
const T = [0.9, 1.95, 2.98, 3.95, 4.99];
const DESC = [
  'Illustrative order book. My order, size 10, sits at the back of the 48 cent bid behind 90 contracts.',
  'Illustrative queue drain. The queue ahead empties over the 60 second horizon and the readout reaches 0.449.',
  'lobkit calibration, real data: seven bins of predicted versus observed fill rate around the y = x line. Brier 0.0502 vs 0.0539 base.',
  'Shuffled-outcome control: points fall toward the base rate and Brier skill flips from +0.069 to -0.122.',
  'The limit: 44.6% of 9,995 orders are ambiguous from L2 data alone; base rate 5.71% under the lower truth, 50.3% under the upper.'
];
const file = join(here, 'index.html');
let html = readFileSync(file, 'utf8');
T.forEach((t, i) => {
  const n = i + 1;
  const re = new RegExp(`<!-- static:${n} -->[\\s\\S]*?<!-- /static:${n} -->`);
  if (!re.test(html)) throw new Error(`marker static:${n} missing`);
  const svg = `<svg class="scene" viewBox="0 0 ${Scene.W} ${Scene.H}" role="img" aria-label="${DESC[i]}">${Scene.render(t, 's' + n)}</svg>`;
  html = html.replace(re, `<!-- static:${n} -->\n${svg}\n<!-- /static:${n} -->`);
});
writeFileSync(file, html);
console.log('static figures written to', file);
