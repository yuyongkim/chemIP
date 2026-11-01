"""Entry point: generate static SEO pages, validate, check against the live API, take screenshots.

python -I -B G:\\MSDS\\scripts\\seo_pages\\run.py                     # all steps
python -I -B G:\\MSDS\\scripts\\seo_pages\\run.py --steps build,validate
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I does not add the script dir

import config  # noqa: E402
import urls  # noqa: E402

STEPS = ("build", "validate", "sitemap_live", "live", "shots")


def log(msg: str) -> None:
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    print(line, flush=True)
    os.makedirs(config.REPORTS, exist_ok=True)
    with open(os.path.join(config.REPORTS, "run.log"), "a", encoding="utf-8") as fh:
        fh.write(line + "\n")


def shots(gen: dict) -> list:
    picks = sorted(gen["indexable"], key=lambda c: -gen["facts"][c]["counts"]["kr_lists"])
    paths = [urls.hub_path()] + [urls.cas_path(c) for c in (picks[0], picks[len(picks) // 2])][: config.SHOT_COUNT - 1]
    pages = [urls.file_for(p) for p in paths]
    env = {**os.environ, "NODE_PATH": config.NODE_PATH}
    script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots.cjs")
    res = subprocess.run(["node", script, config.OUT, config.SHOTS, ",".join(map(str, config.SHOT_WIDTHS)), *pages],
                         env=env, capture_output=True, text=True, encoding="utf-8", timeout=300)
    if res.returncode != 0:
        raise SystemExit(f"screenshots failed: {res.stderr[-2000:]}")
    return json.loads(res.stdout.strip().splitlines()[-1])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", default=",".join(STEPS))
    steps = ap.parse_args().steps.split(",")
    import build
    import selection as sel_mod

    t0 = time.time()
    log("loading sources (read-only)")
    src = build.load_sources()
    sel = sel_mod.select(src["substances"], src["ncis"], src["intl_codes"], src["section2"], set(src["seed"]))
    log(f"selection: eligible={sel['report']['eligible']} tiers={sel['report']['tier_sizes']}")
    gen = build.generate(sel, src, log)
    log(f"generated {len(gen['generated'])} substance pages, {len(gen['list_pages'])} list pages, sitemap {gen['sitemap_urls']} urls")
    summary = {"selection": sel["report"], "generated": len(gen["generated"]), "indexable": len(gen["indexable"]),
               "list_pages": len(gen["list_pages"])}
    if "validate" in steps:
        import validate
        summary["validate"] = validate.run(sel, gen)
        log(f"validate: {json.dumps({k: v for k, v in summary['validate'].items() if not isinstance(v, (list, dict))})}")
    if "sitemap_live" in steps:
        import live_sitemap
        summary["sitemap_live"] = live_sitemap.run()
        log(f"sitemap_live: {json.dumps({k: v for k, v in summary['sitemap_live'].items() if not isinstance(v, (list, dict))})}")
    if "live" in steps:
        import live_check
        summary["live"] = live_check.run(gen)
        log(f"live: sampled={summary['live']['sampled']} failed={summary['live']['failed']}")
    if "shots" in steps:
        summary["shots"] = shots(gen)
        log(f"shots: {len(summary['shots'])} files in {config.SHOTS}")
    summary["seconds"] = round(time.time() - t0, 1)
    log(f"report: {build.write_json('summary.json', summary)}")


if __name__ == "__main__":
    main()
