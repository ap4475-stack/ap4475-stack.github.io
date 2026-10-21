"""Splice partials/*.html into index.html between <!-- partial:NAME --> markers.

Run: python3 scripts/assemble.py   (then python3 scripts/charts.py)
Each lane owns its partial; the coordinator owns index.html and runs this.
"""
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
page = root / "index.html"
html = page.read_text()
for part in sorted((root / "partials").glob("*.html")):
    name = part.stem
    pattern = re.compile(rf"<!-- partial:{name} -->.*?<!-- /partial:{name} -->", re.S)
    if not pattern.search(html):
        print("skip", name, "(no marker in index.html)")
        continue
    body = part.read_text().rstrip()
    html = pattern.sub(lambda _: f"<!-- partial:{name} -->\n{body}\n<!-- /partial:{name} -->", html)
    print("spliced", name)
page.write_text(html)
