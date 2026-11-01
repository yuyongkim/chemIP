"""Entry point: parse the downloaded OEL sources and write the `oel` and `sources` rows of data/portal_facts.db.

    python -I -B G:\\MSDS\\scripts\\portal_build\\oel_build.py [--only kr_moel_notice,eu_ioelv]

Fetch first (oel_fetch.py, oel_fetch_browser.cjs). Each source replaces only its own rows (source_id), one short
transaction per source, so the KOSHA MSDS §8 rows of msds_facts.py (another source) are never touched.
Link-only sources (ACGIH, GESTIS) get a `sources` row and no values. Report: data/portal_raw/oel/build_report.json.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import oel_eu  # noqa: E402
import oel_kr_moel  # noqa: E402
import oel_raw  # noqa: E402
import oel_us_niosh  # noqa: E402
import oel_us_osha  # noqa: E402
import portal_db  # noqa: E402
from oel_values import dedupe  # noqa: E402

PARSERS = {
    "kr_moel_notice": oel_kr_moel.parse,
    "us_osha_z": oel_us_osha.parse_z,
    "us_osha_specific": oel_us_osha.parse_specific,
    "us_niosh_npg": oel_us_niosh.parse,
    "eu_ioelv": oel_eu.parse_ioelv,
    "eu_boelv": oel_eu.parse_boelv,
}
COLUMNS = ["cas", "jurisdiction", "kind", "value", "unit", "notation", "as_of", "source_id"]
REPORT = "build_report.json"


def source_row(src: dict) -> dict:
    return {"name": src["name"], "url": src["url"], "license": src["license"],
            "retrieved_at": oel_raw.retrieved_at(src["source_id"]) or None}


def default_as_of(src: dict) -> str:
    return src.get("as_of") or oel_raw.retrieved_at(src["source_id"])


def build(only: set[str] | None = None, log=print) -> dict:
    conn = portal_db.connect()
    report = {"built_at": time.strftime("%Y-%m-%d %H:%M"), "sources": {}}
    try:
        for src in oel_raw.registry()["sources"]:
            sid = src["source_id"]
            if only and sid not in only:
                continue
            with conn:
                portal_db.put_sources(conn, {sid: source_row(src)})
            if src["method"] == "link_only":
                report["sources"][sid] = {"link_only": True}
                continue
            rows, stats = PARSERS[sid]()
            rows = dedupe(rows)
            as_of = default_as_of(src)
            n = portal_db.replace_rows(conn, "oel", [sid], COLUMNS, [
                (r["cas"], r["jurisdiction"], r["kind"], r["value"], r["unit"], r["notation"], r.get("as_of") or as_of, sid)
                for r in rows])
            report["sources"][sid] = {**stats, "inserted": n, "as_of": as_of}
            log(f"{sid}: {n} rows, {stats.get('cas')} CAS")
    finally:
        conn.close()
    path = os.path.join(oel_raw.registry()["raw_dir"], REPORT)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    return report


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    build({s for s in args.only.split(",") if s} or None)


if __name__ == "__main__":
    main()
