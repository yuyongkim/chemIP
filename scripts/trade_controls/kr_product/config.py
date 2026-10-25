"""Paths and constants for the kr_product collectors. Every shared value lives here only."""
from __future__ import annotations

from pathlib import Path

RAW_ROOT = Path(r"S:\chemip_trade_controls_raw\kr_product")     # untrusted downloads
OUT_DIR = Path(r"G:\MSDS\backend\data\trade_controls\kr_lists")
PERMITS_OUT = Path(r"G:\MSDS\backend\data\trade_controls\kr_permits_product.json")
UNVERIFIED_OUT = OUT_DIR / "KR_PRODUCT_unverified.json"
INDEX_OUT = OUT_DIR / "_index_product.json"
RETRIEVED = "2026-10-24"
PROBE_CAS = {"71-43-2": "benzene", "108-88-3": "toluene", "50-00-0": "formaldehyde",
             "67-64-1": "acetone", "7664-41-7": "ammonia"}

# Parser modules kr_product.<name>; each exposes build() -> list[doc] and permits() -> list[item].
PARSERS = [
    "p_eee_elv",           # 전기·전자제품 및 자동차의 자원순환에 관한 법률 시행령 별표 1의2
    "p_child",             # 어린이제품 공통안전기준 부록 2·3
    "p_pops",              # 잔류성오염물질의 종류 및 특정면제에 관한 규정 별표 1·2
    "p_cpbsa_safety",      # 안전확인대상생활화학제품 지정 및 안전·표시기준 별표 2
    "p_cpbsa_biocide",     # 승인유예대상 기존살생물물질 / 위해성이 낮은 살생물물질
    "p_cosmetic",          # 화장품 안전기준 등에 관한 규정 별표 1·2
    "p_pesticide",         # 농약 및 원제의 등록기준 / 농약의 수출입 승인기준
    "p_transport",         # 위험물 선박운송 기준 별표 1 (위험물목록), 항공, 해양 유해액체물질
]
