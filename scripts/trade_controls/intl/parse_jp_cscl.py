"""Japan 化審法: 第一種特定化学物質 / 第二種特定化学物質 / 監視化学物質.

Official item list and count: METI PDFs (no CAS printed). CAS numbers: NIHS/NITE J-CHECK, which lists for each
政令 item (or 監視 通し番号) the CAS RNs of substances under it. Items with no J-CHECK CAS stay as family_entries.
Group items (salts, mixtures, 関連物質, several substances) are also kept as family_entries with their example CAS list.
"""
from __future__ import annotations

from pathlib import Path

import jp_jcheck
import jp_meti_pdf
from intl_common import cas_is_valid, entry, fetch, file_info

LABEL = {"class1": "施行令第1条第{n}号", "class2": "施行令第2条第{n}号", "monitoring": "監視化学物質 通し番号 {n}"}


def _build(key: str, meti_rows: list[dict], items: list[dict]) -> dict:
    by_tno = {i["tno"]: i for i in items}
    entries: list[dict] = []
    families: list[dict] = []
    problems: list[str] = []
    no_cas: list[int] = []
    for row in meti_rows:
        n = row["no"]
        label = LABEL[key].format(n=n)
        item = by_tno.get(n)
        subs = item["substances"] if item else []
        bad = [s["cas"] for s in subs if s["cas"] and not cas_is_valid(s["cas"])]
        if bad:
            problems.append(f"{label}: invalid CAS in J-CHECK {bad}")
        good = [s for s in subs if s["cas"] and cas_is_valid(s["cas"])]
        for s in good:
            detail = f"{label}: {row['name']}" + (f"; MITI番号 {s['miti']}" if s["miti"] else "")
            entries.append(entry(s["cas"], s["name"], detail))
        if not good:
            no_cas.append(n)
        if len(good) != 1:
            fam = entry("", row["name"], f"{label}; J-CHECK 収載 CAS {len(good)}件" + ("" if item else " (J-CHECK 未収載)"))
            if good:
                fam["cas_list"] = [s["cas"] for s in good]
            families.append(fam)
    extra = sorted(set(by_tno) - {r["no"] for r in meti_rows})
    if extra:
        problems.append(f"J-CHECK items not in the METI list: {extra}")
    notes = []
    if no_cas:
        notes.append(f"J-CHECK 에 CAS 가 없는 항목(번호): {no_cas} — family_entries 로만 수록")
    return {"entries": entries, "family_entries": families, "problems": problems, "notes": notes,
            "official_count": len(meti_rows), "jcheck_items": len(items)}


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    out: dict = {}
    for key, category in (("class1", 211), ("class2", 212), ("monitoring", 220)):
        pdf = d[f"meti_{key}"]
        pdf_path = fetch(pdf["url"], raw_dir / pdf["file"], offline)
        meti_rows, as_of = jp_meti_pdf.read_rows(pdf_path)
        jc = jp_jcheck.fetch_category(category, raw_dir, offline)
        built = _build(key, meti_rows, jc["items"])
        built["problems"] = jc["problems"] + built["problems"]
        expected = spec["lists"][key].get("expected_count")
        if expected is not None and expected != len(meti_rows):
            built["problems"].append(f"METI PDF rows {len(meti_rows)}, expected {expected}")
        # counted = METI rows matched to a J-CHECK item or kept as a family entry (every row is represented)
        built["counted"] = len(meti_rows)
        built["official_count_basis"] = f"METI {pdf['title']} ({as_of or '日付 표기 없음'}) 행 수"
        built["source_version"] = f"METI {pdf['title']} {as_of}".strip() + f"; NITE J-CHECK ({jc['data_date'] or '갱신일 미표기'} データ更新)"
        built["notes"].insert(0, f"J-CHECK 수록 항목 {built.pop('jcheck_items')}개 / METI 목록 {len(meti_rows)}개")
        built["files"] = [file_info(pdf_path, pdf["url"]), *jc["files"]]
        out[key] = built
    return out
