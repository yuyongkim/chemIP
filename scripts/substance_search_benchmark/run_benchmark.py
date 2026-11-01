"""Entry: run every benchmark query against one target and write the report.

  python run_benchmark.py --target backend|public|static|inproc --label before
"""
from __future__ import annotations

import argparse
import datetime
import json
import time

import config
import metrics
import provenance
import report
from targets import get_target


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True, choices=[*config.TARGETS, "static", "inproc"])
    ap.add_argument("--label", required=True)
    args = ap.parse_args()
    with open(config.CASES, encoding="utf-8") as fh:
        cases = json.load(fh)["cases"]
    search, rows, t0 = get_target(args.target), [], time.time()
    for case in cases:
        for qtype in config.QUERY_TYPES:
            for q in case["queries"][qtype]:
                items = search(q)
                top = items[0] if items else {}
                rows.append({"type": qtype, "q": q, "cas": case["cas"], "categories": case["categories"],
                             "rank": metrics.rank_of(items, case["cas"]),
                             "top1": f"{top.get('cas_no') or ''} {top.get('name') or ''}".strip()})
    provenance.tag(rows)
    types, cats = metrics.by_type(rows), metrics.by_category(rows)
    prov = metrics.iupac_by_provenance(rows, provenance.PROVENANCES)
    meta = {"when": datetime.datetime.now().isoformat(timespec="seconds"), "target": args.target,
            "cases": len(cases), "queries": len(rows), "seconds": round(time.time() - t0, 1)}
    paths = report.write(args.label, args.target, rows, types, cats, meta, prov)
    for t, s in types.items():
        print(f"{t:6} n={s['n']:4} rank1={s['rank1_rate']} top3={s['topk_rate']}")
    for p, s in prov.items():
        print(f"iupac/{p:13} n={s['n']:4} rank1={s['rank1_rate']} top3={s['topk_rate']}")
    for c, per in cats.items():
        print(f"{c:18} n={per['all']['n']:4} rank1={per['all']['rank1_rate']} top3={per['all']['topk_rate']}")
    print("wrote", *paths)


if __name__ == "__main__":
    main()
