"""Parsers for Korean legal annexes fetched from law.go.kr XML.

- cwc_categories: 생화학무기법 [별표] 특정화학물질 -> {(종, 목, 번호): {...}}
- drug_precursors: 마약류관리법 시행령 [별표 8] -> 1군/2군 items with limits
- strategic_1c350: 전략물자수출입고시 [별표 2] 1C350 -> {item_no: {'cas', 'name_en', 'name_ko'}}
"""
from __future__ import annotations

import re

HANGUL = re.compile(r"[가-힣]")
CAS_IN_PARENS = re.compile(r"\((\d{2,7}-\d{2}-\d)\)")


# ---------------------------------------------------------------- 생화학무기법 별표
def cwc_categories(annex: str) -> list[dict]:
    """Walk the 특정화학물질 annex. Returns items with 종(1/2/3), 목(가/나/다), 번호 and CAS list."""
    items, kind, part, cur = [], None, None, None
    for raw in annex.splitlines():
        line = raw.strip()
        if not line:
            continue
        m = re.match(r"^([123])\.\s*([123])종화학물질", line)
        if m:
            kind, part, cur = int(m.group(2)), None, None
            continue
        m = re.match(r"^([가나다])\.\s*(.*)", line)
        if m and kind:
            part, cur = m.group(1), None
            if part == "다":  # delegated to presidential decree
                cur = {"kind": kind, "part": part, "no": None, "text": m.group(2), "cas": []}
                items.append(cur)
            continue
        m = re.match(r"^(\d+)\)\s*(.*)", line)
        if m and kind and part:
            cur = {"kind": kind, "part": part, "no": int(m.group(1)), "text": m.group(2), "cas": []}
            items.append(cur)
        elif cur is not None:
            cur["text"] += " " + line
        if cur is not None:
            if "(예외)" in line:
                cur["in_exemption"] = True
            for cas in CAS_IN_PARENS.findall(line):
                if cur.get("in_exemption"):
                    cur.setdefault("exempt_cas", []).append(cas)
                else:
                    cur["cas"].append(cas)
    return items


# ---------------------------------------------------------------- 마약류관리법 시행령 별표 8
def drug_precursors(annex: str) -> list[dict]:
    """Parse the box-drawing tables of 별표 8 into rows {group, no, name_ko, name_en, max_qty, max_conc}."""
    rows, group, cur = [], None, None
    for raw in annex.splitlines():
        g = re.search(r"([가나])\.\s*([12])군", raw)
        if g and "│" not in raw:
            group = f"{g.group(2)}군"
            continue
        if not raw.strip().startswith("│") or group is None:
            continue
        cells = [c.strip() for c in raw.strip().strip("│").split("│")]
        if len(cells) != 4 or cells[0] == "구분":
            continue
        no, name, qty, conc = cells
        if no.isdigit():
            cur = {"group": group, "no": int(no), "parts": [name], "max_qty": qty, "max_conc": conc}
            rows.append(cur)
        elif cur is not None:
            if name:
                cur["parts"].append(name)
            cur["max_qty"] += qty
            cur["max_conc"] += conc
    for r in rows:
        r["name"] = _join_wrapped(r.pop("parts"))
        m = re.match(r"^(.*)\(([^()]*)\)\s*$", r["name"])  # last parenthetical = English name
        if m and HANGUL.search(m.group(1)):
            r["name_ko"], r["name_en"] = m.group(1).strip(), m.group(2).strip()
        else:
            r["name_ko"], r["name_en"] = r["name"], ""
    return rows


def _join_wrapped(parts: list[str]) -> str:
    """Join cell fragments split by the fixed-width layout. A fragment ending in '-' or a
    fragment that starts in lower case mid-word (e.g. 'este' + 'r)') is glued without a space."""
    out = ""
    for part in parts:
        if not out:
            out = part
        elif out.endswith("-") or re.match(r"^[a-z]{1,4}\)", part) or (re.search(r"[a-z]$", out) and re.match(r"^(r|er|ster|yl|pyl|butyl|propyl|-)", part) and not out.endswith(" ")):
            out += part
        else:
            out += " " + part
    return re.sub(r"\s+", " ", out).strip()


# ---------------------------------------------------------------- 전략물자수출입고시 별표 2 1C350
def strategic_1c350(text: str) -> dict:
    """Return {'items': {n: {...}}, 'heading_ko', 'version_line'} from the 1C350 block of 별표 2."""
    start = re.search(r"│1C350\s+│", text)
    if not start:
        raise LookupError("1C350 block not found")
    end = re.search(r"│1C351\s+│", text[start.start():])
    block = text[start.start(): start.start() + end.start()] if end else text[start.start():]
    ko_col, en_col = [], []
    for line in block.splitlines():
        if line.count("│") < 4:
            continue
        cells = line.split("│")
        # [ '', code, korean, english, '' ]
        ko_col.append(cells[2].strip())
        en_col.append(cells[3].strip())
    ko = " ".join(c for c in ko_col if c)
    en = " ".join(c for c in en_col if c)
    items: dict[int, dict] = {}
    for m in re.finditer(r"(?<![\d.])(\d{1,2})\.\s+(.+?)\s*\(CAS\s+(\d{2,7}-\d{2}-\d)\)", en):
        n = int(m.group(1))
        items.setdefault(n, {})
        items[n].update({"name_en": _clean_en(m.group(2)), "cas": m.group(3)})
    for m in re.finditer(r"(?<![\d.])(\d{1,2})\.\s+(.+?)\s*\(CAS\s+(\d{2,7}-\d{2}-\d)\)", ko):
        n = int(m.group(1))
        items.setdefault(n, {})
        items[n]["name_ko"] = m.group(2).strip()
        items[n]["cas_ko"] = m.group(3)
    military = sorted(int(m.group(1)) for m in re.finditer(r"(\d{1,2})\.\s+SEE MILITARY GOODS CONTROLS", en))
    return {"items": items, "military_refs": military}


def _clean_en(s: str) -> str:
    s = re.sub(r"^SEE MILITARY GOODS CONTROLS FOR\s+", "", s)
    return re.sub(r"\s+", " ", s).strip()
