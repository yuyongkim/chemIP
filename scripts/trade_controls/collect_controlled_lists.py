"""Collect controlled-chemical trade lists keyed by CAS (CWC schedules, Australia Group,
drug precursors) into backend/data/trade_controls/*.json.

Run (pdfplumber lives in the S: venv; -I keeps downloaded files from shadowing modules):
    S:\\chemip_trade_controls_venv\\Scripts\\python.exe -I scripts\\trade_controls\\collect_controlled_lists.py
Options: --offline (re-parse files already in the raw dir), --raw-dir, --out-dir
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "controlled_lists"))

import pipeline  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--offline", action="store_true", help="parse existing raw files, no downloads")
    ap.add_argument("--raw-dir", type=Path, default=None)
    ap.add_argument("--out-dir", type=Path, default=None)
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    report = pipeline.run(args.raw_dir, args.out_dir, args.offline)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if any(r["problems"] or r["cas_checksum_failures"] for r in report.values()) else 0


if __name__ == "__main__":
    raise SystemExit(main())
