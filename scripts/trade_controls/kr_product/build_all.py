"""Entry point: python -I G:\\MSDS\\scripts\\trade_controls\\kr_product\\build_all.py [parser ...]

Builds every kr_product list into backend/data/trade_controls/kr_lists/, then
kr_permits_product.json, KR_PRODUCT_unverified.json and _index_product.json.
With parser names given, only those lists are rebuilt; the permit / unverified /
index files are always rebuilt (lists are read back from disk).
"""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8")

from kr_env import listfile  # noqa: E402
from kr_product import config, report  # noqa: E402


def main(argv: list[str]) -> int:
    selected = argv or config.PARSERS
    permits: list[dict] = []
    for name in config.PARSERS:
        mod = importlib.import_module(f"kr_product.{name}")
        if name in selected:
            for doc in mod.build():
                path = listfile.write(report.fold_unmatched(doc))
                st = doc["stats"]
                print(f"{doc['list_id']:40s} items={st['parsed_items']:5d}/{st['official_item_count']:5d} "
                      f"entries={st['entries']:5d} cas={st['distinct_cas']:5d} fam={st['family_entries']:4d} "
                      f"unm={st['unmatched']:4d} {st['count_check']} -> {path.name}")
        permits.extend(mod.permits())
    print("permits    ->", report.write_permits(permits))
    print("unverified ->", report.write_unverified())
    print("index      ->", report.write_index())
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
