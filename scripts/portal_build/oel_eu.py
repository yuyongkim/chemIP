"""European Union: occupational exposure limit values from the EUR-Lex HTML texts → oel rows (two sources).

eu_ioelv  indicative OELVs (Directive 98/24/EC lists): 2000/39/EC, 2006/15/EC, 2009/161/EU, (EU) 2017/164, (EU) 2019/1831,
          consolidated versions where EUR-Lex has one. Annex rows end with: 8 h mg/m³ | 8 h ppm | short-term mg/m³ |
          short-term ppm | notation. When a CAS is in several lists, the latest list (oel_sources.json "order") wins.
eu_boelv  binding OELVs: Directive 2004/37/EC Annex III (consolidated). Rows end with: 8 h mg/m³ | ppm | f/ml |
          short-term mg/m³ | ppm | f/ml | notation | transitional measures.
Rows are read right-aligned (EC/CAS cells merged across rows make the left side ragged); the CAS is the first CAS-shaped
cell. Footnote marks "( 8 )" are dropped. A transitional-measure note is kept only while one of its dates is still ahead.
"""
from __future__ import annotations

import datetime as dt
import re

import oel_raw
from oel_values import cas_list, clean_text, parse_number, qualify_shared_cas, row

SOURCE_IOELV = "eu_ioelv"
SOURCE_BOELV = "eu_boelv"
JURISDICTION = "EU"
IOELV_TAIL = [("TWA", "mg/m3"), ("TWA", "ppm"), ("STEL", "mg/m3"), ("STEL", "ppm")]
BOELV_TAIL = [("TWA", "mg/m3"), ("TWA", "ppm"), ("TWA", "f/cc"), ("STEL", "mg/m3"), ("STEL", "ppm"), ("STEL", "f/cc")]
_FOOTNOTE_RE = re.compile(r"\(\s*\d+\s*\)")
_DATE_RE = re.compile(r"(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})")
_MONTHS = {m: i + 1 for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August",
                                           "September", "October", "November", "December"])}
NOTE_MAX = 240


def html_rows(html_text: str) -> list[list[str]]:
    return [[clean_text(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)]
            for tr in re.findall(r"<tr.*?</tr>", html_text, re.S)]


def strip_marks(s: str) -> str:
    return re.sub(r"\s+", " ", _FOOTNOTE_RE.sub("", s or "")).strip(" ;,")


def notation_text(s: str) -> str | None:
    t = strip_marks(s)
    return None if t in ("", "—", "-", "–") else t


def future_note(text: str, today: dt.date) -> str | None:
    """The transitional-measure text when any date in it is after today, else None."""
    t = strip_marks(text)
    for d, mon, y in _DATE_RE.findall(t):
        if dt.date(int(y), _MONTHS[mon], int(d)) > today:
            return "Transitional: " + (t if len(t) <= NOTE_MAX else t[: NOTE_MAX - 1] + "…")
    return None


def parse_rows(rows: list[list[str]], tail: list[tuple[str, str]], extra_cols: int, today: dt.date) -> list[tuple[str, list[dict]]]:
    """Annex rows → [(agent name, rows)]. extra_cols = cells after the value cells (notation [+ transitional])."""
    width = len(tail) + extra_cols
    agents = []
    for c in rows:
        if len(c) < width + 2:
            continue
        lead, values, after = c[: -width], c[-width: len(c) - extra_cols], c[len(c) - extra_cols:]
        cas = [x for cell in lead for x in cas_list(cell) if re.fullmatch(r"\s*[\d\-\s]+\s*", cell)]
        if not cas:
            continue
        name = strip_marks(lead[-1])
        notes = [n for n in (notation_text(after[0]), future_note(after[1], today) if extra_cols > 1 else None) if n]
        note = "; ".join(notes) or None
        out = []
        for (kind, unit), cell in zip(tail, values):
            num = parse_number(cell)
            if num is not None:
                out += [row(x, JURISDICTION, kind, num, unit, note) for x in cas]
        if out:
            agents.append((name, out))
    return agents


def _files(source_id: str) -> list[dict]:
    return sorted(oel_raw.source(source_id)["files"], key=lambda f: f["order"])


def parse_ioelv(today: dt.date | None = None) -> tuple[list[dict], dict]:
    today = today or dt.date.today()
    latest: dict[str, tuple[str, list[tuple[str, list[dict]]]]] = {}
    per_file = {}
    for f in _files(SOURCE_IOELV):
        agents = parse_rows(html_rows(oel_raw.read_file(SOURCE_IOELV, f["file"]).decode("utf-8")), IOELV_TAIL, 1, today)
        per_file[f["file"]] = len(agents)
        by_cas: dict[str, list[tuple[str, list[dict]]]] = {}
        for name, rows in agents:
            for cas in {r["cas"] for r in rows}:
                by_cas.setdefault(cas, []).append((name, [r for r in rows if r["cas"] == cas]))
        for cas, items in by_cas.items():
            dated = [(n, [{**r, "as_of": f["date"]} for r in rs]) for n, rs in items]
            latest[cas] = (f["file"], dated)  # later directive replaces earlier entries for the same CAS
    agents = [a for _, items in latest.values() for a in items]
    rows = qualify_shared_cas(agents)
    return rows, {"agents_per_file": per_file, "rows": len(rows), "cas": len({r["cas"] for r in rows})}


def parse_boelv(today: dt.date | None = None) -> tuple[list[dict], dict]:
    today = today or dt.date.today()
    agents, per_file = [], {}
    for f in _files(SOURCE_BOELV):
        a = parse_rows(html_rows(oel_raw.read_file(SOURCE_BOELV, f["file"]).decode("utf-8")), BOELV_TAIL, 2, today)
        per_file[f["file"]] = len(a)
        agents += [(n, [{**r, "as_of": f["date"]} for r in rs]) for n, rs in a]
    rows = qualify_shared_cas(agents)
    return rows, {"agents_per_file": per_file, "rows": len(rows), "cas": len({r["cas"] for r in rows})}
