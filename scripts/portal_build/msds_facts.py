"""Build properties, transport and the KR oel rows of portal_facts.db from the KOSHA MSDS records in terminology.db.

    python -B G:\\MSDS\\scripts\\portal_build\\msds_facts.py [--report path.json]

- terminology.db is opened read-only. msds_details sections 3 (CAS), 8 (H0202), 9 (properties) and 14 (transport).
- CAS of a record: the chemical_terms row with description "KOSHA_ID:<chem_id>" if there is one, else the single CAS
  of section 3 (C06; spreadsheet-damaged numbers are repaired only when the check digit then passes, cas_utils).
- Replaces only its own rows (source ids in SOURCES), so oel rows of other builders (oel_public.py) stay.
- Prints and returns coverage counts (records, CAS, rows per property, numeric share).
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import sys
import time

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import portal_db  # noqa: E402
from cas_utils import is_cas, repair_cas  # noqa: E402
from msds_oel import has_text, parse_oel  # noqa: E402
from msds_transport import transport_row  # noqa: E402
from msds_values import PROPS, parse_property  # noqa: E402
from msds_xml import parse_items  # noqa: E402

SRC_S9, SRC_S14, SRC_S8 = "kosha_msds_s9", "kosha_msds_s14", "kosha_msds_s8"
_KOSHA = {"url": "https://msds.kosha.or.kr", "license": "공공데이터포털(data.go.kr) 한국산업안전보건공단 화학물질정보(MSDS) — 이용허락범위 제한 없음. 참고용"}
SOURCES = {
    SRC_S9: {"name": "KOSHA MSDS §9", **_KOSHA},
    SRC_S14: {"name": "KOSHA MSDS §14", **_KOSHA},
    SRC_S8: {"name": "KOSHA MSDS §8", **_KOSHA},
}
SECTIONS = (3, 8, 9, 14)


def kosha_cas_map(conn) -> dict[str, str]:
    rows = conn.execute("SELECT substr(description, 10), cas_no FROM chemical_terms WHERE description LIKE 'KOSHA_ID:%'")
    return {cid: (cas or "").strip() for cid, cas in rows}


def records(conn):
    """(chem_id, {section_no: {code: text}}) for every MSDS record, in chem_id order."""
    marks = ",".join("?" * len(SECTIONS))
    cur = conn.execute(f"SELECT chem_id, section_no, xml_data FROM msds_details WHERE section_no IN ({marks}) ORDER BY chem_id", SECTIONS)
    current, secs = None, {}
    for chem_id, sec, xml in cur:
        if chem_id != current:
            if current is not None:
                yield current, secs
            current, secs = chem_id, {}
        secs[sec] = parse_items(xml)
    if current is not None:
        yield current, secs


def record_cas(chem_id: str, secs: dict, kosha: dict[str, str]) -> tuple[str | None, str]:
    """(CAS, how it was found) — 'terms', 'section3', 'section3_repaired', or None."""
    if chem_id in kosha:
        cas = kosha[chem_id]
        return (cas, "terms") if is_cas(cas) else (None, "terms_invalid")
    raw = (secs.get(3) or {}).get("C06", "")
    fixed = repair_cas(raw)
    if not fixed:
        return None, "none"
    return fixed, "section3" if fixed == raw.strip() else "section3_repaired"


def msds_cas_map(conn) -> dict[str, str]:
    """{MSDS chem_id: CAS} for every MSDS record whose CAS is known (record_cas rules, section 3 only)."""
    kosha = kosha_cas_map(conn)
    out = {}
    for chem_id, xml in conn.execute("SELECT chem_id, xml_data FROM msds_details WHERE section_no = 3"):
        cas, _ = record_cas(chem_id, {3: parse_items(xml)}, kosha)
        if cas:
            out[chem_id] = cas
    return out


def build(term_db: str = portal_db.TERM_DB, portal_path: str = portal_db.PORTAL_DB, log=print) -> dict:
    t0 = time.time()
    src = portal_db.ro_connect(term_db)
    kosha = kosha_cas_map(src)
    props, trans, oel, oel_text = [], [], [], []
    stats = collections.Counter()
    per_prop, per_prop_num, cas_with = collections.Counter(), collections.Counter(), collections.defaultdict(set)
    for chem_id, secs in records(src):
        stats["records"] += 1
        cas, how = record_cas(chem_id, secs, kosha)
        stats[f"cas_{how}"] += 1
        if not cas:
            continue
        for code in PROPS:
            for row in parse_property(code, (secs.get(9) or {}).get(code, "")):
                props.append((cas, row["prop"], row["value_text"], row["value_num"], row["unit"], row["condition"],
                              row["origin"], chem_id, SRC_S9))
                per_prop[row["prop"]] += 1
                per_prop_num[row["prop"]] += row["value_num"] is not None
                cas_with["properties"].add(cas)
        t = transport_row(secs.get(14) or {})
        if t:
            trans.append((cas, t["un_number"], t["proper_name"], t["hazard_class"], t["packing_group"],
                          t["marine_pollutant"], t["ems"], None, chem_id, SRC_S14))
            cas_with["transport"].add(cas)
        h = (secs.get(8) or {}).get("H0202", "")
        if has_text(h):
            oel_text.append((cas, "KR", chem_id, h, SRC_S8))
            for r in parse_oel(h):
                oel.append((cas, "KR", r["kind"], r["value"], r["unit"], r["notation"], None, SRC_S8))
                cas_with["oel_kr"].add(cas)
        cas_with["any_record"].add(cas)
    src.close()
    oel = list(dict.fromkeys(oel))  # the same CAS may have several MSDS records quoting the same limit

    retrieved = time.strftime("%Y-%m-%d", time.localtime(os.path.getmtime(term_db)))
    dst = portal_db.connect(portal_path)
    portal_db.put_sources(dst, {k: {**v, "retrieved_at": retrieved} for k, v in SOURCES.items()})
    dst.commit()
    n_props = portal_db.replace_rows(dst, "properties", [SRC_S9], ["cas", "prop", "value_text", "value_num", "unit", "condition",
                                                                    "origin", "chem_id", "source_id"], props)
    n_trans = portal_db.replace_rows(dst, "transport", [SRC_S14], ["cas", "un_number", "proper_name", "hazard_class", "packing_group",
                                                                    "marine_pollutant", "ems", "erg_guide", "chem_id", "source_id"], trans)
    n_oel = portal_db.replace_rows(dst, "oel", [SRC_S8], ["cas", "jurisdiction", "kind", "value", "unit", "notation", "as_of", "source_id"], oel)
    n_txt = portal_db.replace_rows(dst, "oel_text", [SRC_S8], ["cas", "jurisdiction", "chem_id", "text", "source_id"], oel_text)
    dst.close()
    report = {
        "records": stats["records"],
        "cas_found": {k[4:]: v for k, v in stats.items() if k.startswith("cas_")},
        "cas_with": {k: len(v) for k, v in cas_with.items()},
        "rows": {"properties": n_props, "transport": n_trans, "oel_kr": n_oel, "oel_text": n_txt},
        "properties": {p: {"rows": per_prop[p], "numeric": per_prop_num[p]} for p in sorted(per_prop)},
        "secs": round(time.time() - t0, 1),
    }
    log(json.dumps(report, ensure_ascii=False, indent=1))
    return report


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", default="")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    report = build()
    if a.report:
        with open(a.report, "w", encoding="utf-8") as fh:
            json.dump(report, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
