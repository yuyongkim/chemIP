"""China 危险化学品目录(2015版) + later adjustments (MEM 2022年第8号, 2026年第3号).

Catalog: the official .doc attachment (MIIT copy of the 10-department announcement 2015年第5号).
The Word binary keeps the table as UTF-16 text; cells end with \\x07, rows end with an extra \\x07.
Columns: 序号 / 品名 / 别名 / CAS号 / 备注(剧毒). Entry 2828 is the generic class entry (no CAS).
2026年第3号 adds 5 chemicals (HTML table on the MEM page). 2022年第8号 renames entry 1674 (柴油) only.
read_catalog() is also used by other CN parsers to map Chinese names to CAS printed in this catalog.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

EXPECTED_2015 = 2828


def _word_text(path: Path) -> str:
    """Document text of a Word 97-2003 .doc, in reading order, via the piece table ([MS-DOC] 2.9.38 Clx)."""
    import struct

    import olefile  # S: venv only

    with olefile.OleFileIO(str(path)) as ole:
        word = ole.openstream("WordDocument").read()
        flags = struct.unpack_from("<H", word, 0x000A)[0]
        table = ole.openstream("1Table" if flags & 0x0200 else "0Table").read()
    fc_clx, lcb_clx = struct.unpack_from("<II", word, 0x01A2)
    clx = table[fc_clx:fc_clx + lcb_clx]
    pos = 0
    while clx[pos] == 0x01:  # Prc entries (formatting) come first
        pos += 3 + struct.unpack_from("<H", clx, pos + 1)[0]
    if clx[pos] != 0x02:
        raise ValueError("piece table not found")
    lcb = struct.unpack_from("<I", clx, pos + 1)[0]
    plc = clx[pos + 5:pos + 5 + lcb]
    n = (lcb - 4) // 12
    cps = struct.unpack_from(f"<{n + 1}I", plc, 0)
    parts: list[str] = []
    for i in range(n):
        fc = struct.unpack_from("<I", plc, (n + 1) * 4 + i * 8 + 2)[0]
        count = cps[i + 1] - cps[i]
        if fc & 0x40000000:  # compressed 8-bit piece
            start = (fc & ~0x40000000) // 2
            parts.append(word[start:start + count].decode("cp1252", errors="replace"))
        else:
            parts.append(word[fc:fc + 2 * count].decode("utf-16le", errors="replace"))
    return "".join(parts)


def read_catalog(path: Path) -> list[dict]:
    """Rows of the 2015 catalog table: {no, name, alias, cas_all, note}."""
    text = _word_text(path)
    start = text.find("序号\x07品名\x07别名\x07CAS号\x07备注\x07\x07")
    if start < 0:
        raise ValueError("catalog table header not found")
    # Every table row is 5 cells + the row-end mark = 6 \x07-separated tokens. Rows with an empty 序号
    # are continuation rows of a vertically merged entry (another concentration of the same CAS).
    tokens = text[start:].split("\x07")[6:]
    rows: list[dict] = []
    for i in range(0, len(tokens) - 5, 6):
        no, name, alias, cas, note, end = (clean(t) for t in tokens[i:i + 6])
        if end or "\r" in tokens[i]:
            break  # table ended (text after the last row)
        if not no:
            if rows and name:
                rows[-1]["variants"].append(name)
            continue
        if not no.isdigit():
            break
        rows.append({"no": int(no), "name": name, "alias": alias, "cas_all": cas_tokens(cas), "cas_text": cas,
                     "note": note, "variants": []})
    return rows


def read_additions(path: Path) -> list[dict]:
    """5 chemicals added by 2026年第3号 (first table on the page)."""
    page = path.read_text(encoding="utf-8", errors="replace")
    i = page.find("新增化学品信息", page.find("附件："))
    i = page.find("新增化学品信息", i + 10)
    rows: list[dict] = []
    for tr in re.findall(r"<tr.*?</tr>", page[i:], re.S):
        cells = [clean(html.unescape(re.sub(r"<[^>]+>", "", c))) for c in re.findall(r"<td.*?</td>", tr, re.S)]
        if len(cells) < 5:
            continue
        if cells[0] == "序号":
            if rows:
                break  # the table is repeated further down the page
            continue
        rows.append({"no": cells[0], "name": cells[1], "alias": cells[2], "cas_all": cas_tokens(cells[3]),
                     "cas_text": cells[3], "note": cells[4]})
    return rows


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    cat_path = fetch(d["catalog_2015"]["url"], raw_dir / d["catalog_2015"]["file"], offline)
    add_path = fetch(d["additions_2026_3"]["url"], raw_dir / d["additions_2026_3"]["file"], offline)
    adj_path = fetch(d["adjust_2022_8"]["url"], raw_dir / d["adjust_2022_8"]["file"], offline)
    base = read_catalog(cat_path)
    added = read_additions(add_path)
    problems = []
    if len(base) != EXPECTED_2015 or base[-1]["no"] != EXPECTED_2015:
        problems.append(f"2015 catalog rows {len(base)} (last no {base[-1]['no'] if base else None}), expected {EXPECTED_2015}")
    if len(added) != 5:
        problems.append(f"2026年第3号 additions parsed {len(added)}, expected 5")
    rows = []
    misprinted = []
    for pos, r in enumerate(base, start=1):
        # The .doc prints a few 序号 wrong (718 twice, 1851 for 1951, 2009 twice); the row position is the number.
        detail = [f"序号 {pos}"]
        if r["no"] != pos:
            misprinted.append(f"{pos}(印 {r['no']})")
        if r["alias"]:
            detail.append(f"别名: {r['alias']}")
        if r["variants"]:
            detail.append("另列: " + " / ".join(r["variants"]))
        if r["note"]:
            detail.append(r["note"])
        if pos == 1674:
            detail.append("2022年第8号: 品名 '柴油[闭杯闪点≤60℃]' → '柴油'(2023-01-01 施行)")
        rows.append(entry("", r["name"], "; ".join(detail), cas_all=r["cas_all"]))
    for r in added:
        detail = "2026年第3号公告 新增(2026-04-09 公布·施行)" + (f"; 别名: {r['alias']}" if r["alias"] else "")
        rows.append(entry("", r["name"], detail, cas_all=r["cas_all"]))
    entries, families, bad = split_entries(rows)
    if bad:
        problems.append(f"invalid CAS in source: {bad}")
    severe = sum(1 for r in base if "剧毒" in r["note"])
    return {"hazchem": {
        "entries": entries, "family_entries": families, "problems": problems,
        "official_count": EXPECTED_2015 + 5, "official_count_basis": "2015版 2828 条 + 2026年第3号 新增 5 种",
        "counted": len(base) + len(added),
        "source_version": "危险化学品目录(2015版), 2022年第8号·2026年第3号 调整 반영",
        "notes": [f"剧毒化学品(备注 '剧毒') {severe} 条", "序号 2828 은 类属条目(CAS 없음, family_entries).",
                  f"원본 .doc 의 序号 오식 {len(misprinted)}곳은 행 위치로 번호를 매김: {', '.join(misprinted)}"],
        "files": [file_info(cat_path, d["catalog_2015"]["url"]), file_info(add_path, d["additions_2026_3"]["url"]),
                  file_info(adj_path, d["adjust_2022_8"]["url"])],
    }}
