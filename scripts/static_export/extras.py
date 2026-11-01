"""Writes p/<chem_id>.x.json (gzip bytes) for every item of the universe in a process pool, plus g/guides_status.json.

Builder: extras_build.py. Report: reports/extras_index.csv (chem_id, kind, raw, gz, guides, facilities, incidents,
enforcement) and size stats in the step result.
"""
from __future__ import annotations

import csv
import multiprocessing as mp
import os
import time
import traceback

import config
from jsonio import SizeStats, write_gzip


def extras_path(chem_id: str, root: str = config.PAGES_DIR) -> str:
    return os.path.join(root, f"{chem_id}{config.EXTRAS_SUFFIX}")


def _init_worker() -> None:
    from extras_build import _backend

    _backend()


def _counts(obj: dict) -> dict:
    fac = ((obj.get("handlers") or {}).get("sources") or {}).get("prtr_facilities") or {}
    return {"guides": (obj.get("guides") or {}).get("total", 0), "facilities": fac.get("total", 0),
            "incidents": (obj.get("incidents") or {}).get("total", 0),
            "enforcement": (obj.get("enforcement") or {}).get("total", 0)}


def _run_chunk(chunk: list[dict]) -> list[dict]:
    from extras_build import build_extras

    rows = []
    for item in chunk:
        row = {"chem_id": item["chem_id"], "kind": item["kind"]}
        try:
            obj = build_extras(item)
            row["raw"], row["gz"] = write_gzip(extras_path(item["chem_id"]), obj, config.GZIP_LEVEL)
            row.update(_counts(obj))
        except Exception as exc:  # one bad record must not stop the others; it is reported
            row.update(raw=0, gz=0, error=f"{type(exc).__name__}: {exc}", trace=traceback.format_exc(limit=3))
        rows.append(row)
    return rows


def write_guide_status(root: str = config.GLOBAL_DIR) -> list[int]:
    from extras_build import guide_status

    return list(write_gzip(os.path.join(root, f"{config.GUIDE_STATUS_NAME}.json"), guide_status()))


def export_extras(items: list[dict], workers: int = config.WORKERS, log=print) -> dict:
    t0 = time.time()
    os.makedirs(config.PAGES_DIR, exist_ok=True)
    os.makedirs(config.REPORTS, exist_ok=True)
    status_size = write_guide_status()
    chunks = [items[i: i + config.EXTRAS_CHUNK] for i in range(0, len(items), config.EXTRAS_CHUNK)]
    stats, errors, nonempty, done = SizeStats(), [], {"guides": 0, "facilities": 0, "incidents": 0, "enforcement": 0}, 0
    fields = ["chem_id", "kind", "raw", "gz", *nonempty]
    with open(os.path.join(config.REPORTS, "extras_index.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        with mp.get_context("spawn").Pool(workers, initializer=_init_worker) as pool:
            for i, rows in enumerate(pool.imap_unordered(_run_chunk, chunks), 1):
                for r in rows:
                    w.writerow(r)
                    if "error" in r:
                        errors.append(r)
                        continue
                    stats.add(f"x_{r['kind']}", r["raw"], r["gz"])
                    for k in nonempty:
                        nonempty[k] += 1 if r.get(k) else 0
                done += len(rows)
                if i % 25 == 0 or i == len(chunks):
                    rate = done / max(1e-6, time.time() - t0)
                    log(f"extras {done}/{len(items)} ({rate:.0f}/s, eta {(len(items) - done) / max(rate, 1e-6) / 60:.1f} min, "
                        f"errors {len(errors)})")
    return {**stats.to_dict(), "files_with_data": nonempty, "guides_status": status_size,
            "errors": len(errors), "error_samples": errors[:20], "workers": workers, "secs": round(time.time() - t0, 1)}
