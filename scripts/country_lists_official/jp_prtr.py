"""Japan 化管法 (PRTR/SDS law) 第一種・第二種指定化学物質, 2021 revision of the Cabinet Order (in force 2023-04-01).

Source file: NITE 「化管法物質CAS登録番号入りリスト」(R3_PRTR_SDS_ALL_LIST.xlsx). Header row = the row whose first cell
is 管理番号; columns: 管理番号, CAS登録番号, ＊ (CAS counts only when the 政令 name's bracket condition is met),
2021 政令番号, 種別, 物質名, 別名, then the 2008 columns. One row per (CAS, 政令番号). CAS numbers are NITE's
confirmed reference numbers, not part of the 政令; the official item count (515 + 134) is checked.
"""
from __future__ import annotations

import re

from country_lists.base import Row, cas_valid
from xlsx_rows import read_sheets

CODES = {"第一種": "JP_PRTR_CLASS1", "特定第一種": "JP_PRTR_CLASS1", "第二種": "JP_PRTR_CLASS2"}  # 特定第一種 ⊂ 第一種
OWNED = ("JP_PRTR_CLASS1", "JP_PRTR_CLASS2")
OFFICIAL_ITEMS = {"JP_PRTR_CLASS1": 515, "JP_PRTR_CLASS2": 134}  # 化管法施行令 別表第一・第二 (令和3年政令第199号)


def parse(data: bytes, source: str) -> tuple[list[Row], dict]:
    sheet = next(iter(read_sheets(data).values()))
    start = next(i for i, r in enumerate(sheet) if r and r[0].strip() == "管理番号") + 2
    rows, items, problems = [], {c: set() for c in OWNED}, []
    for r in sheet[start:]:
        r = (r + [""] * 8)[:8]
        mgmt, cas, cond, no, kind, name, alias = (x.strip() for x in r[:7])
        code = CODES.get(kind)
        if not code or not no:
            continue
        items[code].add(no)
        if not cas_valid(cas):
            if cas:
                problems.append(f"bad CAS {cas} ({no})")
            continue
        detail = f"政令番号 {no} {kind}指定化学物質: {name}" + (f" (別名 {alias})" if alias else "")
        detail += f" | 管理番号 {mgmt}" + (" | CAS は括弧書きの条件を満たすときのみ(＊)" if cond else "")
        detail += " | match: NITE confirmed CAS (reference)"
        rows.append(Row(cas, code, detail, source, name))
    counts = {c: len(v) for c, v in items.items()}
    for code, want in OFFICIAL_ITEMS.items():
        if counts[code] != want:
            problems.append(f"{code}: official {want} items, parsed {counts[code]}")
    seen, out = set(), []
    for row in rows:
        key = (row.cas_no, row.regulation, re.sub(r" \|.*", "", row.detail))
        if key not in seen:
            seen.add(key)
            out.append(row)
    return out, {"items": counts, "rows": len(out), "cas": len({r.cas_no for r in out}), "problems": problems}
