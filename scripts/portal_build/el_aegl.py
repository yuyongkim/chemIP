"""EPA AEGL program pages (data/portal_raw/el/epa_aegl/*.html) → {CAS: AEGL record}. Pure parsing, standard library only.

Record: {name, status ("Final"|"Interim"|"Proposed"|""), unit ("ppm"|"mg/m3"), page, tsd,
         v: {"1": [5 values], "2": [...], "3": [...]}   numbers (None = blank or NR) at 10 min, 30 min, 60 min, 4 h, 8 h,
         f: {"1": [5 flags], ...}                       "" | "NR" (not recommended, insufficient data) | "ND" (not determined) | "*" | "**" | "***",
         mg: {"1": [...], ...} | absent                 bracketed mg/m3 values when the page prints "ppm [mg/m3]",
         lel: {value, unit} | absent}                   lower explosive limit printed under the table
Cells printed as "**" / "***" alone (≥ 50 % / ≥ 100 % LEL) get their value from the note under the table
("AEGL 3 - 10 min/30 min = ** 10,000 ppm"). The flags are EPA's: * > 10 % LEL, ** > 50 % LEL, *** > 100 % LEL.
"""
from __future__ import annotations

import html
import json
import os
import re

import el_config as C

_CAS_RE = re.compile(r"\b(\d{2,7}-\d{2}-\d)\b")
_TIME_KEYS = {"10 min": "10min", "30 min": "30min", "60 min": "60min", "1 hr": "60min", "4 hr": "4h", "8 hr": "8h"}
# note under the table: "AEGL 2 - 10 min = *** 24,000 ppm; 30 min/60 min/4 hr/8 hr = ** 17,000 ppm"
_NOTE_SEG_RE = re.compile(r"AEGL[ -]?([123])\s*-\s*(.*?)(?=AEGL[ -]?[123]\s*-|For values|$)", re.I)
_NOTE_PAIR_RE = re.compile(r"([0-9][0-9a-z /]*?)\s*=\s*(\*+)\s*([0-9][0-9,]*\.?[0-9]*)\s*(?:ppm|mg/m3|mg/m³)", re.I)
_LEL_RE = re.compile(r"Lower Explosive Limit\s*(?:\(LEL\))?\s*=\s*([0-9][0-9,]*\.?[0-9]*)\s*(ppm|mg/m3|%)", re.I)


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or "")).replace("\xa0", " ")).strip()


def cell(text: str) -> tuple[float | None, str, float | None]:
    """'4,900*' → (4900, '*', None); 'NR' → (None, 'NR', None); '0.0010 [0.0069]' → (0.001, '', 0.0069); '**' → (None, '**', None)."""
    t = _clean(text)
    if not t or t in ("-", "—"):
        return None, "", None
    if t.upper().startswith("NR"):
        return None, "NR", None
    if t.upper().startswith("ND"):  # not determined under normal exposure scenarios
        return None, "ND", None
    lead = re.match(r"^(\*+)\s*([0-9].*)$", t)  # "*4,000" — the mark printed before the number
    if lead:
        v, _, mg = cell(lead.group(2))
        return v, lead.group(1), mg
    m = re.match(r"^([0-9][0-9,]*\.?[0-9]*(?:[Ee][+-]?\d+)?)\s*(\**)\s*(?:\[\s*([0-9][0-9,]*\.?[0-9]*)\s*\]\s*\**)?", t)
    if not m:
        stars = re.match(r"^(\*+)$", t)
        return None, stars.group(1) if stars else "", None
    v = float(m.group(1).replace(",", ""))
    mg = float(m.group(3).replace(",", "")) if m.group(3) else None
    return v, m.group(2), mg


def _time_key(text: str) -> str:
    t = re.sub(r"(\d)\s*(min|hr)\b", r"\1 \2", text.strip().lower())   # "8hr" -> "8 hr"
    return _TIME_KEYS.get(re.sub(r"\s+", " ", t).strip(), "")


def _times(head_cells: list[str]) -> list[str]:
    return [_time_key(c) for c in head_cells]


def _note_times(spec: str) -> list[str]:
    out = []
    for part in spec.split("/"):
        p = re.sub(r"\bmins\b", "min", part.strip().lower())
        out.append(_time_key(p))
    return [t for t in out if t]


def note_values(after_text: str) -> list[tuple[str, str, str, float]]:
    """(tier, time key, stars, value) from the notes that give the value of cells printed as "**" / "***"."""
    out = []
    for seg in _NOTE_SEG_RE.finditer(after_text):
        k, body = seg.group(1), seg.group(2)
        for spec, stars, val in _NOTE_PAIR_RE.findall(body):
            for t in _note_times(spec):
                out.append((k, t, stars, float(val.replace(",", ""))))
    return out


def parse_table(table_html: str, after_text: str) -> dict | None:
    cap = re.search(r"<caption>(.*?)</caption>", table_html, flags=re.S)
    if not cap:  # some pages put the title in a header cell spanning the table
        cap = re.search(r"<th[^>]*colspan[^>]*>(.*?)</th>", table_html, flags=re.S)
    caption = _clean(cap.group(1)) if cap else ""
    rows = [[c for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, flags=re.S)] for r in re.findall(r"<tr.*?</tr>", table_html, flags=re.S)]
    times: list[str] = []
    unit = ""
    v: dict[str, list] = {}
    f: dict[str, list] = {}
    mg: dict[str, list] = {}
    for r in rows:
        cells = [_clean(c) for c in r]
        if not cells:
            continue
        if not times and any("min" in c.lower() for c in cells):
            times = _times(cells[1:]) if len(cells) > 5 else _times(cells)
            continue
        lab = cells[0]
        m = re.match(r"^AEGL[ -]?([123])\b", lab, flags=re.I)
        if m and times:
            k = m.group(1)
            parsed = [cell(c) for c in r[1:1 + len(times)]]
            v[k] = [p[0] for p in parsed]
            f[k] = [p[1] for p in parsed]
            if any(p[2] is not None for p in parsed):
                mg[k] = [p[2] for p in parsed]
            continue
        low = lab.lower()
        filled = [c.lower() for c in cells if c]
        if len(filled) == 1 and not unit:
            if "ppm" in filled[0]:
                unit = "ppm"
            elif "mg/m" in filled[0]:
                unit = "mg/m3"
    if not v or times[:5] != C.AEGL_TIMES:
        return None
    for k, t, stars, val in note_values(after_text):
        i = C.AEGL_TIMES.index(t)
        if k in v and v[k][i] is None and f[k][i] == stars:
            v[k][i] = val
    status = re.search(r"\((Final|Interim|Proposed)\)", caption, flags=re.I)
    cas = _CAS_RE.search(caption)
    name = caption
    if cas:
        name = caption[:caption.find(cas.group(1))].strip()
    name = re.sub(r"\((Final|Interim|Proposed)\)", "", name, flags=re.I).strip()
    rec = {"name": name, "cas": cas.group(1) if cas else "", "status": status.group(1).title() if status else "",
           "unit": unit or "ppm", "v": v, "f": f}
    if mg:
        rec["mg"] = mg
    lel = _LEL_RE.search(after_text)
    if lel:
        rec["lel"] = {"value": float(lel.group(1).replace(",", "")), "unit": lel.group(2)}
    return rec


def parse_page(page_html: str) -> list[dict]:
    out = []
    for m in re.finditer(r"<table.*?</table>", page_html, flags=re.S):
        nxt = page_html.find("<table", m.end())
        tail = page_html[m.end(): nxt if nxt > 0 else m.end() + 6000]
        side = tail.find("Acute Exposure Guideline Levels")
        after = _clean(tail[: side if side > 0 else 6000])
        rec = parse_table(m.group(0), after)
        if rec:
            tsd = re.search(r'href="([^"]+\.pdf)"', tail[: side if side > 0 else 6000])
            rec["tsd"] = html.unescape(tsd.group(1)) if tsd else ""
            out.append(rec)
    return out


def parse(raw_dir: str | None = None) -> tuple[dict[str, dict], dict]:
    raw_dir = raw_dir or C.raw_dir("epa_aegl")
    with open(os.path.join(raw_dir, C.MANIFEST), encoding="utf-8") as fh:
        manifest = json.load(fh)["files"]
    out: dict[str, dict] = {}
    stats = {"pages": 0, "tables": 0, "no_table": [], "no_cas": [], "duplicate": []}
    for name, meta in sorted(manifest.items()):
        if name == "index.html" or not name.endswith(".html"):
            continue
        stats["pages"] += 1
        with open(os.path.join(raw_dir, name), encoding="utf-8", errors="replace") as fh:
            recs = parse_page(fh.read())
        if not recs:
            stats["no_table"].append(name)
            continue
        for rec in recs:
            stats["tables"] += 1
            cas = rec.pop("cas") or (meta.get("cas") if _CAS_RE.fullmatch(meta.get("cas") or "") else "")
            if not cas:
                stats["no_cas"].append(name)
                continue
            rec["name"] = rec["name"] or meta.get("name", "")
            rec["page"] = meta["url"]
            if rec["tsd"].startswith("/"):
                rec["tsd"] = C.AEGL_BASE + rec["tsd"]
            if cas in out:
                stats["duplicate"].append(f"{cas} {name}")
                continue
            out[cas] = rec
    stats["cas"] = len(out)
    return out, stats
