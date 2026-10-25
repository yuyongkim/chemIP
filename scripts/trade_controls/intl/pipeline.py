"""Read sources/*.json, run each one's parser, build and write one JSON per list.

sources/<name>.json: {"parser": "<module>", "downloads": {...}, "lists": {"<key>": {metadata, "file": "<out>.json"}}}
A parser module exposes collect(spec, raw_dir, offline) -> {"<key>": parsed} (see build.make_list for parsed).
Adding a source = one new sources/*.json + one parse_*.py. Nothing here changes.
"""
from __future__ import annotations

import datetime as dt
import importlib
import json
import traceback
from pathlib import Path

from build import make_list
from intl_common import write_json

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[2]
RAW_DIR = Path(r"S:\chemip_trade_controls_raw\intl")
OUT_DIR = PROJECT / "backend" / "data" / "trade_controls" / "intl_lists"


def load_specs(only: set[str] | None = None) -> list[tuple[str, dict]]:
    specs = []
    for path in sorted((HERE / "sources").glob("*.json")):
        if only and path.stem not in only:
            continue
        specs.append((path.stem, json.loads(path.read_text(encoding="utf-8"))))
    return specs


def run(raw_dir: Path | None = None, out_dir: Path | None = None, offline: bool = False,
        only: set[str] | None = None) -> dict:
    raw_dir = raw_dir or RAW_DIR
    out_dir = out_dir or OUT_DIR
    today = dt.date.today().isoformat()
    report: dict = {}
    for name, spec in load_specs(only):
        try:
            parser = importlib.import_module(spec["parser"])
            results = parser.collect(spec, raw_dir, offline)
        except Exception as exc:  # one broken source must not stop the others
            report[name] = {"error": f"{exc}", "trace": traceback.format_exc(limit=3)}
            continue
        for key, meta in spec["lists"].items():
            parsed = results.get(key)
            if parsed is None:
                report[f"{name}/{key}"] = {"error": "parser returned nothing"}
                continue
            data = make_list(meta, parsed, today)
            write_json(out_dir / meta["file"], data)
            report[f"{name}/{key}"] = {"file": meta["file"], **data["stats"], "problems": data["validation_problems"]}
    return report
