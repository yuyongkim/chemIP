"""Canada: ECCC Substances Search "Export to Excel" files (pollution-waste.canada.ca/substances-search).

One workbook per list or group (DSL, NDSL, CEPA Schedule 1, Prohibition of Certain Toxic Substances Regulations 2025,
SNAc orders/notices, asbestos regulations). Columns: List or group | Substance identifier | Substance identifier (2) |
Substance name | Additional information | Recent publication(s) | Date published.
The item count and update date of each list are read from the list selector of the search page (official count).

- Identifier is a CAS RN for most rows. Masked-name rows carry a Confidential Accession Number (CAN, e.g. 11422-1),
  enzymes an EC enzyme number, organisms an ATCC number: these cannot be matched by CAS and are counted, not stored.
- CEPA Schedule 1 rows: 'Substance identifier (2)' = '<Part> - <item>'. Rows without CAS are kept as family entries.
  When such a row's name (before ', which has the molecular formula') is exactly a DSL substance name in the same ECCC
  export, the DSL CAS is attached with match_method 'eccc_dsl_name_exact' (no CAS is typed by hand).
"""
from __future__ import annotations

import html
import re
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries
from intl_xlsx import cell, sheet_rows

CAS_FULL = re.compile(r"^\d{2,7}-\d{2}-\d$")
OPTION = re.compile(r'<option value="([^"]+)">(.*?)\((\d+) items\)\s*\((\d{4}-\d{2}-\d{2})\)</option>')
FORMULA_TAIL = re.compile(r",?\s*(which has|that has|which have|that have) the molecular formula.*$", re.I)


def list_index(page: str) -> dict[str, dict]:
    """code -> {title, count, date} from the search page's list selector."""
    return {m.group(1): {"title": clean(html.unescape(m.group(2))), "count": int(m.group(3)), "date": m.group(4)}
            for m in OPTION.finditer(page)}


def _rows(path: Path) -> list[tuple]:
    rows = sheet_rows(path)
    if not rows or cell(rows[0][1]) != "Substance identifier":
        raise ValueError(f"unexpected ECCC export header in {path.name}: {rows[:1]}")
    return [r for r in rows[1:] if any(r)]


def _flags(info: str, flag_text: dict) -> str:
    low = info.lower()
    return "; ".join(label for needle, label in flag_text.items() if needle.lower() in low)


def parse_list(rows: list[tuple], key: str, cfg: dict, flag_text: dict) -> tuple[list[dict], int, dict]:
    """Rows -> entry rows (cas_all), rows counted, counts of identifiers that are not CAS."""
    out: list[dict] = []
    skipped: dict[str, int] = {}
    for r in rows:
        ident, ident2, name, info = cell(r[1]), cell(r[2]), cell(r[3]), cell(r[4])
        pub, date = cell(r[5]), (r[6].date().isoformat() if hasattr(r[6], "date") else cell(r[6]))
        detail = "; ".join(p for p in (
            f"CEPA Schedule 1 Part {ident2.replace(' - ', ' item ')}" if key == "cepa_sch1" and ident2 else "",
            _flags(info, flag_text), f"{cfg.get('pub_label', '고시일')} {date}" if date else "",
            pub[:160] if cfg.get("keep_publication") else "") if p)
        if CAS_FULL.match(ident):
            out.append(entry("", name[:300], detail, cas_all=[ident], match_method="law_cas"))
        elif not ident and cfg.get("keep_no_cas"):
            out.append(entry("", name[:300], detail, match_method="no_cas", schedule_item=ident2))
        else:
            kind = ("CAN(기밀 접수번호)" if re.fullmatch(r"\d{4,6}-\d", ident) else
                    "EC enzyme no." if re.fullmatch(r"\d+(\.\d+){2,3}", ident) else
                    "ATCC/기타 생물 번호" if ident else "식별번호 없음")
            skipped[kind] = skipped.get(kind, 0) + 1
    return out, len(rows), skipped


def fill_from_dsl(rows: list[dict], dsl_names: dict[str, set[str]]) -> int:
    """Schedule 1 rows without CAS: attach the DSL CAS when the name is exactly one DSL substance name."""
    hits = 0
    for row in rows:
        if row.get("cas_all"):
            continue
        base = FORMULA_TAIL.sub("", row["name"]).strip().lower()
        found = dsl_names.get(base) or set()
        if len(found) == 1:
            row["cas_all"] = sorted(found)
            row["match_method"] = "eccc_dsl_name_exact"
            row["cas_source"] = "ECCC DSL export: same substance name"
            hits += 1
    return hits


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    headers = spec.get("headers") or {}
    page_path = fetch(d["search_page"], raw_dir / "ca" / "substances_search.html", offline, headers=headers)
    index = list_index(page_path.read_text(encoding="utf-8", errors="replace"))
    page_info = file_info(page_path, d["search_page"])
    parsed_lists: dict[str, tuple] = {}
    for key, meta in spec["lists"].items():
        code = meta["eccc_code"]
        url = d["export"].format(code=code)
        path = fetch(url, raw_dir / "ca" / f"eccc_{code}.xlsx", offline, headers=headers)
        rows = _rows(path)
        parsed_lists[key] = (rows, file_info(path, url), code)
    dsl_names: dict[str, set[str]] = {}
    for r in parsed_lists["dsl"][0]:
        ident, name = cell(r[1]), cell(r[3]).lower()
        if CAS_FULL.match(ident):
            dsl_names.setdefault(name, set()).add(ident)
    out = {}
    for key, (rows, info, code) in parsed_lists.items():
        meta = spec["lists"][key]
        items, counted, skipped = parse_list(rows, key, meta, spec.get("flag_text") or {})
        notes = []
        if key == "cepa_sch1":
            hits = fill_from_dsl(items, dsl_names)
            parts = {cell(r[2]) for r in rows if cell(r[2])}
            notes.append(f"Schedule 1 의 Part-item {len(parts)}개에 걸친 {counted}행. CAS 없는 행 중 {hits}건은 같은 ECCC 내보내기의 DSL 동일 명칭 CAS 를 붙였다(match_method=eccc_dsl_name_exact).")
        if skipped:
            notes.append("CAS 가 아닌 식별번호라 CAS 조회에서 빠진 행: " + ", ".join(f"{k} {v}" for k, v in skipped.items()))
        entries, families, bad = split_entries(items)
        official = index.get(code, {})
        out[key] = {
            "entries": entries, "family_entries": families,
            "problems": [f"invalid CAS in source: {bad[:20]}"] if bad else [],
            "official_count": official.get("count"),
            "official_count_basis": f"ECCC Substances Search 목록 선택란의 '{code}' 항목 수",
            "counted": counted,
            "source_version": f"ECCC Substances Search '{official.get('title', code)}' {official.get('count', '?')} items, updated {official.get('date', '?')}",
            "notes": notes, "files": [page_info, info],
        }
    return out
