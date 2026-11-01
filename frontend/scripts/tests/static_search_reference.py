"""Reference answers for test_static_search.cjs, from the pilot's Python client search (static_search.py).

Run:  python -I -B static_search_reference.py <scripts_dir> <queries.json> <out.json> [search_root]
<scripts_dir> holds static_search.py: the pilot's (<pilot>/scripts) or the exporter's (scripts/static_export, then
search_root = the exporter's v1/search). It reads only static files (no database). Writes, per query: search(q, 20) (production path),
search_chemicals(q, 20) (full replica), search_chemicals(q, 5) (autocomplete), and _lean(q, 20).
"""
from __future__ import annotations

import json
import os
import sys


def main() -> None:
    scripts_dir, queries_path, out_path = sys.argv[1:4]
    sys.path.insert(0, scripts_dir)
    from static_search import StaticIndex  # noqa: E402  (imports backend.core.chemical_aliases)

    with open(queries_path, encoding="utf-8") as fh:
        queries = [q for _, q in json.load(fh)]
    idx = StaticIndex(sys.argv[4]) if len(sys.argv) > 4 else StaticIndex()
    out = []
    for q in queries:
        out.append({
            "q": q,
            "search": idx.search(q, 20),
            "full20": idx.search_chemicals(q, 20),
            "auto5": idx.search_chemicals(q, 5),
            "lean20": idx._lean(q, 20),
        })
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False)


if __name__ == "__main__":
    main()
