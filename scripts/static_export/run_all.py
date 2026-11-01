"""Entry point. Run:  python -I -B G:\\MSDS\\scripts\\static_export\\run_all.py [--steps a,b,..] [--workers N]

Steps (default: all but upload): search, globals, pages, extras, tceq, provisions, guide_index, guide_text, reg, intl_add, intl_reg_add, prtr, facts_portal, feed, related, oel, safety_tools, tp, verify_assembly, verify_search, verify_pages, upload
Each step writes reports/<step>.json under config.OUT_BASE.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script dir from sys.path

import config  # noqa: E402

STEPS = ["search", "globals", "pages", "extras", "tceq", "provisions", "guide_index", "guide_text", "reg", "intl_add", "intl_reg_add", "prtr", "facts_portal", "feed", "related", "oel", "safety_tools", "tp", "verify_assembly", "verify_search", "verify_pages", "upload"]


def log(msg: str) -> None:
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(os.path.join(config.REPORTS, "run.log"), "a", encoding="utf-8") as fh:
        fh.write(line + "\n")


def _items() -> list[dict]:
    from universe import list_items

    items, skipped = list_items()
    if skipped:
        log(f"universe: skipped {len(skipped)} unsafe ids: {skipped[:10]}")
    return items


def run_step(step: str, workers: int) -> dict:
    if step == "search":
        from search_index import build_search
        return build_search(workers=workers, log=log)
    if step == "globals":
        from rulebook import write_globals
        return write_globals(config.GLOBAL_DIR)
    if step == "pages":
        from substances import export_pages
        return export_pages(_items(), workers, log)
    if step == "extras":
        from extras import export_extras
        return export_extras(_items(), workers, log)
    if step == "tceq":
        from tceq import export_tceq
        return export_tceq(log)
    if step == "provisions":
        from provisions import export_provisions
        return export_provisions(log)
    if step == "reg":  # regulation lists + change alerts (service 6); run scripts/portal_build/reg_diff.py first
        from reg_export import export_reg
        return export_reg(log)
    if step == "intl_add":  # named lists added after the p/ export: g/intl_add.json + g/intl_add_<n>.json
        from intl_add import export_intl_add
        return export_intl_add(log)
    if step == "intl_reg_add":  # intl_regulatory codes added after the p/ export: g/intl_reg_add.json + g/intl_reg_add_<n>.json
        from intl_reg_add import export_intl_reg_add
        return export_intl_reg_add(log)
    if step == "feed":  # incident feed (service 9): feed/latest.json + feed/by-cas/<CAS>.json; run portal_build/incident_feed.py first
        from feed_export import export_feed
        return export_feed(log)
    if step == "oel":  # exposure-limit comparison (service 5): oel/<CAS>.json + g/oel_summary.json; run portal_build/oel_build.py first
        from oel import export_oel
        return export_oel(log)
    if step == "safety_tools":  # services 7-8: g/reactive_class.json + g/clp_annex6.json; run portal_build/reactive_class.py first
        from safety_tools import export_safety_tools
        return export_safety_tools(log)
    if step == "tp":  # temperature-dependent properties: tp/<CAS>.json + index + licenses; run portal_build/thermo_props.py first
        from tp import export_tp
        return export_tp(log)
    if step == "related":  # related substances (portal discovery): rel/<CAS>.json
        from related import export_related
        return export_related(log)
    if step == "prtr":  # PRTR facility map (service 13): prtr/index.json + prtr/<CAS>.json
        from prtr import export_prtr
        return export_prtr(log)
    if step == "guide_index":
        from guide_index import export_guide_index
        return export_guide_index(log)
    if step == "facts_portal":
        from portal_facts import export_portal_facts
        return export_portal_facts(log)
    if step == "guide_text":
        from guide_text import export_guide_text
        return export_guide_text(log)
    if step == "verify_assembly":
        from verify_assembly import verify
        return verify(_items())
    if step == "verify_search":
        from verify_search import live_queries, offline_precomputed
        return {"live": live_queries(log), "offline_precomputed": offline_precomputed()}
    if step == "verify_pages":
        from verify_pages import verify
        return verify(_items(), log=log)
    if step == "upload":
        from upload_r2 import create_bucket, plan, upload
        return {"bucket": create_bucket(), **upload(plan(), log)}
    raise SystemExit(f"unknown step {step}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", default=",".join(STEPS[:-1]))
    ap.add_argument("--workers", type=int, default=config.WORKERS)
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # wrangler output has emoji; console is cp949
    os.makedirs(config.REPORTS, exist_ok=True)
    for step in args.steps.split(","):
        t0 = time.time()
        log(f"== {step}")
        result = run_step(step.strip(), args.workers)
        result = {"step": step, "secs": round(time.time() - t0, 1), **result}
        with open(os.path.join(config.REPORTS, f"{step}.json"), "w", encoding="utf-8") as fh:
            json.dump(result, fh, ensure_ascii=False, indent=1)
        log(f"== {step} done in {result['secs']}s")


if __name__ == "__main__":
    main()
