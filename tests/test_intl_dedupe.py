"""Name-variant rows of one CAS on one list count once (backend/core/intl_dedupe.py) — p/ intl listings, the
/api/regulations/international route and the reg/ IR_* lists (scripts/portal_build/reg_lists.py)."""
from __future__ import annotations

import os
import sqlite3
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.append(os.path.join(ROOT, "scripts", "portal_build"))

from backend.core.intl_dedupe import item_details, merge_rows  # noqa: E402

ETH = [
    ("CAA_112R", "Threshold Quantity: 10,000 lb", "EPA", "Ethene"),
    ("CAA_112R", "Threshold Quantity: 10,000 lb", "EPA", "Ethylene"),
    ("EPCRA_313", "TRI listed under another name on this list", "EPA", "Ethene"),
    ("EPCRA_313", "TRI listed", "EPA", "Ethylene"),
    ("VN_DECREE24_APP_I", "중점 화학공업 기본 화학물질", "Vietnam Decree 24/2026/ND-CP", "Ethylene"),
]
AMMONIA = [
    ("CAA_112R", "Threshold Quantity: 20,000 lb", "EPA", "Ammonia (conc 20% or greater)"),
    ("CAA_112R", "Threshold Quantity: 10,000 lb", "EPA", "Ammonia (anhydrous)"),
    ("EPCRA_313", "TRI listed under another name on this list", "EPA", "Ammonia (anhydrous)"),
    ("EPCRA_313", "TRI listed", "EPA", "Ammonia (includes anhydrous ammonia)"),
]


def test_name_variants_merge_once():
    items = merge_rows(ETH)
    assert [i["regulation"] for i in items] == ["CAA_112R", "EPCRA_313", "VN_DECREE24_APP_I"]
    caa, tri, _ = items
    assert caa["name"] == "Ethylene" and caa["aka"] == ["Ethene"] and caa["detail"] == "Threshold Quantity: 10,000 lb"
    assert tri["detail"] == "TRI listed" and tri["name"] == "Ethylene" and tri["aka"] == ["Ethene"]
    assert "forms" not in caa


def test_forms_kept_when_values_differ():
    caa, tri = merge_rows(AMMONIA)
    assert len(caa["forms"]) == 2 and item_details(caa) == ["Threshold Quantity: 20,000 lb", "Threshold Quantity: 10,000 lb"]
    # the most used name of the CAS leads; the alias row's name joins the real row
    assert tri["detail"] == "TRI listed" and tri["name"] == "Ammonia (anhydrous)" and tri["aka"] == ["Ammonia (includes anhydrous ammonia)"]


def test_alias_only_rows_keep_their_detail():
    (item,) = merge_rows([("EPCRA_313", "TRI listed under another name on this list", "EPA", "X")])
    assert item["detail"].startswith("TRI listed under another name") and item["name"] == "X"


def test_get_by_cas_counts_lists():
    db = os.path.join(ROOT, "data", "terminology.db")
    if not os.path.exists(db):
        pytest.skip("no terminology.db")
    from backend.core.intl_regulatory_store import get_by_cas
    out = get_by_cas("74-85-1")
    us = out["jurisdictions"].get("US", [])
    assert len({x["regulation"] for x in us}) == len(us)  # one item per list
    assert out["count"] == sum(len(v) for v in out["jurisdictions"].values())
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        n_lists = con.execute("SELECT COUNT(DISTINCT regulation) FROM intl_regulatory WHERE cas_no = '74-85-1'").fetchone()[0]
    finally:
        con.close()
    assert out["count"] == n_lists


def test_reg_merged_row():
    import reg_lists
    caa = merge_rows(ETH)[0]
    assert reg_lists.merged_row("74-85-1", caa) == ["74-85-1", "Ethylene; Ethene", "", "Threshold Quantity: 10,000 lb"]
    am = merge_rows(AMMONIA)[0]
    assert reg_lists.merged_row("7664-41-7", am)[3] == (
        "Ammonia (conc 20% or greater): Threshold Quantity: 20,000 lb; Ammonia (anhydrous): Threshold Quantity: 10,000 lb")
