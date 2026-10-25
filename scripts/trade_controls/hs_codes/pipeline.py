"""Run the sources in order and assemble the database. No source-specific logic here."""
from __future__ import annotations

import json
import sys

from . import build_db, config, report, src_cn_nomenclature, src_ecics, src_kcs


def run() -> dict:
    ecics_dl = src_ecics.download()
    ecics = src_ecics.parse(ecics_dl["payload"])
    cn_dl = src_cn_nomenclature.download()
    cn = src_cn_nomenclature.parse(cn_dl["payload"])
    kcs_dl = src_kcs.download()
    hsk = src_kcs.parse_hs_code(kcs_dl["hs_code"]["payload"])
    kr_class = src_kcs.parse_hs_class(kcs_dl["hs_class"]["payload"])

    hsk_hs6 = {r["hs6"] for r in hsk["rows"]}
    build_db.annotate(ecics["rows"], cn, hsk_hs6)
    for r in ecics["rejected"]:
        r["source"] = src_ecics.SOURCE
    headings = build_db.heading_rows(cn, kr_class, hsk_hs6)

    meta = {
        "retrieved": config.RETRIEVED,
        "ecics_url": config.ECICS_FULL_URL,
        "ecics_info_url": config.ECICS_INFO_URL,
        "ecics_version": f"ECICS public database, last update {ecics_dl['last_update']}",
        "ecics_license": config.ECICS_LICENSE,
        "ecics_raw_file": str(ecics_dl["path"]),
        "ecics_parse_stats": ecics["stats"],
        "cn_url": config.CN_TEXT_URL,
        "cn_version": f"Combined Nomenclature {config.CN_YEAR}",
        "cn_legal_basis": config.CN_LEGAL_BASIS,
        "cn_license": config.CN_LICENSE,
        "cn_counts": {k: len(v) for k, v in cn.items()},
        "kcs_hs_code_url": kcs_dl["hs_code"]["page_url"],
        "kcs_hs_code_version": f"{kcs_dl['hs_code']['data_name']} (updated {kcs_dl['hs_code']['updated']})",
        "kcs_hs_class_url": kcs_dl["hs_class"]["page_url"],
        "kcs_hs_class_version": f"{kcs_dl['hs_class']['data_name']} (updated {kcs_dl['hs_class']['updated']}, sheet year {kr_class['year']})",
        "kcs_license": config.KCS_LICENSE,
        "kcs_parse_stats": hsk["stats"],
        "hsk10_note": ("cas_hs.hsk10 is NULL: KCS publishes no CAS->HSK mapping. Use view "
                       "v_cas_hsk10_candidates (HSK10 lines under the ECICS HS6) as candidates only."),
        "hs6_note": ("hs6 = first 6 digits of the EU CN code from ECICS. HS6 is harmonised "
                     "internationally, but national customs may classify a product differently."),
        "mixture_note": "is_multi_cas=1 rows come from ECICS entries listing several CAS RNs (mixtures/sets).",
    }
    db = build_db.write(ecics["rows"], ecics["rejected"], headings, hsk["rows"], meta)
    summary = report.build(db)
    meta.update({"counts": summary["counts"], "coverage_ncis": summary["coverage"]})
    db = build_db.write(ecics["rows"], ecics["rejected"], headings, hsk["rows"], meta)
    summary["db"] = str(db)
    return summary


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    summary = run()
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0
