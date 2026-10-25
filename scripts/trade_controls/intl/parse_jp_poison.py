"""Japan 毒物及び劇物取締法: 毒物 (incl. 特定毒物) and 劇物 with CAS, from the NIHS 毒劇物 search files.

NIHS (国立医薬品食品衛生研究所, MHLW) publishes three Excel-exported HTML sheets (doku / geki / toku).
Columns: 官報公示名 / 化学物質(例) / 別名 / Chemical Name / Synonym / CAS. Group entries (e.g. 無機亜鉛塩類) list
only examples; exclusions by concentration are not applied. Rows without CAS become family_entries.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

HEADER = "官報公示名"


def read_sheet(path: Path) -> list[dict]:
    page = path.read_bytes().decode("cp932", errors="replace")
    page = re.sub(r"<rt.*?</rt>", "", page, flags=re.S | re.I)  # drop furigana
    rows = [[clean(html.unescape(re.sub(r"<[^>]+>", " ", c))) for c in re.findall(r"<td.*?</td>", tr, re.S | re.I)]
            for tr in re.findall(r"<tr.*?</tr>", page, re.S | re.I)]
    start = next(i for i, r in enumerate(rows) if r and r[0] == HEADER)
    out = []
    for r in rows[start + 1:]:
        if len(r) >= 6 and r[0]:
            out.append({"official": r[0], "example": r[1], "alias": r[2], "name_en": r[3], "synonym": r[4],
                        "cas_all": cas_tokens(r[5]), "cas_text": r[5]})
    return out


def _rows(sheet: list[dict], label: str, special: set[str]) -> list[dict]:
    rows = []
    for r in sheet:
        parts = [f"{label} 官報公示名: {r['official']}"]
        if r["alias"]:
            parts.append(f"別名: {r['alias']}")
        if r["name_en"]:
            parts.append(r["name_en"])
        if special and set(r["cas_all"]) & special:
            parts.append("特定毒物(法別表第三·指定令第3条)")
        rows.append(entry("", r["example"] or r["official"], "; ".join(parts), cas_all=r["cas_all"]))
    return rows


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    paths = {k: fetch(d[k]["url"], raw_dir / d[k]["file"], offline) for k in ("doku", "geki", "toku")}
    sheets = {k: read_sheet(p) for k, p in paths.items()}
    files = [file_info(paths[k], d[k]["url"]) for k in paths]
    special = {c for r in sheets["toku"] for c in r["cas_all"]}
    doku_cas = {c for r in sheets["doku"] for c in r["cas_all"]}
    # 特定毒物 rows whose CAS is missing from the 毒物 sheet are added to 毒物 (特定毒物 are 毒物, 法第2条③)
    doku_rows = sheets["doku"] + [r for r in sheets["toku"] if not set(r["cas_all"]) & doku_cas]
    out = {}
    for key, label, sheet in (("poison", "毒物", doku_rows), ("deleterious", "劇物", sheets["geki"])):
        entries, families, bad = split_entries(_rows(sheet, label, special if key == "poison" else set()))
        extra = spec["lists"][key].get("family_additions") or []
        families.extend(entry("", f["name"], f["detail"]) for f in extra)
        out[key] = {
            "entries": entries, "family_entries": families,
            "problems": [f"invalid CAS in NIHS file: {bad}"] if bad else [],
            "official_count": None,
            "official_count_basis": "법정 품목 수가 CAS 단위로 공표되지 않음(군 지정·예시 수록) — 행 수만 기록",
            "counted": len(sheet),
            "source_version": spec["source_version"],
            "notes": [f"NIHS 시트 행 {len(sheet)}건(官報公示名 {len({r['official'] for r in sheet})}종), "
                      f"CAS 있는 행 {sum(1 for r in sheet if r['cas_all'])}건",
                      *(["特定毒物 시트 행 수: " + str(len(sheets["toku"]))] if key == "poison" else [])],
            "files": files,
        }
    return out
