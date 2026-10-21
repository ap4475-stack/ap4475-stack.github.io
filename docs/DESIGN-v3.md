# DESIGN v3: "Basin Atlas" (owned by @design, branch v3-world)

## Concept
Aviv reads surfaces. An order book, a volatility surface and an oil reservoir are all heightfields: a value over two axes. The site is **one survey map of one basin**. The visitor flies over it, and each part of Aviv's work is a **site** on that map. Every contour set encodes something real or is labeled illustrative.

It is light-first, warm paper and ink, unlike v2's dark teal terminal.

## The sites (in scroll order; `data-site` values are the contract)

| # | `data-site` | Map name | Content | Terrain feature at that spot |
|---|---|---|---|---|
| 00 | `base` | Base camp | Hero: name, thesis, CTAs | Gentle plain with a survey grid |
| 01 | `live-field` | The Live Field | Kalshi trading bot plus the lobkit order-book simulator | Twin ridges: bid depth vs ask depth along a price axis |
| 02 | `fault-lines` | Fault Lines | ML statistical arbitrage (Krauss reproduction) | Ridged faults: long linear scarps |
| 03 | `cone` | The Cone | SPAC warrant pricer (Monte Carlo) | A fan or cone that widens away from a point |
| 04 | `pipeline` | The Pipeline | Low-latency order management client | Flat ground cut by straight channels |
| 05 | `reservoir` | The Reservoir | Lionheart Capital: SPACs, upstream oil & gas, internal databases | An anticline dome (a classic oil trap) |
| 06 | `settlements` | Settlements | quant-universe.com, CallIt, other builds | Low hills with map pins |
| 07 | `survey-office` | Survey Office | Unit 142, education and honors, skills, contact | A flat plain with the legend and colophon |

Each site carries a grid reference label such as `SITE 01 · GRID C4`. Use no real-world coordinates, and never anything military.

## Tokens (`assets/v3/base.css` defines them; lanes only consume them)

Revised on 2026-10-21 at Aviv's request. The first pass (cream paper, Fraunces serif, rust accent) read as "Claude design". The site is now a clean technical survey map: near-white paper, cool-gray contours, one cobalt accent, and green and red only inside the data.

| Token | Light (default) | Dark | Use |
|---|---|---|---|
| `--paper` | `#FBFBFA` | `#0B0E13` | page background |
| `--paper-2` | `#F1F2F4` | `#131820` | insets, chips |
| `--ink` | `#0D1117` | `#E8EBEF` | text, primary button |
| `--ink-2` | `#59616E` | `#9AA3AF` | secondary text |
| `--rust` (name kept; now the accent) | `#1D4ED8` cobalt | `#7B93FF` | refs, "you are here", links |
| `--sea` | `#0F7A55` | `#3CC08A` | positive data, bids |
| `--contour` | `#DCE0E5` | `#1E252F` | minor contours, hairlines |
| `--contour-2` | `#AEB5BF` | `#384352` | index contours |
| `--warn` | `#C4122F` | `#FF6B7A` | stated limits, negatives |

Fonts (Google): **Geist** 600 with tight tracking (-0.045em) for headlines, Geist 400/500 for body, **Geist Mono** for grid refs, labels and numbers. No serif.

Shapes: 12px cards with a hairline border and a soft shadow, 8px buttons, no offset or "print" shadows.

## Motion
- One fixed WebGL canvas (`#world`) sits behind the page. It is a single large heightfield containing all eight site features at their map positions, rendered as **anti-aliased contour lines** (fwidth shader) on paper, with index contours.
- Scroll drives a **camera spline** from site to site, tilted top-down. Elevation exaggeration rises as a site's section enters, so the terrain "stands up", and settles when you leave.
- Content panels (paper cards) scroll over the world on the left. The world shows on the right on desktop. On mobile the world is a faded fixed background, and every panel is readable on its own.
- Charts and diagrams **plot in like a pen plotter** (stroke-dashoffset) when their panel enters.
- A **map legend** in the corner (keyboard-accessible list of the 8 sites) shows "you are here" and jumps on click.
- `prefers-reduced-motion`: no camera flight; static contour sheet; charts appear drawn. Without WebGL: a static SVG contour sheet.

## Honesty rules (from QA history)
- Real data comes only from `assets/v3/data/*.json` and `docs/CONTENT.md`.
- Illustrative visuals (Monte Carlo fan, decline curve, order-book ridges, FSM diagram) carry a visible "illustrative" label.
- Kalshi bot: show only facts verified against its code and data: live-trades Kalshi 15-minute Bitcoin up/down contracts; quarter-Kelly sizing under per-market exposure caps; routes against live books; monitoring dashboard; 470+ unit tests; private repo.
- Stat-arb: show only figures that appear in the public repo's README or data files. Working notes are in docs/PRIVATE.md (gitignored).
- SPAC pricer and OMS client: résumé text only (no code on disk). Visuals are illustrative.
- Lionheart: résumé wording only. No deal names, tickers, numbers or client details.
- No em dashes. No betting words.
