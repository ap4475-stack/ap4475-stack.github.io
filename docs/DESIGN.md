# DESIGN (owned by @design)

## Concept: "Predicted vs. observed"

The site is a research notebook. Each project is an **exhibit**: a claim on one side and its instrument on the other. Instruments include a chart, a timeline, a diagram or a live capture. The thesis is that Aviv shows the evidence and the limit, not just the result.

- **Signature motif:** the y = x calibration line. The hero is lobkit's real reliability diagram: seven bins and 9,995 orders, drawn on scroll.
- **Exhibits A to F** alternate text and visual left and right. Each visual is honest about what it is:
  - A, lobkit: a diverging bar for the leakage control, plus a red "stated limit" panel (real data).
  - B, CallIt: the live landing page in a phone frame (a real capture, with its date).
  - C, Nudge: the reminder cadence track and a chat mockup with tool-call chips. It is labeled a mockup; the tool names are real.
  - D, quant-roles: roles per firm, as bars from the Aug 28 snapshot (real data).
  - E, Orchestra: the four-tier stack with the depth cap (real structure).
  - F, Research Agent: the codebase's four rules as type.
- Charts are inline SVG generated from data by `scripts/charts.py`, themed by CSS tokens, so they work in dark and light.

Inspiration: Scrolltide's Tide and KAEL-9 (hairlines, tracked mono labels, spec lists), Ariel Ben Avi's ledger density, and Yuval Gerber's metrics. Scrolltide's full prompts are paywalled, so only the public summaries were used.

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
| `--neg` | `#ef5350` (only for real negative or limit) | `#c62828` |

## Type
- Space Grotesk 500/600 for headings (hero up to 5.25rem).
- Inter for body.
- JetBrains Mono for numbers, labels, chips and charts (tabular-nums, ligatures off in code).

## Motion
- Exhibits rise 12px as they reveal.
- The calibration curve draws, then the dots appear in order.
- Bars grow from zero, and leakage bars grow from the zero axis.
- All of this happens only under `html.js` and `prefers-reduced-motion: no-preference`.

## Rules
- Mockups say "Mockup", and captures carry their date.
- Red appears only for a real negative number or a stated limit.
- No glow, gradients, carousels or scroll-jacking.
- Every exhibit must work at 360px.
