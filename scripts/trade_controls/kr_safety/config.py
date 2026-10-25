"""Paths, law identifiers and constants for the KR safety/labor/fire/gas collector.

Every constant used by more than one module lives here.
"""
from __future__ import annotations

from pathlib import Path

# --- locations -------------------------------------------------------------
RAW_ROOT = Path(r"S:\chemip_trade_controls_raw\kr_safety")     # untrusted downloads
OUT_DIR = Path(r"G:\MSDS\backend\data\trade_controls")
LIST_DIR = OUT_DIR / "kr_lists"
PERMITS_JSON = OUT_DIR / "kr_permits_safety.json"
QA_JSON = OUT_DIR / "kr_safety_qa.json"           # QA lives outside kr_lists (lists only there)
TERMINOLOGY_DB = Path(r"G:\MSDS\data\terminology.db")          # read-only

RETRIEVED = "2026-10-24"

# --- law.go.kr open API (DRF) ---------------------------------------------
DRF_SEARCH = "https://www.law.go.kr/DRF/lawSearch.do"
DRF_SERVICE = "https://www.law.go.kr/DRF/lawService.do"
DRF_OC = "test"                       # public demo OC, same as sibling collectors
LAW_PAGE = "https://www.law.go.kr/법령/{name}"
ADMRUL_PAGE = "https://www.law.go.kr/행정규칙/{name}"

HTTP_TIMEOUT = 120
HTTP_RETRIES = 3
MAX_DOWNLOAD_BYTES = 80 * 1024 * 1024
USER_AGENT = "ChemIP-kr-safety-collector/1.0 (+research; contact via chemip.yule.pics)"

# Laws fetched in full (current text). Key = short id used for raw file names.
LAWS = {
    "osha_act": "산업안전보건법",
    "osha_decree": "산업안전보건법 시행령",
    "osha_rule": "산업안전보건법 시행규칙",
    "osha_std": "산업안전보건기준에 관한 규칙",
    "hazmat_act": "위험물안전관리법",
    "hazmat_decree": "위험물안전관리법 시행령",
    "hazmat_rule": "위험물안전관리법 시행규칙",
    "gas_act": "고압가스 안전관리법",
    "gas_decree": "고압가스 안전관리법 시행령",
    "gas_rule": "고압가스 안전관리법 시행규칙",
    "fire_act": "화재의 예방 및 안전관리에 관한 법률",
    "fire_decree": "화재의 예방 및 안전관리에 관한 법률 시행령",
    "sapa_act": "중대재해 처벌 등에 관한 법률",
    "sapa_decree": "중대재해 처벌 등에 관한 법률 시행령",
}

# Administrative rules (고시). Key = short id.
ADMRULS = {
    "oel_notice": "화학물질 및 물리적 인자의 노출기준",
    "msds_notice": "화학물질의 분류·표시 및 물질안전보건자료에 관한 기준",
}
