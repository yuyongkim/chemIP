"""Reference Tables 1–12 and 14–30 of the EPA RMP OCA Guidance (oca-chps.pdf) → distance tables.

Shapes (Chapter 4 / 8 / 10 of the guidance say how each is read; the calculator does the lookup):
- ratio  (1–4, 14–17, 26, 27): release rate ÷ endpoint ranges → miles. Upright, two halves per page.
- grid   (5–8, 18–21, 28, 29): endpoint (or LFL) × release rate → miles. 5–8, 18–21, 28 are printed sideways.
- chem   (9–12, 22–25): ammonia / chlorine / sulfur dioxide, release rate → rural and urban miles.
- bleve  (30): quantity × substance → miles (sideways, three pages).
Table 13 (VCE, 1 psi) is not keyed: the calculator uses the guidance's own Equation C-2, from which Table 13 was made.
Distances are miles as printed; ">25" / "*" → 25 and "<0.1" / "#" → 0.1 (the tables' own "report as" notes).
"""
from __future__ import annotations

import re

from rmp_oca_pdf import CAS_RE, distance, group, num, page_words

CELL_RE = re.compile(r"^(<|>)?\d[\d,]*(\.\d+)?\*{0,2}$|^\*{1,2}$|^#$")


def _centre(w):
    return (w[1] + w[3]) / 2


def table_words(pdf: str, page: int, number: int) -> list[tuple]:
    """Words of one reference table: from its 'Reference Table N' title down to the next title on the page."""
    words = page_words(pdf, page)
    titles = []
    for y, ws in group(words, "y"):
        t = [w[4] for w in ws]
        for i in range(len(t) - 2):
            if t[i] == "Reference" and t[i + 1] == "Table" and re.fullmatch(r"\d+", t[i + 2]):
                titles.append((y, int(t[i + 2])))
    mine = [y for y, n in titles if n == number]
    if not mine:  # sideways pages print the title rotated: keep the whole page
        return words
    top = mine[0]
    below = [y for y, n in titles if y > top + 5]
    bottom = min(below) if below else 10_000
    return [w for w in words if top - 2 <= _centre(w) < bottom - 2]


def ratio_table(words: list[tuple]) -> dict:
    """'lo - hi  dist' lines in two halves (split at the page middle) → {rows: [[lo, hi, miles]], over: [x, miles]}."""
    halves = ([], [])
    over = None
    for _, ws in group(words, "y"):
        for half, part in enumerate(([w for w in ws if w[0] < 300], [w for w in ws if w[0] >= 300])):
            t = [w[4] for w in part]
            if len(t) >= 4 and t[1] == "-" and num(t[0]) is not None and num(t[2]) is not None:
                halves[half].append([num(t[0]), num(t[2]), distance(t[3])])
            elif len(t) == 2 and t[0].startswith(">") and num(t[0][1:]) is not None:
                over = [num(t[0][1:]), distance(t[1])]
    rows = halves[0] + halves[1]
    for a, b in zip(rows, rows[1:]):
        if a[1] != b[0]:
            raise ValueError(f"ratio table ranges do not chain: {a} → {b}")
    return {"kind": "ratio", "rows": rows, "over": over}


def _nearest_fill(slots: list[dict], cells: list[tuple], key: str, tol: float = 4.5) -> None:
    """Put each cell on the slot (row) whose y is nearest; cells far from every row are merged cells printed once
    across several rows — they fill the empty slots nearest to them."""
    spanning = []
    for w in cells:
        s = min(slots, key=lambda s: abs(s["y"] - _centre(w)))
        if abs(s["y"] - _centre(w)) <= tol and key not in s:
            s[key] = distance(w[4])
        else:
            spanning.append(w)
    for s in slots:
        if key not in s and spanning:
            w = min(spanning, key=lambda w: abs(s["y"] - _centre(w)))
            s[key] = distance(w[4])


def chem_table(words: list[tuple]) -> dict:
    """Chemical-specific table → {rows: [[rate, rural, urban]]} (left half then right half)."""
    heads = [w for w in words if w[4] in ("Rural", "Urban")]
    notes = [_centre(w) for w in words if re.fullmatch(r"\*?Report|More", w[4])]
    stop = min(notes) - 3 if notes else 10_000
    words = [w for w in words if _centre(w) < stop]  # footnotes print '0.1' and '25' too
    out = []
    for lo, hi in ((0, 300), (300, 1000)):
        hx = {w[4]: w[0] for w in heads if lo <= w[0] < hi}
        cell_words = [w for w in words if CELL_RE.match(w[4]) and any(abs(w[0] - x) <= 14 for x in hx.values())]
        rate_words = [w for w in words if lo <= w[0] < hx["Rural"] - 30 and (num(w[4]) is not None or re.fullmatch(r"<\d+", w[4]))
                      and _centre(w) > max(_centre(h) for h in heads) + 5
                      and any(abs(_centre(c) - _centre(w)) <= 4.5 for c in cell_words)]  # page numbers and dates have no cells
        slots = [{"y": _centre(w), "rate": num(w[4].lstrip("<")), "below": w[4].startswith("<")} for w in rate_words]
        slots.sort(key=lambda s: s["y"])
        for name in ("Rural", "Urban"):
            x = hx[name]
            cells = [w for w in words if abs(w[0] - x) <= 14 and CELL_RE.match(w[4]) and _centre(w) > slots[0]["y"] - 8
                     and _centre(w) < slots[-1]["y"] + 8 and w not in rate_words]
            _nearest_fill(slots, cells, name.lower())
        out += [[s["rate"], s["rural"], s["urban"], *([1] if s["below"] else [])] for s in slots]
    return {"kind": "chem", "rows": out}


def sideways_grid(words: list[tuple], row_x: tuple[float, float]) -> dict:
    """Sideways grid: row keys (endpoint / LFL) printed at x in row_x, column keys (release rate) on the bottom lines."""
    keys = [w for w in words if row_x[0] <= w[0] <= row_x[1] and (num(w[4].lstrip(">")) is not None)]
    keys.sort(key=_centre)
    last = max(_centre(w) for w in keys)
    label_y = max(_centre(w) for w in words if w[4] == "(lbs/min)")
    note_x = [w[0] for w in words if w[4] == "(report"]  # the side note "(report distance as …)" prints numbers too
    rate_words = [w for w in words if last + 15 < _centre(w) <= label_y + 3 and (num(w[4].lstrip("<")) is not None)
                  and w[0] > row_x[1] + 10 and not any(abs(w[0] - x) < 8 for x in note_x)]
    rate_words.sort(key=lambda w: w[0])
    rates = [{"x": w[0], "v": num(w[4].lstrip("<")), "below": w[4].startswith("<")} for w in rate_words]
    grid = []
    for k in keys:
        row = []
        for r in rates:
            cells = [w for w in words if abs(w[0] - r["x"]) <= 6 and abs(_centre(w) - _centre(k)) <= 4.5 and CELL_RE.match(w[4]) and w is not k]
            row.append(distance(min(cells, key=lambda w: abs(_centre(w) - _centre(k)))[4]) if cells else None)
        grid.append(row)
    return {"kind": "grid", "keys": [{"v": num(k[4].lstrip(">")), "above": k[4].startswith(">")} for k in keys],
            "rates": [{"v": r["v"], "below": r["below"]} for r in rates], "dist": grid}


def upright_grid(words: list[tuple]) -> dict:
    """Upright grid (Table 29): LFL keys on one header line, release-rate rows below."""
    lines = group(words, "y")
    head = next(ws for _, ws in lines if sum(num(w[4].lstrip(">")) is not None for w in ws) >= 4 and all(num(w[4].lstrip(">")) is not None for w in ws))
    cols = [{"x": w[0], "v": num(w[4].lstrip(">")), "above": w[4].startswith(">")} for w in head]
    rows, dist = [], []
    for _, ws in lines:
        t = [w[4] for w in ws]
        if len(t) == len(cols) + 1 and num(t[0].lstrip("<")) is not None and all(CELL_RE.match(x) for x in t[1:]):
            rows.append({"v": num(t[0].lstrip("<")), "below": t[0].startswith("<")})
            dist.append([distance(x) for x in t[1:]])
    # stored like the sideways grids: keys = LFL, rates = release rate (dist[key][rate])
    return {"kind": "grid", "keys": [{"v": c["v"], "above": c["above"]} for c in cols], "rates": rows,
            "dist": [[dist[r][k] for r in range(len(rows))] for k in range(len(cols))]}


def bleve_table(pdf: str, pages: list[int]) -> dict:
    """Table 30: {quantities: [lb], duration_s: [s], dist: {CAS: [miles per quantity]}}."""
    quantities, durations, dist = None, None, {}
    for p in pages:
        words = page_words(pdf, p)
        big = [w for w in words if w[0] < 170 and num(w[4]) is not None and num(w[4]) >= 1000 and "," in w[4]]
        qx = min(round(w[0]) for w in big)  # quantity column (it moves a little from page to page)
        q = sorted((w for w in big if abs(w[0] - qx) <= 12), key=_centre)
        d = [min((w for w in words if qx + 8 <= w[0] <= qx + 30 and abs(_centre(w) - _centre(qw)) <= 4 and num(w[4]) is not None),
                 key=lambda w: abs(_centre(w) - _centre(qw))) for qw in q]
        qs, ds = [num(w[4]) for w in q], [num(w[4]) for w in d]
        if quantities is None:
            quantities, durations = qs, ds
        elif qs != quantities:
            raise ValueError(f"Table 30 page {p}: quantities differ")
        for c in (w for w in words if CAS_RE.match(w[4])):
            col = []
            for qw in q:
                cells = [w for w in words if abs(w[0] - c[0]) <= 6 and abs(_centre(w) - _centre(qw)) <= 4.5 and num(w[4]) is not None]
                col.append(num(min(cells, key=lambda w: abs(_centre(w) - _centre(qw)))[4]) if cells else None)
            dist[c[4]] = col
    order = sorted(range(len(quantities)), key=lambda i: quantities[i])
    return {"kind": "bleve", "quantities": [quantities[i] for i in order], "duration_s": [durations[i] for i in order],
            "dist": {k: [v[i] for i in order] for k, v in dist.items()}}
