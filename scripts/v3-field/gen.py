"""Bake the static SVG instruments for partials/v3-field.html.

Run: python3 gen.py  (reads partial.tpl.html next to this file, writes the partial)
Every stroke the plotter draws is a <path pathLength="100" class="fd-pen">.
"""
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent.parent / "partials" / "v3-field.html"


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


class Svg:
    def __init__(self, w, h, label, cls):
        self.w, self.h, self.label, self.cls, self.parts, self.i = w, h, label, cls, [], 0

    def pen(self, d, cls, step=True):
        self.parts.append(f'<path class="fd-pen {cls}" pathLength="100" style="--i:{self.i}" d="{d}"/>')
        if step:
            self.i += 1

    def fill(self, d, cls):
        self.parts.append(f'<path class="fd-fade {cls}" style="--i:{self.i}" d="{d}"/>')

    def text(self, x, y, s, cls="", anchor="start"):
        a = "" if anchor == "start" else f' text-anchor="{anchor}"'
        self.parts.append(f'<text class="fd-fade {cls}" style="--i:{self.i}" x="{f(x)}" y="{f(y)}"{a}>{s}</text>')

    def box(self, x, y, w, h, lines, cls="s-ink", tcls="t-sans t-ink", pad_fill=True):
        if pad_fill:
            self.parts.append(f'<rect class="f-box" x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}"/>')
        self.pen(f"M{f(x)} {f(y)}h{f(w)}v{f(h)}h{f(-w)}Z", cls)
        n = len(lines)
        for k, ln in enumerate(lines):
            self.text(x + w / 2, y + h / 2 + (k - (n - 1) / 2) * 15 + 4.5, ln, tcls, "middle")

    def arrow(self, pts, cls="s-ink2"):
        """Cubic connector from p0 to p1 (horizontal or vertical tangent) with a chevron head."""
        (x0, y0), (x1, y1), orient = pts
        if orient == "h":
            mx = (x0 + x1) / 2
            d = f"M{f(x0)} {f(y0)}C{f(mx)} {f(y0)} {f(mx)} {f(y1)} {f(x1)} {f(y1)}"
            head = f"M{f(x1-6)} {f(y1-4)}L{f(x1)} {f(y1)}L{f(x1-6)} {f(y1+4)}"
        else:
            my = (y0 + y1) / 2
            d = f"M{f(x0)} {f(y0)}C{f(x0)} {f(my)} {f(x1)} {f(my)} {f(x1)} {f(y1)}"
            head = f"M{f(x1-4)} {f(y1-6)}L{f(x1)} {f(y1)}L{f(x1+4)} {f(y1-6)}"
        self.pen(d, cls, step=False)
        self.pen(head, cls)

    def render(self):
        body = "\n    ".join(self.parts)
        return (f'<svg class="fd-svg {self.cls}" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" '
                f'role="img" aria-label="{self.label}">\n    {body}\n  </svg>')


# ---------- (a) decline curve: Arps hyperbolic, made-up parameters ----------
QI, DI, B, RAMP, TMAX = 100.0, 0.06, 0.9, 4, 60
DECKS = [("high deck", 1.3), ("base deck", 1.0), ("low deck", 0.75)]


def rate(t):
    if t < RAMP:
        return QI * t / RAMP
    return QI / (1 + B * DI * (t - RAMP)) ** (1 / B)


def decline(w, h, cls):
    label = ("Illustrative chart: revenue from one well over 60 months on production. A short ramp, then an Arps "
             "hyperbolic decline, priced under a high, base and low commodity deck. Made-up parameters, not deal data.")
    s = Svg(w, h, label, cls)
    l, r, t, b = 44, w - 78, 18, h - 40
    ymax = 140.0
    X = lambda m: l + (r - l) * m / TMAX
    Y = lambda v: b - (b - t) * v / ymax
    # grid
    for m in range(0, TMAX + 1, 12):
        s.pen(f"M{f(X(m))} {f(t)}V{f(b)}", "s-grid", step=False)
        s.text(X(m), b + 16, str(m), "", "middle")
    for v in (50, 100):
        s.pen(f"M{f(l)} {f(Y(v))}H{f(r)}", "s-grid", step=False)
        s.text(l - 8, Y(v) + 4, str(v), "", "end")
    s.i += 1
    s.pen(f"M{f(l)} {f(t)}V{f(b)}H{f(r)}", "s-ink")
    s.text((l + r) / 2, h - 6, "months on production", "", "middle")
    s.text(l - 34, t - 4, "revenue index", "")
    steps = [i / 2 for i in range(0, TMAX * 2 + 1)]
    curves = {name: [(X(m), Y(rate(m) * p)) for m in steps] for name, p in DECKS}
    hi, lo = curves["high deck"], curves["low deck"]
    band = "M" + "L".join(f"{f(x)} {f(y)}" for x, y in hi) + "L" + "L".join(f"{f(x)} {f(y)}" for x, y in reversed(lo)) + "Z"
    s.fill(band, "f-band")
    ly = []
    for name, p in DECKS:
        y = curves[name][-1][1]
        if ly and y < ly[-1] + 14:
            y = ly[-1] + 14
        ly.append(y)
    for (name, p), y in zip(DECKS, ly):
        pts = curves[name]
        d = "M" + "L".join(f"{f(x)} {f(y)}" for x, y in pts)
        s.pen(d, "s-rust w2" if name == "base deck" else "s-sea")
        s.text(r + 6, y + 4, name, "t-ink" if name == "base deck" else "")
    # annotations
    s.text(X(RAMP) + 6, Y(QI * 1.3) + 4, "peak after ramp", "")
    mx = 30
    s.text(X(mx) + 6, Y(rate(mx) * 1.3) - 14, "hyperbolic decline, b = 0.9", "")
    return s.render()


# ---------- (b) deSPAC value drivers ----------
def despac_wide():
    w, h = 600, 330
    label = ("Diagram of deSPAC value drivers. Trust value per share, redemption scenarios and PIPE financing set the "
             "cash at close. Redemptions, sponsor promote, founder-share dilution and warrant overhang set the pro-forma "
             "share count. Both give value per share, which feeds sensitivity tables and the recommendation to partners. "
             "Structure only, no numbers.")
    s = Svg(w, h, label, "fd-w")
    inputs = ["Trust value per share", "Redemption scenarios", "PIPE financing",
              "Sponsor promote", "Founder-share dilution", "Warrant overhang"]
    bw, bh, gap, y0 = 172, 36, 14, 22
    s.text(0, 12, "INPUTS", "")
    ys = []
    for k, name in enumerate(inputs):
        y = y0 + k * (bh + gap)
        ys.append(y + bh / 2)
        s.box(0, y, bw, bh, [name], "s-ink2")
    mx, mw, mh = 232, 138, 46
    cash_y = (ys[0] + ys[2]) / 2 - mh / 2
    shr_y = (ys[3] + ys[5]) / 2 - mh / 2
    s.text(mx, 12, "BUILD", "")
    s.box(mx, cash_y, mw, mh, ["Cash at close"], "s-sea")
    s.box(mx, shr_y, mw, mh, ["Pro-forma shares"], "s-sea")
    for k in (0, 1, 2):
        s.arrow(((bw, ys[k]), (mx, cash_y + mh / 2 + (k - 1) * 10), "h"))
    for k in (1, 3, 4, 5):
        s.arrow(((bw, ys[k]), (mx, shr_y + mh / 2 + (k - 4) * 8), "h"))
    ox, ow = 430, 170
    vy = y0 + 34
    s.text(ox, 12, "OUTPUT", "")
    s.box(ox, vy, ow, 52, ["Value per share"], "s-rust w2", "t-sans t-ink t-strong")
    s.arrow(((mx + mw, cash_y + mh / 2), (ox, vy + 18), "h"), "s-ink2")
    s.arrow(((mx + mw, shr_y + mh / 2), (ox, vy + 34), "h"), "s-ink2")
    sy = vy + 52 + 42
    ry = sy + 46 + 42
    s.box(ox, sy, ow, 46, ["Sensitivity tables", "on each driver"], "s-ink2")
    s.box(ox, ry, ow, 46, ["Recommendation", "defended to partners"], "s-ink")
    s.arrow(((ox + ow / 2, vy + 52), (ox + ow / 2, sy), "v"))
    s.arrow(((ox + ow / 2, sy + 46), (ox + ow / 2, ry), "v"))
    return s.render()


def despac_narrow():
    w, h = 340, 470
    label = ("Diagram of deSPAC value drivers. Cash side: trust value per share, redemption scenarios, PIPE financing. "
             "Share side: sponsor promote, founder-share dilution, warrant overhang, and redemptions. Both give value per "
             "share, then sensitivity tables, then the recommendation to partners. Structure only, no numbers.")
    s = Svg(w, h, label, "fd-n")
    cw, bh, gap = 158, 36, 12
    lx, rx = 0, w - cw
    s.text(lx, 12, "CASH SIDE", "")
    s.text(rx, 12, "SHARE SIDE", "")
    left = ["Trust value per share", "Redemption scenarios", "PIPE financing"]
    right = ["Sponsor promote", "Founder-share dilution", "Warrant overhang"]
    y0 = 22
    for k in range(3):
        s.box(lx, y0 + k * (bh + gap), cw, bh, [left[k]], "s-ink2")
        s.box(rx, y0 + k * (bh + gap), cw, bh, [right[k]], "s-ink2")
    by = y0 + 3 * (bh + gap) + 26
    s.arrow(((lx + cw / 2, y0 + 3 * (bh + gap) - gap), (lx + cw / 2, by), "v"))
    s.arrow(((rx + cw / 2, y0 + 3 * (bh + gap) - gap), (rx + cw / 2, by), "v"))
    # redemptions also cut the share count
    ry = y0 + (bh + gap) + bh / 2
    s.pen(f"M{f(cw)} {f(ry)}C{f(cw+20)} {f(ry)} {f(cw+4)} {f(by-30)} {f(rx+24)} {f(by)}", "s-ink2 dash", step=False)
    s.pen(f"M{f(rx+17)} {f(by-4)}L{f(rx+24)} {f(by)}L{f(rx+25)} {f(by-8)}", "s-ink2")
    s.box(lx, by, cw, 42, ["Cash at close"], "s-sea")
    s.box(rx, by, cw, 42, ["Pro-forma shares"], "s-sea")
    vx, vw, vy = 70, 200, by + 42 + 34
    s.arrow(((lx + cw / 2, by + 42), (vx + 50, vy), "v"))
    s.arrow(((rx + cw / 2, by + 42), (vx + vw - 50, vy), "v"))
    s.box(vx, vy, vw, 46, ["Value per share"], "s-rust w2", "t-sans t-ink t-strong")
    sy = vy + 46 + 28
    s.arrow(((w / 2, vy + 46), (w / 2, sy), "v"))
    s.box(vx, sy, vw, 44, ["Sensitivity tables", "on each driver"], "s-ink2")
    ry2 = sy + 44 + 28
    s.arrow(((w / 2, sy + 44), (w / 2, ry2), "v"))
    s.box(vx, ry2, vw, 44, ["Recommendation", "defended to partners"], "s-ink")
    return s.render()


# ---------- (c) internal database schema sketch ----------
TABLES = [
    ("technical", ["asset_id", "report_source", "reserves_case", "decline_inputs"]),
    ("market", ["as_of", "commodity", "price_deck", "comps"]),
    ("counterparty", ["counterparty_id", "role", "documents", "notes"]),
]
VIEW = ("ic_memo_view", ["asset_id", "valuation_case", "price_scenario", "counterparties", "source_trail"])


def table(s, x, y, w, name, fields, cls="s-ink2", head="t-ink"):
    rh = 18
    hgt = 26 + rh * len(fields)
    s.parts.append(f'<rect class="f-box" x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(hgt)}"/>')
    s.pen(f"M{f(x)} {f(y)}h{f(w)}v{f(hgt)}h{f(-w)}Z", cls, step=False)
    s.pen(f"M{f(x)} {f(y+24)}h{f(w)}", cls)
    s.text(x + 8, y + 16, name, head + " t-strong")
    for k, fl in enumerate(fields):
        s.text(x + 8, y + 24 + rh * (k + 1) - 4, fl, "")
    return hgt


def schema_wide():
    w, h = 600, 290
    label = ("Illustrative schema sketch: three source tables, technical, market and counterparty, flow through Python "
             "jobs into one view used for IC memos. Generic field names, not the real database.")
    s = Svg(w, h, label, "fd-w")
    tw, gap = 180, 30
    hs = []
    for k, (name, fields) in enumerate(TABLES):
        hs.append(table(s, k * (tw + gap), 0, tw, name, fields))
    vx, vw, vy = 190, 220, 168
    for k in range(3):
        cx = k * (tw + gap) + tw / 2
        s.arrow(((cx, hs[k]), (vx + vw / 2 + (k - 1) * 60, vy), "v"))
    s.text(vx + vw + 14, vy + 44, "python jobs:", "")
    s.text(vx + vw + 14, vy + 60, "load, check, join", "")
    table(s, vx, vy, vw, VIEW[0], VIEW[1], "s-rust w2", "t-ink")
    return s.render()


def schema_narrow():
    w, h = 340, 330
    label = ("Illustrative schema sketch: three source tables, technical, market and counterparty, flow through Python "
             "jobs into one view used for IC memos. Generic field names, not the real database.")
    s = Svg(w, h, label, "fd-n")
    tw = 150
    y, mids = 0, []
    for name, fields in TABLES:
        hh = table(s, 0, y, tw, name, fields)
        mids.append(y + hh / 2)
        y += hh + 12
    vx, vw = 182, 158
    vh = 26 + 18 * len(VIEW[1])
    vy = (y - 12) / 2 - vh / 2
    for k, m in enumerate(mids):
        s.arrow(((tw, m), (vx, vy + vh / 2 + (k - 1) * 14), "h"))
    table(s, vx, vy, vw, VIEW[0], VIEW[1], "s-rust w2", "t-ink")
    s.text(vx, vy + vh + 20, "python jobs:", "")
    s.text(vx, vy + vh + 36, "load, check, join", "")
    return s.render()


# ---------- survey office: north arrow, scale bar, key symbols ----------
def north():
    s = Svg(56, 72, "North arrow", "fd-north")
    s.pen("M28 6L40 58L28 48L16 58Z", "s-ink")
    s.fill("M28 6L28 48L16 58Z", "f-ink")
    s.text(28, 71, "N", "t-ink t-strong", "middle")
    return s.render()


def scalebar():
    s = Svg(240, 40, "Scale bar: one site equals one screen", "fd-scale")
    for k in range(4):
        x = 4 + k * 58
        if k % 2 == 0:
            s.fill(f"M{x} 8h58v8h-58Z", "f-ink")
    s.pen("M4 8h232v8h-232Z", "s-ink")
    for k in range(5):
        s.text(4 + k * 58, 32, str(k), "", "middle")
    s.text(236, 32, "", "")
    return s.render()


def key_symbol(kind):
    s = Svg(40, 20, "", "fd-key")
    s.parts = []
    if kind == "minor":
        s.pen("M2 14C12 4 28 4 38 14", "s-grid")
    elif kind == "index":
        s.pen("M2 14C12 4 28 4 38 14", "s-idx")
    elif kind == "data":
        s.pen("M2 16L12 10L22 12L38 4", "s-sea w2")
    elif kind == "pin":
        s.pen("M20 18C14 11 13 8 13 6.5A7 7 0 0 1 27 6.5C27 8 26 11 20 18Z", "s-rust")
        s.fill("M20 9.5a2.4 2.4 0 1 0 0.01 0Z", "f-rust")
    elif kind == "here":
        s.fill("M20 10m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0", "f-rust")
        s.pen("M20 10m-8.5 0a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0", "s-rust")
    elif kind == "illus":
        s.pen("M2 3h36v14h-36Z", "s-ink2 dash")
    out = s.render().replace('role="img" aria-label=""', 'aria-hidden="true"')
    return out


PIN = ('<svg class="fd-pin" viewBox="0 0 24 30" width="24" height="30" aria-hidden="true">'
       '<path d="M12 29C5 20 3 15 3 11A9 9 0 0 1 21 11C21 15 19 20 12 29Z"/><circle cx="12" cy="11" r="3.2"/></svg>')


def main():
    tpl = (HERE / "partial.tpl.html").read_text()
    subs = {
        "DECLINE": decline(560, 290, "fd-w") + "\n  " + decline(340, 260, "fd-n"),
        "DESPAC": despac_wide() + "\n  " + despac_narrow(),
        "SCHEMA": schema_wide() + "\n  " + schema_narrow(),
        "NORTH": north(),
        "SCALE": scalebar(),
        "PIN": PIN,
    }
    for k in ("minor", "index", "data", "pin", "here", "illus"):
        subs["KEY_" + k.upper()] = key_symbol(k)
    for k, v in subs.items():
        tpl = tpl.replace("{{" + k + "}}", v)
    assert "{{" not in tpl, "unfilled placeholder"
    assert "—" not in tpl, "em dash"
    OUT.write_text(tpl)
    print("wrote", OUT, len(tpl), "bytes")


if __name__ == "__main__":
    main()
