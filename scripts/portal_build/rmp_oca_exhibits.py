"""Appendix B/C exhibits of the EPA RMP OCA Guidance (oca-apds.pdf) → substance records.

- Exhibits B-1 (toxic gases), B-2 (toxic liquids), C-2 (flammable gases), C-3 (flammable liquids) are printed sideways:
  one substance per printed column, one field per row. Rows are recognised by the label words left of the first column.
- Exhibit B-4 (temperature correction factors) and C-1 (heats of combustion) are upright tables, one substance per line.
Exhibit B-3 (water solutions, oleum) is not keyed: the calculator treats solutions with the pure-substance factors
and says so.
"""
from __future__ import annotations

import re

from rmp_oca_pdf import CAS_RE, group, num, page_words

# (field, label regex) in priority order; tested against the label words of one printed row
FIELD_PATTERNS = [
    ("lfl_mgL", r"LFL\s*\(mg/L\)"),
    ("lfb", r"\(LFB\)"),
    ("lfa", r"\(LFA\)"),
    ("llf", r"\(LLF\)"),
    ("gf", r"\(GF\)"),
    ("pff", r"\(PFF\)"),
    ("fff", r"\(FFF\)"),
    ("df", r"\(DF\)|Density"),
    ("mw", r"Weight"),
    ("k", r"Heats"),
    ("ep_mgL", r"^mg/L$"),
    ("ep_ppm", r"ppm"),
    ("vp", r"Pressure"),
    ("ufl", r"Upper|\(UFL\)"),
    ("lfl", r"Lower|\(LFL\)"),
]
COL_TOL = 6.5


def _columns(words):
    """x of each substance column (from the CAS words) and the label cut-off left of them."""
    cas = [w for w in words if CAS_RE.match(w[4]) and w[0] > 120]
    xs = sorted({round(w[0]) for w in cas})
    return [(x, next(w[4] for w in cas if round(w[0]) == x)) for x in xs], min(xs) - 4


def _clean(text: str) -> str:
    """Drop footnote marks: lone letters a–k and a letter glued after ')' ('(anhydrous)c' → '(anhydrous)')."""
    text = re.sub(r"(?<=\))[a-k](?![a-z])", "", text)
    text = " ".join(t for t in text.split() if not re.fullmatch(r"[a-k]", t))
    return re.sub(r"\s+", " ", text).strip()


def _field_of(label: str):
    for field, pat in FIELD_PATTERNS:
        if re.search(pat, label):
            return field
    return None


def sideways_exhibit(pdf: str, page: int) -> list[dict]:
    """One sideways exhibit page → [{cas, name, <field>: value, ref_worst, ref_alt, basis}]."""
    words = page_words(pdf, page)
    cols, cut = _columns(words)
    recs = [{"cas": cas, "_x": x} for x, cas in cols]
    col_of = lambda w: next((r for r in recs if abs(w[0] - r["_x"]) <= COL_TOL), None)  # noqa: E731

    def nearest(w):  # wrapped second lines of long cells start a little to the right of the column
        r = min(recs, key=lambda r: abs(w[0] - r["_x"]))
        return r if -2 <= w[0] - r["_x"] <= 12 else None
    rows = group(words, "y")
    # value rows: printed lines where at least a third of the columns hold an aligned number (NA/f/e marks also count
    # as cells but cannot make a row on their own — stray footnote letters sit on lines of their own)
    cell = lambda w: num(w[4]) is not None or w[4] in ("NA", "f", "e", "ND")  # noqa: E731
    need = max(1, len(recs) // 3)
    value_rows = []
    for y, ws in rows:
        cells = [w for w in ws if w[0] >= cut and col_of(w) is not None and cell(w)]
        if sum(num(w[4]) is not None for w in cells) >= need:
            value_rows.append(y)
    labels = [(y, _field_of(" ".join(w[4] for w in ws if w[0] < cut))) for y, ws in rows]
    labels = [(y, f) for y, f in labels if f]
    # each value row takes the nearest field label within 12 pt (labels printed on two lines sit a little apart)
    field_y = {}
    for vy in value_rows:
        cands = sorted((abs(ly - vy), f) for ly, f in labels if abs(ly - vy) <= 12 and f not in field_y)
        if cands:
            field_y[cands[0][1]] = vy
    # then each column takes the cell nearest that line (within 4 pt — some cells sit a point or two off)
    for field, vy in field_y.items():
        for r in recs:
            ws = [w for w in words if abs(w[0] - r["_x"]) <= COL_TOL and abs((w[1] + w[3]) / 2 - vy) <= 4 and cell(w)]
            if ws:
                w = min(ws, key=lambda w: abs((w[1] + w[3]) / 2 - vy))
                r[field] = num(w[4])
    # a row whose label sits on the value line but has no aligned numbers (all text) is skipped on purpose
    # reference table rows: "Worst"/"Alternative" labels split them when both are printed (B-2, C-3 has one)
    ref_words = [w for w in words if re.match(r"^(Buoyant|Dense)", w[4]) and w[0] >= cut]
    worst_y = next((y for y, ws in rows if any(w[4] == "Worst" and w[0] < cut for w in ws)), None)
    alt_y = next((y for y, ws in rows if any(w[4] == "Alternative" and w[0] < cut for w in ws)), None)
    for w in ref_words:
        r = col_of(w)
        if r is None:
            continue
        kind = "dense" if w[4].startswith("Dense") else "buoyant"
        yc = (w[1] + w[3]) / 2
        if worst_y is not None and alt_y is not None:
            slot = "ref_worst" if abs(yc - worst_y) < abs(yc - alt_y) else "ref_alt"
        else:
            slot = "ref_worst"
        r.setdefault(slot, kind)
    # endpoint basis: words between the ppm row and the next field row (sideways text reads bottom → top)
    if "ep_ppm" in field_y:
        below = [y for f, y in field_y.items() if y < field_y["ep_ppm"] - 5]
        lo = max(below) + 6 if below else field_y["ep_ppm"] - 60
        hi = field_y["ep_ppm"] - 6
        for r in recs:
            ws = [w for w in words if abs(w[0] - r["_x"]) <= COL_TOL and lo <= (w[1] + w[3]) / 2 <= hi]
            text = " ".join(w[4] for w in sorted(ws, key=lambda w: -(w[1] + w[3]) / 2))
            if text:
                r["basis"] = re.sub(r"\s+", " ", re.sub(r"(?<=[A-Za-z)])[a-k]\b|(?<=\))[a-k]", "", text)).strip()
    # name: words between the molecular-weight row and the CAS row
    cas_y = max((w[1] + w[3]) / 2 for w in words if CAS_RE.match(w[4]))
    mw_y = field_y.get("mw", 0)
    for r in recs:
        ws = [w for w in words if abs(w[0] - r["_x"]) <= COL_TOL and mw_y + 12 < (w[1] + w[3]) / 2 < cas_y - 3 and not CAS_RE.match(w[4])]
        r["name"] = _clean(" ".join(w[4] for w in sorted(ws, key=lambda w: -(w[1] + w[3]) / 2)))
        r.pop("_x")
    return recs


def upright_rows(pdf: str, page: int) -> list[list[str]]:
    """Upright table page → printed lines that start with a CAS number, as word lists."""
    out = []
    for _, ws in group(page_words(pdf, page), "y"):
        texts = [w[4] for w in ws]
        if texts and CAS_RE.match(texts[0]):
            out.append(texts)
    return out


def tcf_rows(pdf: str, pages: list[int]) -> dict:
    """Exhibit B-4: CAS → {name, bp_C, tcf: [30, 35, 40, 45, 50 °C] (None = ND, 'LFB' = above boiling: use LFB)}."""
    out = {}
    for p in pages:
        for t in upright_rows(pdf, p):
            nums = t[-6:]
            out[t[0]] = {
                "name": " ".join(t[1:-6]),
                "bp_C": num(nums[0]),
                "tcf": [num(x) if num(x) is not None else (x if x == "LFB" else None) for x in nums[1:]],
            }
    return out


def heat_rows(pdf: str, pages: list[int]) -> dict:
    """Exhibit C-1: CAS → {name, state, hc_kJkg, estimated}."""
    out = {}
    for p in pages:
        for t in upright_rows(pdf, p):
            state_i = next(i for i, x in enumerate(t) if x in ("Gas", "Liquid"))
            out[t[0]] = {"name": " ".join(t[1:state_i]), "state": t[state_i].lower(),
                         "hc_kJkg": num(t[state_i + 1]), "estimated": t[state_i + 1].endswith("*")}
    return out
