"""Korea: MOEL notice 「화학물질 및 물리적 인자의 노출기준」 Annex 1 (별표 1, .hwp from law.go.kr) → oel rows.

Table columns: 일련번호 | 국문 | 영문 | 화학식 | TWA ppm | TWA ㎎/㎥ | STEL ppm | STEL ㎎/㎥ | 비고 ("[CAS] 발암성 1A, Skin …").
- A value printed as "C 5" is a ceiling (kind C) in that column's unit. "0.2개/㎤" carries its own unit (fibres, f/cc).
- "<다른 이름> 참조" rows only point to another entry and give no value; they are skipped.
- 비고 without the "[CAS]" part becomes the notation (source text as printed, e.g. "발암성 1A, Skin").
- Several entries with one CAS (nickel metal / soluble / insoluble …) get their English name as a notation prefix.
- "0.01 (0.002)" (cadmium) = total value and, in brackets, the respirable-fraction value: two rows, the second marked.
- Entries the annex prints without a CAS are skipped, except the few in NO_CAS_ENTRIES (entry number → CAS).
"""
from __future__ import annotations

import re

import oel_raw
from hwp5_tables import read_tables
from oel_values import cas_list, clean_text, norm_unit, parse_number, qualify_shared_cas, row

SOURCE_ID = "kr_moel_notice"
JURISDICTION = "KR"
RAW_FILE = "annex1.hwp"
# column → (kind, unit) of the table header
VALUE_COLUMNS = {4: ("TWA", "ppm"), 5: ("TWA", "mg/m3"), 6: ("STEL", "ppm"), 7: ("STEL", "mg/m3")}
_CEILING_RE = re.compile(r"^C\s*(?P<num>[\d.,]+)\s*(?P<unit>.*)$")
_PAREN_RE = re.compile(r"^(?P<a>[^()]+?)\s*\((?P<b>[\d.,]+)\)$")
RESPIRABLE_NOTE = "호흡성(respirable)"
NO_CAS_ENTRIES = {"298": "1332-21-4"}  # 석면(모든 형태) Asbestos (all forms): the annex prints no CAS
_OWN_UNIT_RE = re.compile(r"^(?P<num>\d[\d.,]*)\s*(?P<unit>[^\d.,\s].*)$")


def parse_cell_values(text: str, kind: str, unit: str) -> list[tuple[str, float, str, str | None]]:
    """One value cell → [(kind, value, unit, extra note)]: one value, or total + respirable for "A (B)"."""
    t = clean_text(text)
    m = _PAREN_RE.match(t)
    if m:
        first = parse_cell(m.group("a"), kind, unit)
        second = parse_cell(m.group("b"), kind, unit)
        return [v + (None,) for v in [first] if v] + [v + (RESPIRABLE_NOTE,) for v in [second] if v]
    v = parse_cell(t, kind, unit)
    return [v + (None,)] if v else []


def parse_cell(text: str, kind: str, unit: str) -> tuple[str, float, str] | None:
    """One value cell → (kind, value, unit) or None for '-' / empty."""
    t = clean_text(text)
    if not t or t in ("-", "—"):
        return None
    m = _CEILING_RE.match(t)
    if m:
        kind, t = "C", m.group("num") + m.group("unit")
    m = _OWN_UNIT_RE.match(t)
    if m and m.group("unit").strip():
        nu = norm_unit(m.group("unit").strip())
        if not nu:
            raise ValueError(f"unknown unit in {text!r}")
        num = parse_number(m.group("num"))
        return (kind, float(f"{num * nu[1]:.10g}"), nu[0]) if num is not None else None
    num = parse_number(t)
    if num is None:
        raise ValueError(f"unparsed value {text!r}")
    return kind, num, unit


def notation_of(remark: str) -> str | None:
    s = re.sub(r"\[[^\]]*\]", " ", remark or "")
    s = re.sub(r"\s+", " ", s).strip(" ,;")
    return None if s in ("", "-") else s


def parse_table(table: list[list[str]]) -> tuple[list[dict], dict]:
    agents, stats = [], {"entries": 0, "see_refs": 0, "no_cas": 0, "no_value": 0, "errors": []}
    for cells in table:
        if not cells or not cells[0].strip().isdigit():
            continue
        stats["entries"] += 1
        values_text = " ".join(cells[4:8])
        if "참조" in values_text:
            stats["see_refs"] += 1
            continue
        remark = cells[8] if len(cells) > 8 else ""
        cas = cas_list(remark) or ([NO_CAS_ENTRIES[cells[0].strip()]] if cells[0].strip() in NO_CAS_ENTRIES else [])
        if not cas:
            stats["no_cas"] += 1
            continue
        out = []
        for col, (kind, unit) in VALUE_COLUMNS.items():
            try:
                values = parse_cell_values(cells[col], kind, unit)
            except ValueError as e:
                stats["errors"].append(f"{cells[0]}: {e}")
                continue
            note = notation_of(remark)
            for k, num, u, extra in values:
                n = f"{extra} {note}" if extra and note else (extra or note)
                out += [row(c, JURISDICTION, k, num, u, n) for c in cas]
        if not out:
            stats["no_value"] += 1
        agents.append((clean_text(cells[2]) or clean_text(cells[1]), out))
    return qualify_shared_cas(agents), stats


def parse() -> tuple[list[dict], dict]:
    tables = read_tables(oel_raw.raw_path(SOURCE_ID, RAW_FILE))
    table = max(tables, key=len)  # the annex is one long table
    rows, stats = parse_table(table)
    return rows, {**stats, "rows": len(rows), "cas": len({r["cas"] for r in rows})}
