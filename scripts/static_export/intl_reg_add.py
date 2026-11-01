"""intl_regulatory codes loaded after the last full p/ export → g/intl_reg_add.json + g/intl_reg_add_<n>.json (gzip bytes).

p/<chem_id>.json carries `intl` (GET /api/regulations/international/{cas}) as of its export. Codes loaded later
(config.INTL_REG_ADD_CODES, e.g. US DOT HMT, Japan PRTR/ISHL) reach the country-regulation panel without re-exporting
the 333k p/ files: the browser reads the CAS's shard and adds those items to the page's intl.jurisdictions
(frontend/public/chemip/intl_reg_add.jsx, api_intl.jsx). Items have exactly the API item shape (backend get_by_cas):
same merge (backend/core/intl_dedupe.py), same list names (intl_regulatory_store.REGULATION_LABELS).

    g/intl_reg_add.json      {v, exported_at, buckets, codes: [{regulation, jurisdiction, list, rows, cas}], cas_count}
    g/intl_reg_add_<n>.json  {v, n, cas: {CAS: {jurisdiction: [item]}}}     n = fnv1a32(CAS) % buckets (intl_add.py)

Every bucket file is written (empty `cas` too) so a lookup never 404s. The client skips a regulation the page already
has, so after a full p/ re-export these codes can stay or be dropped from INTL_REG_ADD_CODES.
Run: python -I -B scripts/static_export/run_all.py --steps intl_reg_add
"""
from __future__ import annotations

import datetime as dt
import os

import config
import db
from intl_add import bucket_of
from jsonio import write_gzip


def items_by_cas(rows: list[tuple[str, str, str, str, str]], labels: dict) -> dict[str, dict[str, list[dict]]]:
    """(cas, regulation, detail, source, name) rows → {CAS: {jurisdiction: [API item]}} (pure; rows of one CAS merged)."""
    from backend.core.intl_dedupe import merge_rows

    by_cas: dict[str, list[tuple[str, str, str, str]]] = {}
    for cas, code, detail, source, name in rows:
        cas = (cas or "").strip()
        if cas:
            by_cas.setdefault(cas, []).append((code, detail or "", source or "", name or ""))
    out: dict[str, dict[str, list[dict]]] = {}
    for cas in sorted(by_cas):
        for merged in merge_rows(by_cas[cas]):
            country, label = labels.get(merged["regulation"], ("OTHER", merged["regulation"]))
            item = {"regulation": merged["regulation"], "list": label, **{k: v for k, v in merged.items() if k != "regulation"}}
            out.setdefault(cas, {}).setdefault(country, []).append(item)
    return out


def export_intl_reg_add(log=print, root: str = config.GLOBAL_DIR) -> dict:
    from backend.core.intl_regulatory_store import REGULATION_LABELS

    codes = tuple(config.INTL_REG_ADD_CODES)
    conn = db.ro_connect()
    try:
        marks = ",".join("?" * len(codes))
        rows = conn.execute(f"SELECT cas_no, regulation, detail, source, chemical_name FROM intl_regulatory "
                            f"WHERE regulation IN ({marks}) ORDER BY cas_no, regulation, id", codes).fetchall()
    finally:
        conn.close()
    data = items_by_cas(rows, REGULATION_LABELS)
    buckets = config.INTL_REG_ADD_BUCKETS
    shards: dict[int, dict] = {n: {} for n in range(buckets)}
    for cas, by_j in data.items():
        shards[bucket_of(cas, buckets)][cas] = by_j
    raw = packed = 0
    for n, cas_map in shards.items():
        r, g = write_gzip(os.path.join(root, f"{config.INTL_REG_ADD_NAME}_{n}.json"),
                          {"v": config.INTL_REG_ADD_FORMAT, "n": n, "cas": cas_map})
        raw, packed = raw + r, packed + g
    summary = [{"regulation": c, "jurisdiction": REGULATION_LABELS.get(c, ("OTHER", c))[0],
                "list": REGULATION_LABELS.get(c, ("OTHER", c))[1], "rows": sum(1 for r in rows if r[1] == c),
                "cas": len({r[0] for r in rows if r[1] == c and r[0]})} for c in codes]
    head = {"v": config.INTL_REG_ADD_FORMAT, "exported_at": dt.date.today().isoformat(), "buckets": buckets,
            "codes": summary, "cas_count": len(data)}
    r, g = write_gzip(os.path.join(root, f"{config.INTL_REG_ADD_NAME}.json"), head)
    missing = [s["regulation"] for s in summary if not s["rows"]]
    log(f"intl_reg_add: {len(codes)} codes, {len(data)} CAS, {buckets} shards, empty {missing}")
    return {"codes": list(codes), "empty": missing, "cas": len(data), "buckets": buckets,
            "raw_bytes": raw + r, "gzip_bytes": packed + g}
