"""Writes p/<chem_id>.json (gzip bytes) for every item of the universe, in a process pool.

Also writes reports/pages_index.csv (chem_id, kind, cas, detail_status, raw, gz) and returns size stats.
"""
from __future__ import annotations

import csv
import multiprocessing as mp
import os
import time
import traceback

import config
import db
from jsonio import SizeStats, write_gzip


def page_path(chem_id: str, root: str = config.PAGES_DIR) -> str:
    return os.path.join(root, f"{chem_id}.json")


def _init_worker() -> None:
    db.prepare_backend()


def _run_chunk(chunk: list[dict]) -> list[dict]:
    from page_build import build_page

    rows = []
    for item in chunk:
        row = {"chem_id": item["chem_id"], "kind": item["kind"], "cas": item["cas"] or ""}
        try:
            page = build_page(item)
            row["raw"], row["gz"] = write_gzip(page_path(item["chem_id"]), page, config.GZIP_LEVEL)
            row["detail_status"] = page["detail_status"]
        except Exception as exc:  # one bad record must not stop 160k others; it is reported
            row.update(raw=0, gz=0, detail_status=-1, error=f"{type(exc).__name__}: {exc}",
                       trace=traceback.format_exc(limit=3))
        rows.append(row)
    return rows


def export_pages(items: list[dict], workers: int = config.WORKERS, log=print) -> dict:
    t0 = time.time()
    os.makedirs(config.PAGES_DIR, exist_ok=True)
    os.makedirs(config.REPORTS, exist_ok=True)
    chunks = [items[i: i + config.PAGES_CHUNK] for i in range(0, len(items), config.PAGES_CHUNK)]
    stats, errors, statuses, done = SizeStats(), [], {}, 0
    with open(os.path.join(config.REPORTS, "pages_index.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["chem_id", "kind", "cas", "detail_status", "raw", "gz"], extrasaction="ignore")
        w.writeheader()
        with mp.get_context("spawn").Pool(workers, initializer=_init_worker) as pool:
            for i, rows in enumerate(pool.imap_unordered(_run_chunk, chunks), 1):
                for r in rows:
                    w.writerow(r)
                    statuses[r["detail_status"]] = statuses.get(r["detail_status"], 0) + 1
                    if "error" in r:
                        errors.append(r)
                    else:
                        stats.add(f"p_{r['kind']}", r["raw"], r["gz"])
                done += len(rows)
                if i % 25 == 0 or i == len(chunks):
                    rate = done / max(1e-6, time.time() - t0)
                    log(f"pages {done}/{len(items)} ({rate:.0f}/s, eta {(len(items) - done) / max(rate, 1e-6) / 60:.1f} min, "
                        f"errors {len(errors)})")
    return {**stats.to_dict(), "detail_status": {str(k): v for k, v in statuses.items()},
            "errors": len(errors), "error_samples": errors[:20], "workers": workers, "secs": round(time.time() - t0, 1)}
