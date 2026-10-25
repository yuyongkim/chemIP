"""Collect destination-country chemical lists (EU / US / CN / JP ...) keyed by CAS into
backend/data/trade_controls/intl_lists/*.json.

Run (packages live in the S: venv; -I keeps downloaded files from shadowing modules):
    S:\\chemip_trade_controls_venv\\Scripts\\python.exe -I scripts\\trade_controls\\collect_intl_lists.py
Options: --offline (re-parse raw files), --only echa,eu_pic (sources/*.json stems), --raw-dir, --out-dir
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))            # controlled_lists.common (shared CAS / JSON helpers)
sys.path.insert(0, str(HERE / "intl"))   # collectors

import pipeline  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--offline", action="store_true", help="parse existing raw files, no downloads")
    ap.add_argument("--only", default="", help="comma-separated sources/*.json stems")
    ap.add_argument("--raw-dir", type=Path, default=None)
    ap.add_argument("--out-dir", type=Path, default=None)
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    only = {s.strip() for s in args.only.split(",") if s.strip()} or None
    report = pipeline.run(args.raw_dir, args.out_dir, args.offline, only)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if any(r.get("error") or r.get("problems") for r in report.values()) else 0


if __name__ == "__main__":
    raise SystemExit(main())
