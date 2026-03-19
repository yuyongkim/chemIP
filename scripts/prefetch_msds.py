"""Pre-fetch all missing MSDS detail sections into terminology.db.

Usage:
    python -m scripts.prefetch_msds [--workers 4] [--dry-run]
"""

from __future__ import annotations

import argparse
import logging
import sqlite3
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from backend.api.kosha_msds_adapter import KoshaMsdsAdapter
from backend.config.settings import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

SECTION_TITLES = {
    1: "Chemical Product and Company Identification",
    2: "Hazards Identification",
    3: "Composition/Information on Ingredients",
    4: "First Aid Measures",
    5: "Fire Fighting Measures",
    6: "Accidental Release Measures",
    7: "Handling and Storage",
    8: "Exposure Controls/Personal Protection",
    9: "Physical and Chemical Properties",
    10: "Stability and Reactivity",
    11: "Toxicological Information",
    12: "Ecological Information",
    13: "Disposal Considerations",
    14: "Transport Information",
    15: "Regulatory Information",
    16: "Other Information",
}


def get_uncached_chem_ids(db_path: str) -> list[str]:
    """Return chem_ids that have fewer than 16 cached sections."""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    # All chem_ids: stored as 'KOSHA_ID:XXXXXX' in description column
    all_ids: set[str] = set()
    for (desc,) in c.execute("SELECT description FROM chemical_terms WHERE description LIKE 'KOSHA_ID:%'"):
        cid = desc.replace("KOSHA_ID:", "").strip()
        if cid and cid != "null":
            all_ids.add(cid)

    # Detect schema: legacy uses section_no, new uses section_seq
    cols = {r[1] for r in c.execute("PRAGMA table_info(msds_details)")}
    sec_col = "section_seq" if "section_seq" in cols else "section_no"

    # Already fully cached (16 sections)
    full = {r[0] for r in c.execute(
        f"SELECT chem_id FROM msds_details GROUP BY chem_id HAVING COUNT(DISTINCT {sec_col}) >= 16"
    )}
    conn.close()
    return sorted(all_ids - full)


def fetch_and_store(chem_id: str, adapter: KoshaMsdsAdapter, db_path: str) -> int:
    """Fetch all 16 sections for one chemical. Returns number of sections saved."""
    conn = sqlite3.connect(db_path, timeout=30)

    # Detect schema
    cols = {r[1] for r in conn.execute("PRAGMA table_info(msds_details)")}
    legacy = "section_no" in cols and "section_seq" not in cols

    saved = 0
    for seq in range(1, 17):
        # Skip if already cached
        sec_col = "section_no" if legacy else "section_seq"
        existing = conn.execute(
            f"SELECT 1 FROM msds_details WHERE chem_id=? AND {sec_col}=?",
            (chem_id, seq),
        ).fetchone()
        if existing:
            saved += 1
            continue

        try:
            resp = adapter.get_msds_detail(chem_id, section_seq=seq)
            if resp.get("status") == "success":
                data = resp.get("data", "")
                if legacy:
                    conn.execute(
                        "INSERT OR REPLACE INTO msds_details (chem_id, section_no, xml_data) VALUES (?, ?, ?)",
                        (chem_id, seq, data),
                    )
                else:
                    title = SECTION_TITLES.get(seq, f"Section {seq}")
                    conn.execute(
                        "INSERT OR REPLACE INTO msds_details (chem_id, section_seq, section_name, content) VALUES (?, ?, ?, ?)",
                        (chem_id, seq, title, data),
                    )
                saved += 1
        except Exception:
            logger.warning("Failed: %s section %d", chem_id, seq)

        time.sleep(0.05)  # gentle rate limit

    conn.commit()
    conn.close()
    return saved


def main():
    parser = argparse.ArgumentParser(description="Pre-fetch missing MSDS sections")
    parser.add_argument("--workers", type=int, default=4, help="Parallel workers (default: 4)")
    parser.add_argument("--dry-run", action="store_true", help="Only show count, don't fetch")
    args = parser.parse_args()

    db_path = str(settings.TERMINOLOGY_DB_PATH)
    missing = get_uncached_chem_ids(db_path)
    logger.info("Total chemicals missing full MSDS cache: %d", len(missing))

    if args.dry_run:
        logger.info("Dry run — exiting.")
        return

    if not missing:
        logger.info("All chemicals are fully cached!")
        return

    adapter = KoshaMsdsAdapter()
    done = 0
    failed = 0
    start = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(fetch_and_store, cid, adapter, db_path): cid for cid in missing}
        for future in as_completed(futures):
            cid = futures[future]
            try:
                sections = future.result()
                done += 1
                if done % 100 == 0:
                    elapsed = time.time() - start
                    rate = done / elapsed * 60
                    logger.info(
                        "Progress: %d/%d (%.0f/min) — last: %s (%d sections)",
                        done, len(missing), rate, cid, sections,
                    )
            except Exception:
                failed += 1
                logger.exception("Error processing %s", cid)

    elapsed = time.time() - start
    logger.info("Done: %d succeeded, %d failed, %.1f minutes", done, failed, elapsed / 60)


if __name__ == "__main__":
    main()
