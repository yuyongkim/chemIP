"""Paths and constants shared by the Korean environment-law list collectors.

Every value used by more than one module is defined here only.
"""
from __future__ import annotations

from pathlib import Path

# --- locations -------------------------------------------------------------
RAW_ROOT = Path(r"S:\chemip_trade_controls_raw\kr_env")        # untrusted downloads
OUT_DIR = Path(r"G:\MSDS\backend\data\trade_controls\kr_lists")
PERMITS_OUT = Path(r"G:\MSDS\backend\data\trade_controls\kr_permits_env.json")
TERMINOLOGY_DB = Path(r"G:\MSDS\data\terminology.db")          # opened read-only

RETRIEVED = "2026-10-24"

# --- law.go.kr open API (DRF) ------------------------------------------------
LAW_BASE = "https://www.law.go.kr"
LAW_OC = "test"            # public demo OC value already used by sibling collectors
HTTP_TIMEOUT = 60
HTTP_RETRIES = 3
MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024
USER_AGENT = "ChemIP-kr-env-collector/1.0 (+research; chemip.yule.pics)"


def law_page_url(law_name: str) -> str:
    """Human-readable law.go.kr URL for a statute (current version)."""
    return f"{LAW_BASE}/법령/{law_name.replace(' ', '')}"


def admrul_page_url(rule_name: str) -> str:
    """Human-readable law.go.kr URL for an administrative rule (고시)."""
    return f"{LAW_BASE}/행정규칙/{rule_name.replace(' ', '')}"

# --- parser modules, in run order (one module per law) -----------------------
PARSERS = [
    "law_clean_air", "law_water", "law_soil", "law_waste", "law_odor",
    "law_chem_prtr", "law_ippc", "law_drinking_water", "law_indoor_air", "law_ozone",
]
