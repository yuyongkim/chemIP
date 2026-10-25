"""Entry point: python -I G:\\MSDS\\scripts\\trade_controls\\kr_env\\run_all.py

Fetches the current law texts from law.go.kr (cached under RAW_ROOT), writes one JSON per
list to backend/data/trade_controls/kr_lists/, an _index.json summary, and
backend/data/trade_controls/kr_permits_env.json.
"""
from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from kr_env import config, crosscheck, listfile, permits_env  # noqa: E402

PROBE_CAS = ["71-43-2", "108-88-3", "50-00-0", "7664-41-7"]


def main() -> int:
    docs = []
    for mod_name in config.PARSERS:
        mod = importlib.import_module(f"kr_env.{mod_name}")
        for doc in mod.build_all():
            path = listfile.write(doc)
            docs.append(doc)
            s = doc["stats"]
            print(f"{doc['list_id']:<36} items={s['official_item_count']:>4} entries={s['entries']:>5} "
                  f"cas={s['distinct_cas']:>5} family={s['family_entries']:>3} unmatched={s['unmatched']:>3} "
                  f"check={s['count_check']}  -> {path.name}")
    permits = permits_env.build()
    permits_env.write(permits)
    print(f"permits: {len(permits['permits'])} -> {config.PERMITS_OUT}")
    index = {
        "retrieved": config.RETRIEVED,
        "lists": [{"list_id": d["list_id"], "law": d["law"], "title": d["title"], "legal_basis": d["legal_basis"],
                   "amended_on": d["amended_on"], "stats": d["stats"], "validation_problems": d["validation_problems"],
                   "file": f"{d['list_id']}.json"} for d in docs],
        "crosscheck": {"kosha_section15": crosscheck.kosha_section15(docs), "ncis": crosscheck.ncis_overlap()},
        "probe_memberships": crosscheck.memberships(docs, PROBE_CAS),
        "unverified": [{"list_id": d["list_id"], "unmatched": [u["name"] for u in d["unmatched"]]}
                       for d in docs if d["unmatched"]],
    }
    (config.OUT_DIR / "_index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    bad = [d["list_id"] for d in docs if d["validation_problems"]]
    if bad:
        print("VALIDATION PROBLEMS:", bad)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
