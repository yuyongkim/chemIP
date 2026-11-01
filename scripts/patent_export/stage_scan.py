"""Stage 2: scan all source files in a low-priority process pool; files already done are skipped (resume)."""
import multiprocessing as mp
import os
import time

import config
import scan_file
import source_files
from logutil import log


def pending_jobs():
    jobs, done = [], 0
    for folder, path, size in source_files.list_source_files():
        out_m, out_s = source_files.match_paths(folder, path)
        if out_s.exists():
            done += 1
        else:
            jobs.append((folder, path, out_m, out_s, size))
    return jobs, done


def run():
    jobs, done = pending_jobs()
    limit = int(os.environ.get("PATENT_EXPORT_SCAN_LIMIT", "0"))   # test runs only
    if limit:
        jobs = jobs[-limit:]                                        # smallest files
    total = sum(j[4] for j in jobs)
    log("scan", f"start: {len(jobs)} files pending ({total/1e9:.1f} GB), {done} already done, "
                f"{config.WORKERS} workers, cap {config.READ_MB_PER_S_PER_WORKER} MB/s each")
    t0, seen = time.time(), 0
    with mp.get_context("spawn").Pool(config.WORKERS, initializer=scan_file.init_worker) as pool:
        for st in pool.imap_unordered(scan_file.scan, [j[:4] for j in jobs]):
            seen += st["bytes"]
            rate = seen / max(time.time() - t0, 1)
            eta_h = (total - seen) / max(rate, 1) / 3600
            log("scan", f"{st['folder']}/{st['file']} recs={st['records']} hit={st['records_with_hits']} "
                        f"rows={st['rows']} bad={st['unparsed']} {st['seconds']}s [{st['priority']}] | "
                        f"{seen/1e9:.1f}/{total/1e9:.1f} GB {rate/1e6:.0f} MB/s eta {eta_h:.2f} h")
    log("scan", f"done in {(time.time()-t0)/3600:.2f} h")
