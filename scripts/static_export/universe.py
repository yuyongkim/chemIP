"""Which per-substance files exist: every chem_id the search can return or the UI can open.

kind "kosha"  chem_id = KOSHA id of a chemical_terms row (search returns it); cas = that row's cas_no
kind "cas"    chem_id = every distinct non-empty chemical_terms.cas_no (search returns it for non-KOSHA rows;
              also written for CAS that only KOSHA rows carry, so any CAS -> p/<cas>.json)
kind "msds"   chem_id = msds_details ids without a chemical_terms row (MSDS-only records; detail only)
"""
from __future__ import annotations

import re

import config
import db

CAS_RE = re.compile(config.CAS_PATTERN)
SAFE_RE = re.compile(config.SAFE_KEY_PATTERN)


def valid_cas(value: str | None) -> str | None:
    v = (value or "").strip()
    return v if CAS_RE.match(v) else None


def list_items(conn=None) -> tuple[list[dict], list[str]]:
    """Returns (items, skipped_ids). item = {"chem_id", "kind", "cas"} with cas = valid CAS or None."""
    conn = conn or db.ro_connect()
    items: list[dict] = []
    seen: set[str] = set()
    skipped: list[str] = []

    def add(chem_id: str, kind: str, cas: str | None) -> None:
        if not chem_id or chem_id in seen:
            return
        seen.add(chem_id)
        if not SAFE_RE.match(chem_id):
            skipped.append(chem_id)
            return
        items.append({"chem_id": chem_id, "kind": kind, "cas": valid_cas(cas)})

    for kid, cas in conn.execute(
        "SELECT substr(description, 10), cas_no FROM chemical_terms WHERE description LIKE 'KOSHA_ID:%' ORDER BY id"
    ):
        add(kid, "kosha", cas)
    for (cas,) in conn.execute("SELECT DISTINCT cas_no FROM chemical_terms WHERE cas_no IS NOT NULL AND cas_no != '' ORDER BY cas_no"):
        add(cas, "cas", cas)
    for (mid,) in conn.execute("SELECT DISTINCT chem_id FROM msds_details ORDER BY chem_id"):
        add(mid, "msds", None)
    return items, skipped
