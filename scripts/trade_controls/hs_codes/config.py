"""Paths, source URLs and licence texts for the CAS -> HS code collector.

Every constant used by more than one module lives here, so a new year or a
moved directory is a one-line change.
"""
from __future__ import annotations

import datetime as _dt
from pathlib import Path

# --- locations -------------------------------------------------------------
RAW_ROOT = Path(r"S:\chemip_trade_controls_raw\hs")          # untrusted downloads
OUT_DIR = Path(r"G:\MSDS\backend\data\trade_controls")
OUT_DB = OUT_DIR / "hs_codes.sqlite"
OUT_META_JSON = OUT_DIR / "hs_codes_meta.json"
NCIS_DB = Path(r"G:\MSDS\data\terminology.db")                # read-only

RETRIEVED = _dt.date.today().isoformat()

# --- download guards -------------------------------------------------------
HTTP_TIMEOUT = 180
HTTP_RETRIES = 3
MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024
MAX_UNZIPPED_BYTES = 400 * 1024 * 1024
USER_AGENT = "ChemIP-hs-collector/1.0 (+research; contact via chemip.yule.pics)"

# --- EU ECICS ----------------------------------------------------------------
ECICS_BASE = "https://ec.europa.eu/taxation_customs/dds2/ecics/"
ECICS_FULL_URL = ECICS_BASE + "ecics_export_management.jsp?message=extractFull"
ECICS_CONSULT_URL = ECICS_BASE + "chemicalsubstance_consultation.jsp?Lang=en"
ECICS_INFO_URL = ("https://taxation-customs.ec.europa.eu/online-services/"
                  "online-services-and-databases-customs/"
                  "ecics-european-customs-inventory-chemical-substances_en")
ECICS_LICENSE = (
    "European Commission reuse policy (Commission Decision 2011/833/EU); EU-owned "
    "content licensed CC BY 4.0 (https://commission.europa.eu/legal-notice_en). "
    "Credit: 'Source: European Commission, DG TAXUD, ECICS'. "
    "ECICS classifications are informative, not legally binding (binding = BTI)."
)

# --- EU Combined Nomenclature (heading titles) ------------------------------
CN_YEAR = 2026
CN_TEXT_URL = f"https://www.dst.dk/ext/udroko/CNofftextE_{CN_YEAR}--xlsx"
CN_LEGAL_BASIS = ("Commission Implementing Regulation (EU) 2025/1926, Annex I "
                  "(OJ L, 31.10.2025), applicable from 1 January 2026")
CN_LICENSE = (
    "EU legislative text (EUR-Lex reuse: Commission Decision 2011/833/EU, CC BY 4.0). "
    "Excel distribution file published by Statistics Denmark (dst.dk) as a copy of the "
    "official CN text."
)

# --- Korea Customs Service (data.go.kr file data) ---------------------------
DATAGOKR_BASE = "https://www.data.go.kr"
KCS_HS_CODE_PK = "15049722"        # 관세청_HS부호 (HSK 10-digit, KO/EN names)
KCS_HS_CLASS_PK = "15049720"       # 관세청_HSK별 신성질별_성질별 분류 (2/4/6/10-digit KO names)
KCS_LICENSE = "공공누리 제1유형 (출처표시) — Korea Open Government License Type 1 (attribution)"

# Chapters whose HS6 headings are the minimum required in hs6_heading.
FOCUS_CHAPTERS = ("28", "29", "38")
