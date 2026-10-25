"""China 《中国严格限制的有毒化学品名录》(2023年) — MEE / MOFCOM / GACC announcement 2023年第32号.

PDF attachment 1 holds one table (序号 / 化学品名称 [group, member] / CAS号 / 海关商品编号 / 管控类别 / 允许用途);
empty cells continue the row above (merged cells). Note 2 under the table names PFOA (335-67-1) for item 9,
whose CAS cell is '—'. Every CAS printed anywhere in the PDF must end up in the list, else it is a problem.
"""
from __future__ import annotations

import re
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

EXPECTED_ITEMS = 9


def _zh(text: str) -> str:
    """Line wraps inside a PDF cell become spaces; drop those between two non-ASCII characters."""
    return clean(re.sub(r"(?<=[^\x00-\x7f])\s+(?=[^\x00-\x7f])", "", text or ""))


def _tables(path: Path) -> tuple[list[list[str]], str]:
    import pdfplumber  # S: venv only

    rows: list[list[str]] = []
    with pdfplumber.open(str(path)) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        for page in pdf.pages:
            for table in page.extract_tables():
                rows.extend([c or "" for c in r] for r in table)
    return rows, text


def parse(path: Path) -> tuple[list[dict], int, str]:
    rows, text = _tables(path)
    out: list[dict] = []
    group = {"no": "", "name": "", "hs": "", "kind": "", "use": ""}
    items: set[str] = set()
    for r in rows:
        if r and r[0] == "序号":
            continue
        if len(r) == 7:
            no, gname, member, cas, hs, kind, use = r
        elif len(r) == 6:
            no, gname, cas, hs, kind, use = r
            member = ""
        else:
            continue
        if no.strip():
            group = {"no": no.strip(), "name": _zh(gname), "hs": clean(hs), "kind": _zh(kind), "use": _zh(use)}
            items.add(group["no"])
        elif not (member or cas):
            continue  # HS-code-only continuation row
        name = _zh(member) or group["name"]
        hs_here = clean(hs) or group["hs"]
        detail = "; ".join(p for p in (f"序号 {group['no']}", f"类: {group['name']}" if member else "",
                                        f"海关商品编号 {hs_here[:120]}" if hs_here else "", group["kind"],
                                        f"允许用途: {group['use'][:200]}" if group["use"] else "") if p)
        out.append(entry("", name, detail, cas_all=cas_tokens(cas)))
    # Note 2: PFOA 类 → 全氟辛酸 (335-67-1)
    m = re.search(r"PFOA类是指：（i）全氟辛酸（(\d{2,7}-\d{2}-\d)）", text)
    if m:
        out.append(entry("", "全氟辛酸(PFOA)", "序号 9; 注2: PFOA类 = 全氟辛酸 및 그 염·관련 화합물", cas_all=[m.group(1)]))
    return out, len(items), text


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]["list_2023"]
    path = fetch(d["url"], raw_dir / d["file"], offline)
    page = spec["downloads"]["announcement"]
    page_path = fetch(page["url"], raw_dir / page["file"], offline)
    rows, n_items, text = parse(path)
    entries, families, bad = split_entries(rows)
    problems = [f"invalid CAS in source: {bad}"] if bad else []
    missing = sorted(set(cas_tokens(text)) - {e["cas"] for e in entries})
    if missing:
        problems.append(f"CAS printed in the PDF but not parsed: {missing}")
    return {"toxic_restricted": {
        "entries": entries, "family_entries": families, "problems": problems,
        "official_count": EXPECTED_ITEMS, "official_count_basis": "名录 序号 1–9",
        "counted": n_items, "source_version": "中国严格限制的有毒化学品名录(2023年), 生态环境部·商务部·海关总署 公告2023年第32号",
        "notes": [], "files": [file_info(path, d["url"]), file_info(page_path, page["url"])],
    }}
