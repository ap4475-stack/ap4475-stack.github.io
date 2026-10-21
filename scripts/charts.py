"""Generate the inline SVG charts in index.html from source data.

Run: python3 scripts/charts.py
It rewrites everything between <!-- chart:NAME --> and <!-- /chart:NAME --> in index.html.
Sources are listed in docs/CONTENT.md.
"""
import math
import pathlib
import re

# lobkit fill calibration, ~/work/kalshibot/STATUS.md (2026-09-02)
BINS = [  # predicted, n, observed
    (0.014, 9518, 0.044), (0.143, 231, 0.221), (0.238, 98, 0.286),
    (0.346, 44, 0.364), (0.449, 33, 0.515), (0.634, 15, 0.600), (0.752, 18, 0.722),
]

# quant-roles, QUANT-ROLES.md snapshot of Aug 28 (top 9 of 26 firms incl. a tie at 5, 144 roles)
FIRMS = [("Jump Trading", 29), ("IMC Trading", 18), ("Point72", 12), ("AQR", 12),
         ("Virtu Financial", 8), ("Tower Research", 8), ("DV Trading", 8), ("Qube RT", 5), ("Flow Traders", 5)]


def calibration(w=420, h=420, pad=44, top=0.8):
    sx = lambda v: pad + v / top * (w - pad - 12)
    sy = lambda v: h - pad - v / top * (h - pad - 12)
    out = [f'<svg class="chart calib" viewBox="0 0 {w} {h}" role="img" aria-labelledby="calib-t calib-d">',
           '<title id="calib-t">lobkit fill calibration</title>',
           '<desc id="calib-d">Predicted versus observed fill rate in seven bins. Five of seven bins sit above the diagonal, so the model '
           'under-predicts fills; the worst gap among bins with at least 25 orders is 0.078.</desc>']
    for t in (0, 0.2, 0.4, 0.6, 0.8):
        out.append(f'<line class="grid" x1="{sx(0):.1f}" y1="{sy(t):.1f}" x2="{sx(top):.1f}" y2="{sy(t):.1f}"/>')
        out.append(f'<line class="grid" x1="{sx(t):.1f}" y1="{sy(0):.1f}" x2="{sx(t):.1f}" y2="{sy(top):.1f}"/>')
        out.append(f'<text class="tick" x="{sx(t):.1f}" y="{h - pad + 18:.1f}" text-anchor="middle">{t:.1f}</text>')
        out.append(f'<text class="tick" x="{pad - 8:.1f}" y="{sy(t) + 4:.1f}" text-anchor="end">{t:.1f}</text>')
    out.append(f'<line class="diag" x1="{sx(0):.1f}" y1="{sy(0):.1f}" x2="{sx(top):.1f}" y2="{sy(top):.1f}"/>')
    d = "M" + " L".join(f"{sx(p):.1f},{sy(o):.1f}" for p, _, o in BINS)
    out.append(f'<path class="curve" d="{d}" pathLength="1"/>')
    for i, (p, n, o) in enumerate(BINS):
        r = 3 + 1.6 * math.log10(n)
        out.append(f'<circle class="pt" style="--i:{i}" cx="{sx(p):.1f}" cy="{sy(o):.1f}" r="{r:.1f}">'
                   f'<title>predicted {p:.3f}, observed {o:.3f}, n = {n:,}</title></circle>')
    out.append(f'<text class="axis" x="{(sx(0) + sx(top)) / 2:.1f}" y="{h - 6}" text-anchor="middle">predicted fill probability</text>')
    out.append(f'<text class="axis" transform="translate(12 {(sy(0) + sy(top)) / 2:.1f}) rotate(-90)" text-anchor="middle">observed</text>')
    out.append(f'<text class="note" x="{sx(0.46):.1f}" y="{sy(0.36):.1f}">y = x</text>')
    p0, n0, o0 = BINS[0]
    out.append(f'<text class="note" x="{sx(p0) + 24:.1f}" y="{sy(o0) - 22:.1f}">n = {n0:,}: under-predicts at the low end</text>')
    out.append('</svg>')
    return "\n".join(out)


def firms(w=420, row=30, label=132):
    h = row * len(FIRMS) + 8
    mx = max(c for _, c in FIRMS)
    out = [f'<svg class="chart bars" viewBox="0 0 {w} {h}" role="img" aria-labelledby="firms-t">',
           '<title id="firms-t">Roles per firm, top 9 of 26 including a tie, Aug 28 snapshot</title>']
    for i, (name, c) in enumerate(FIRMS):
        y = i * row + 4
        bw = (w - label - 40) * c / mx
        out.append(f'<text class="tick" x="{label - 10}" y="{y + 17}" text-anchor="end">{name}</text>')
        out.append(f'<rect class="bar" style="--i:{i}" x="{label}" y="{y + 5}" width="{bw:.1f}" height="16" rx="3"/>')
        out.append(f'<text class="val" x="{label + bw + 8:.1f}" y="{y + 17}">{c}</text>')
    out.append('</svg>')
    return "\n".join(out)


if __name__ == "__main__":
    page = pathlib.Path(__file__).resolve().parent.parent / "index.html"
    html = page.read_text()
    for name, fn in (("calibration", calibration), ("firms", firms)):
        pattern = re.compile(rf"<!-- chart:{name} -->.*?<!-- /chart:{name} -->", re.S)
        if not pattern.search(html):
            raise SystemExit(f"marker chart:{name} not found in index.html")
        html = pattern.sub(lambda _: f"<!-- chart:{name} -->\n{fn()}\n<!-- /chart:{name} -->", html)
    page.write_text(html)
    print("charts written to", page)
