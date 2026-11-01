"""Official-source country lists -> terminology.db intl_regulatory (US DOT HMT + RQ, Japan PRTR / ISHL / 化審法 優先評価,
Canada NPRI). Parsers: scripts/country_lists_official/ (README.md has the file table). Sources, URLs and licences:
scripts/country_lists_official/sources.json. Raw files + manifest: data/portal_raw/intl_reg/<source>/.

Safe to re-run: only the regulation codes owned here are deleted and re-inserted (other loaders keep theirs).
import_intl_regulatory.py empties the whole table — run this (and load_country_lists_from_epc.py) again after it.

    python -B scripts/load_country_lists_official.py                  # download + parse, print counts (dry run)
    python -B scripts/load_country_lists_official.py --offline        # parse the raw files already on disk
    python -B scripts/load_country_lists_official.py --apply          # + write the DB, audit CSV and report
    python -B scripts/load_country_lists_official.py --only jp_ishl   # one source
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE), str(HERE / "country_lists_official")]

import ca_npri  # noqa: E402
import jp_cscl_priority  # noqa: E402
import jp_ishl  # noqa: E402
import jp_prtr  # noqa: E402
import raw  # noqa: E402
import substance_index  # noqa: E402
import us_dot_hmt  # noqa: E402

ROOT = HERE.parent
DB_PATH = Path(os.environ.get("TERMINOLOGY_DB_PATH", ROOT / "data" / "terminology.db"))
AUDIT_CSV = ROOT / "data" / "country_lists_official_audit.csv"
REPORT = ROOT / "data" / "portal_raw" / "intl_reg" / "load_report.json"
OWNED = {"us_dot_hmt": us_dot_hmt.OWNED, "jp_prtr": jp_prtr.OWNED, "jp_ishl": jp_ishl.OWNED,
         "jp_cscl_priority": jp_cscl_priority.OWNED, "ca_npri": ca_npri.OWNED}


def _date(name: str, file: str) -> str:
    m = re.search(r"/full/(\d{4}-\d{2}-\d{2})/", (raw.read_manifest(name)["files"].get(file) or {}).get("url", ""))
    return m.group(1) if m else raw.retrieved(name, file)


def load_us_dot_hmt():
    x49 = raw.read_bytes("us_dot_hmt", "ecfr_49_172_101.xml").decode("utf-8")
    x40 = raw.read_bytes("us_dot_hmt", "ecfr_40_302_4.xml").decode("utf-8")
    d49, d40 = _date("us_dot_hmt", "ecfr_49_172_101.xml"), _date("us_dot_hmt", "ecfr_40_302_4.xml")
    hmt, s1 = us_dot_hmt.hmt_rows(x49, substance_index.un_by_cas(), substance_index.name_index(),
                                  f"49 CFR 172.101 Hazardous Materials Table (eCFR, up to date as of {d49})")
    rq, s2 = us_dot_hmt.rq_rows(x49, x40, f"49 CFR 172.101 Appendix A, Table 1 hazardous substances (eCFR {d49}); "
                                          f"CAS from 40 CFR 302.4 (eCFR {d40})")
    return hmt + rq, {us_dot_hmt.CODE_HMT: s1, us_dot_hmt.CODE_RQ: s2}


def load_jp_prtr():
    rows, st = jp_prtr.parse(raw.read_bytes("jp_prtr", "R3_PRTR_SDS_ALL_LIST.xlsx"),
                             "化管法施行令 別表第一・第二 (令和3年政令第199号, 2023-04-01 施行); CAS: NITE 化管法物質CAS登録番号入りリスト "
                             f"(retrieved {raw.retrieved('jp_prtr', 'R3_PRTR_SDS_ALL_LIST.xlsx')})")
    return rows, {"JP_PRTR": st}


def load_jp_ishl():
    label, s1, by_name = jp_ishl.parse_label_list(
        raw.read_bytes("jp_ishl", "label_sds_list_20250401.xlsx"),
        "労働安全衛生法 第57条・第57条の2 (施行令 第18条・第18条の2, 則別表第2): 厚生労働省 職場のあんぜんサイト "
        "ラベル表示・SDS交付等の義務対象物質一覧 (2025-04-01 施行分・2026-04-01 追加分)")
    law, s2 = jp_ishl.statute_rows(raw.read_bytes("jp_ishl", "egov_347CO0000000318.xml"), by_name,
                                   "労働安全衛生法施行令 別表第三 特定化学物質 (特定化学物質障害予防規則) — e-Gov 法令API",
                                   "労働安全衛生法施行令 別表第六の二 有機溶剤 (有機溶剤中毒予防規則) — e-Gov 法令API")
    return label + law, {jp_ishl.LABEL: s1, **s2}


def load_jp_cscl_priority(offline: bool):
    rows, st = jp_cscl_priority.collect(raw.source_dir("jp_cscl_priority"), offline,
                                        "化審法 第2条第5項 優先評価化学物質 (官報公示); CAS: NITE J-CHECK")
    return rows, {jp_cscl_priority.CODE: st}


def load_ca_npri():
    rows, st = ca_npri.parse(raw.read_bytes("ca_npri", "npri_substance_list_2025_2027.xlsx"),
                             "Canada NPRI substance list 2025-2027 (Canada Gazette Part I notice; ECCC Excel 2026-04-10)")
    return rows, {ca_npri.CODE: st}


LOADERS = {"us_dot_hmt": load_us_dot_hmt, "jp_prtr": load_jp_prtr, "jp_ishl": load_jp_ishl,
           "jp_cscl_priority": load_jp_cscl_priority, "ca_npri": load_ca_npri}


def match_method(detail: str) -> str:
    m = re.search(r"match: ([^|]*)", detail)
    return m.group(1).strip() if m else ""


def apply(rows, codes) -> None:
    conn = sqlite3.connect(DB_PATH, timeout=120)
    try:
        with conn:
            marks = ",".join("?" * len(codes))
            conn.execute(f"DELETE FROM intl_regulatory WHERE regulation IN ({marks})", codes)
            conn.executemany("INSERT INTO intl_regulatory (cas_no, regulation, detail, source, chemical_name) VALUES (?,?,?,?,?)",
                             [(r.cas_no, r.regulation, r.detail, r.source, r.chemical_name) for r in rows])
    finally:
        conn.close()


def write_audit(rows) -> None:
    with open(AUDIT_CSV, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["cas_no", "regulation", "chemical_name", "match_method", "detail", "source"])
        for r in rows:
            w.writerow([r.cas_no, r.regulation, r.chemical_name, match_method(r.detail), r.detail, r.source])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--offline", action="store_true", help="do not download; parse the raw files on disk")
    ap.add_argument("--only", choices=sorted(LOADERS), action="append")
    args = ap.parse_args()
    names = args.only or list(LOADERS)
    rows, stats = [], {}
    for name in names:
        raw.fetch_source(name, offline=args.offline)
        got, st = LOADERS[name](args.offline) if name == "jp_cscl_priority" else LOADERS[name]()
        rows += got
        stats.update(st)
        print(f"{name}: {len(got)} rows, {len({r.cas_no for r in got})} CAS", flush=True)
    codes = [c for n in names for c in OWNED[n]]
    stats["_by_code"] = {c: {"rows": sum(1 for r in rows if r.regulation == c),
                             "cas": len({r.cas_no for r in rows if r.regulation == c})} for c in codes}
    print(json.dumps(stats["_by_code"], ensure_ascii=False))
    if args.apply:
        apply(rows, codes)
        if not args.only:
            write_audit(rows)
        REPORT.write_text(json.dumps(stats, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"applied {len(rows)} rows -> {DB_PATH.name}; report -> {REPORT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
