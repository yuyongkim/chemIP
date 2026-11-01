"""Fill reactive_class and class_pair_rules of portal_facts.db (service 7, storage compatibility matrix).

    python -B G:\\MSDS\\scripts\\portal_build\\reactive_class.py [--report path.json]

- reactive_class: one row per (CAS, system, class) — systems kr (위험물 유별, KOSHA MSDS §15), un (UN transport class,
  §14) and ghs (reactive groups from the GHS classification of §2 and of CLP Annex VI). Rules: reactive_groups.py and
  safety_rules/compat_rules.json. terminology.db is opened read-only; the Annex VI table is read from its xlsx (annex6.py).
- class_pair_rules: every pair rule of the three systems (kr 혼재 기준 matrix, IMDG 7.2.4 table, ChemIP GHS pair rules).
- Only this script's rows are replaced (source ids in SOURCES). The tables are created IF NOT EXISTS (portal_db).
The static file g/reactive_class.json is written from these rows by scripts/static_export/safety_tools.py.
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

import annex6  # noqa: E402
import ghs_parse  # noqa: E402
import portal_db  # noqa: E402
import reactive_groups  # noqa: E402
import safety_rules  # noqa: E402
from msds_facts import kosha_cas_map, record_cas  # noqa: E402
from msds_xml import parse_items  # noqa: E402

SRC_S2, SRC_S14, SRC_S15, SRC_ANNEX6 = "kosha_msds_s2", "kosha_msds_s14", "kosha_msds_s15", annex6.SOURCE_ID
SECTIONS = (2, 3, 9, 14, 15)
_KOSHA = {"url": "https://msds.kosha.or.kr", "license": "공공데이터포털(data.go.kr) 한국산업안전보건공단 화학물질정보(MSDS) — 이용허락범위 제한 없음. 참고용"}
SOURCES = {
    SRC_S2: {"name": "KOSHA MSDS §2", **_KOSHA},
    SRC_S14: {"name": "KOSHA MSDS §14", **_KOSHA},
    SRC_S15: {"name": "KOSHA MSDS §15", **_KOSHA},
    SRC_ANNEX6: {k: annex6.SOURCE[k] for k in ("name", "url", "license")},
}
SYSTEM_SOURCE = {"kr": SRC_S15, "un": SRC_S14, "ghs": SRC_S2}


def rule_sources() -> dict[str, dict]:
    """Sources of the pair rules (compat_rules.json "sources" for the three systems)."""
    rules = safety_rules.compat()
    return {rules["systems"][s]["source"]: rules["sources"][rules["systems"][s]["source"]] for s in ("kr", "un", "ghs")}


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


def names_by_cas(conn) -> dict[str, list[str]]:
    out: dict[str, list[str]] = collections.defaultdict(list)
    for name, name_en, cas in conn.execute("SELECT name, name_en, cas_no FROM chemical_terms WHERE cas_no IS NOT NULL AND cas_no != ''"):
        for n in (name, name_en):
            n = (n or "").strip()
            if n and n not in out[cas] and len(out[cas]) < 6:
                out[cas].append(n)
    return out


def kosha_rows(chem_id: str, secs: dict, cas: str, names: list[str]) -> list[tuple]:
    """reactive_class rows of one KOSHA MSDS record."""
    s2, s9, s14, s15 = (secs.get(n) or {} for n in (2, 9, 14, 15))
    hazards = ghs_parse.kosha_classification(s2.get("B02"))
    classes = reactive_groups.substance_classes(
        hazards=hazards, names=names, ph=reactive_groups.ph_value(s9.get("I08")),
        s14_n06=s14.get("N06"), s15_o06=s15.get("O06"))
    return [(cas, system, code, basis, SYSTEM_SOURCE[system]) for system, code, basis in classes]


def annex6_rows(cas: str, entries: list[dict], names: list[str]) -> list[tuple]:
    """reactive_class rows from the Annex VI entries of a CAS (ghs system only; basis prefixed "clp:")."""
    hazards = list(dict.fromkeys(h for e in entries for h in e["hazards"]))
    euh = sorted({c for e in entries for c in e["euh"]})
    groups = reactive_groups.ghs_groups(hazards, names + [e["name"] for e in entries], None, euh)
    return [(cas, "ghs", g, f"clp:{b}", SRC_ANNEX6) for g, b in groups]


def pair_rule_rows() -> list[tuple]:
    """class_pair_rules rows: (system, class_a, class_b, outcome, note, source_id). Each unordered pair once."""
    rules = safety_rules.compat()
    out = []
    for system in ("kr", "un"):
        s = rules["systems"][system]
        order = s["matrix_order"]
        for i, a in enumerate(order):
            for j in range(i, len(order)):
                code = s["matrix"][i][j]
                if code == "-":
                    continue
                outcome = s.get("outcome_of", {}).get(code, code)
                note = s["notes"].get(code, {}).get("ko", "")
                out.append((system, a, order[j], outcome, f"{code} {note}".strip() if system == "un" else note, s["source"]))
    g = rules["systems"]["ghs"]
    for a, b, outcome, note in g["pairs"]:
        out.append(("ghs", a, b, outcome, g["notes"][note]["ko"], g["source"]))
    return out


def build(term_db: str = portal_db.TERM_DB, portal_path: str = portal_db.PORTAL_DB, annex_xlsx: str = annex6.ANNEX6_XLSX, log=print) -> dict:
    t0 = time.time()
    src = portal_db.ro_connect(term_db)
    kosha = kosha_cas_map(src)
    names = names_by_cas(src)
    rows: list[tuple] = []
    stats = collections.Counter()
    for chem_id, secs in records(src):
        stats["records"] += 1
        cas, _ = record_cas(chem_id, secs, kosha)
        if not cas:
            stats["records_no_cas"] += 1
            continue
        rows += kosha_rows(chem_id, secs, cas, names.get(cas, []))
    src.close()
    annex = annex6.read_annex6(annex_xlsx)
    for cas, entries in annex["entries"].items():
        rows += annex6_rows(cas, entries, names.get(cas, []))
    rows = list(dict.fromkeys(rows))  # several MSDS records of one CAS give the same class
    pairs = pair_rule_rows()

    retrieved = time.strftime("%Y-%m-%d", time.localtime(os.path.getmtime(term_db)))
    annex_date = time.strftime("%Y-%m-%d", time.localtime(os.path.getmtime(annex_xlsx)))
    dst = portal_db.connect(portal_path)
    srcs = {k: {**v, "retrieved_at": annex_date if k == SRC_ANNEX6 else retrieved} for k, v in SOURCES.items()}
    srcs.update({k: {**v, "retrieved_at": time.strftime("%Y-%m-%d")} for k, v in rule_sources().items()})
    portal_db.put_sources(dst, srcs)
    dst.commit()
    n_rc = portal_db.replace_rows(dst, "reactive_class", list(SOURCES), ["cas", "system", "class_code", "basis", "source_id"], rows)
    n_pr = portal_db.replace_rows(dst, "class_pair_rules", list(rule_sources()), ["system", "class_a", "class_b", "outcome", "note", "source_id"], pairs)
    dst.close()
    per = collections.Counter((r[1], r[2]) for r in rows)
    report = {
        "records": stats["records"], "records_no_cas": stats["records_no_cas"],
        "annex6": {k: annex[k] for k in ("rows", "rows_no_cas", "atp_max")} | {"cas": len(annex["entries"])},
        "rows": {"reactive_class": n_rc, "class_pair_rules": n_pr},
        "cas_with_class": len({r[0] for r in rows}),
        "per_class": {f"{s}:{c}": n for (s, c), n in sorted(per.items())},
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
