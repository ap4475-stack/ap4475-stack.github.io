# DESIGN (owned by @design)

Direction: an editorial, terminal-style dark page. It combines Ariel Ben Avi's dense project ledger, Yuval Gerber's metrics row, and the hairline rules, tracked mono labels and spec lists of Scrolltide's Tide and KAEL-9 templates. No cinematic frame-scrub, because it reads as an agency site rather than a quant's.

Scrolltide note: the full template prompts are paywalled ($299 "Unlimited"). Only the summaries were studied, and none of their code is used.

## Tokens

| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#0b0e11` | `#f6f8fa` |
| `--panel` | `#131722` | `#ffffff` |
| `--surface` | `#1b2230` | `#eef1f5` |
| `--line` | `#2a3345` | `#d5dbe3` |
| `--text` | `#f8fafc` | `#0b0e11` |
| `--muted` | `#94a3b8` | `#5b6676` |
| `--accent` | `#26a69a` | `#00796b` |
| `--accent-2` | `#5b8cff` (links, focus) | `#1d4ed8` |

`#2962ff` is too dark for link text on `#0b0e11`, so links lighten to `#5b8cff` in dark mode.

## Type
- Space Grotesk 500/600 for headings, Inter 400/500 for body, JetBrains Mono for numbers, labels and chips (`tabular-nums`).
- H1 `clamp(2.5rem, 6vw, 4.5rem)`. Labels are 0.75rem mono, uppercase, +0.08em tracking.
- Max width 1100px, an 8px grid, 8px radius, 1px hairlines, no shadows.

## Sections
Nav, Hero (positioning line and fact chips), Selected work (6 cards), Skills, About, Contact, Footer.

## Card anatomy
Index `01`, status tag and year. Then the name and a one-line outcome, a hairline, one big mono metric with its scope line, stack chips, and links.

## Motion
- Reveals use IntersectionObserver: 12px rise over 400ms, staggered 60ms.
- The active section's nav link is highlighted.
- Cards lift 2px on hover.
- `prefers-reduced-motion` turns all motion off.
- Content is visible with JS off: elements are hidden only under `html.js`.

## Avoid
Glow orbs, gradient heroes, skill bars, carousels, scroll-jacking, and unscoped numbers.
