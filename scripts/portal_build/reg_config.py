"""Service 6 (regulation lists + change alerts): every path, source and tuning value, defined once.

reg_lists.py, reg_snapshot.py, reg_official.py and reg_diff.py import from here; the static exporter
(scripts/static_export/reg_export.py) reads the same values. Nothing else hard-codes them.
"""
from __future__ import annotations

import os

PROJECT = r"G:\MSDS"
TERM_DB = os.path.join(PROJECT, "data", "terminology.db")          # read-only (NCIS categories, intl_regulatory)
TRADE_DATA = os.path.join(PROJECT, "backend", "data", "trade_controls")  # kr_lists/, intl_lists/, controlled lists
ENV_FILE = os.path.join(PROJECT, ".env")                            # law.go.kr OC key is read by name, never printed

# Snapshots of the list universe (one gzip JSON per run + latest.json.gz). Outside the published tree.
SNAPSHOT_DIR = os.path.join(PROJECT, "data", "portal_snapshots", "reg")
SNAPSHOT_LATEST = "latest.json.gz"

# ---- list groups (order = screen order) ----
GROUPS = ["kr_law", "ncis", "controlled", "intl", "intl_reg"]

# ---- source rows written to portal_facts.db `sources` (attribution shown on the screen) ----
SOURCES = {
    "chemip_kr_lists": {
        "name": "ChemIP 국내 법령별 물질 목록 (law.go.kr 법령·고시 별표에서 수집)",
        "url": "https://www.law.go.kr",
        "license": "법령·고시는 저작권 보호 대상 아님(저작권법 제7조). 출처 표시",
    },
    "chemip_ncis": {
        "name": "국립환경과학원 화학물질정보시스템(NCIS) 물질 분류",
        "url": "https://ncis.nier.go.kr",
        "license": "공공데이터(data.go.kr), 출처 표시",
    },
    "chemip_controlled": {
        "name": "ChemIP 통제 목록(CWC·호주그룹·마약류 원료물질)",
        "url": "https://www.opcw.org/chemical-weapons-convention/annexes/annex-chemicals",
        "license": "국제협약·정부 고시 원문, 출처 표시",
    },
    "chemip_intl_lists": {
        "name": "ChemIP 상대국 법령별 목록(목록마다 원문 링크·라이선스 표기)",
        "url": "",
        "license": "목록마다 license 칸 그대로",
    },
    "chemip_intl_regulatory": {
        "name": "ChemIP 국가별 규제 DB(EPA·ECHA·협약·각국 법령, terminology.db intl_regulatory)",
        "url": "",
        "license": "각 목록 원문(정부 공공 자료·협약 부속서), 출처 표시",
    },
    "chemip_export_diff": {
        "name": "ChemIP 내보내기 차이(이전 스냅숏과 비교)",
        "url": "https://chemip.yule.pics/chemip?view=reg",
        "license": "위 목록들의 라이선스를 따름",
    },
    "law_go_kr_listmeta": {
        "name": "법제처 국가법령정보센터 — 목록 원문 고시·법령 개정일(목록 수집 때 기록)",
        "url": "https://www.law.go.kr",
        "license": "법령·고시는 저작권 보호 대상 아님(저작권법 제7조). 제목·날짜·링크만",
    },
    "law_go_kr_api": {
        "name": "법제처 OPEN API(행정규칙·법령 검색) — 발령일자",
        "url": "https://open.law.go.kr",
        "license": "공공(무료 OC 키). 제목·날짜·링크만",
    },
    "federal_register": {
        "name": "Federal Register API (EPA·OSHA chemical rules)",
        "url": "https://www.federalregister.gov/developers/documentation/api/v1",
        "license": "US Government work, public domain (17 U.S.C. 105). Title, date and link only",
    },
    "echa_candidate_list": {
        "name": "ECHA CHEM — Candidate List of substances of very high concern (inclusion dates)",
        "url": "https://chem.echa.europa.eu/obligation-lists/candidateList",
        "license": "ECHA legal notice: reuse allowed with attribution (Source: ECHA). Name, CAS, date and link only",
    },
}

# ---- NCIS classification (base_category) → stable list id. A new category gets NCIS_X_<hash> until added here ----
NCIS_IDS = {
    "기존화학물질": "NCIS_EXISTING",
    "인체등유해성물질": "NCIS_HAZARDOUS",
    "잔류성오염물질": "NCIS_POPS",
    "중점관리물질": "NCIS_PRIORITY",
    "등록대상기존화학물질": "NCIS_REG_EXISTING",
    "암, 돌연변이성물질 등": "NCIS_CMR",
    "제한물질": "NCIS_RESTRICTED",
    "사고대비물질": "NCIS_ACCIDENT_PREP",
    "금지물질": "NCIS_PROHIBITED",
    "로테르담협약물질": "NCIS_ROTTERDAM",
}
INTL_REG_PREFIX = "IR_"          # intl_regulatory regulation code → list id IR_<code>
DETAIL_CHARS = 240               # list row detail is trimmed to this (screen + diff)

# ---- HTTP (official change sources) ----
USER_AGENT = "chemip-portal-reg/1 (+https://chemip.yule.pics)"
HTTP_TIMEOUT = 40
HTTP_RETRIES = 3
MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024

# Federal Register: public API, no key. One query per row; list_rules map a title to a ChemIP list (first match wins).
FEDREG_API = "https://www.federalregister.gov/api/v1/documents.json"
FEDREG_SINCE_DAYS = 3 * 365
FEDREG_QUERIES = [
    {"agency": "environmental-protection-agency", "type": "RULE", "term": "\"Toxic Substances Control Act\""},
    {"agency": "environmental-protection-agency", "type": "RULE", "term": "\"toxic chemical release reporting\""},
    {"agency": "occupational-safety-and-health-administration", "type": "RULE",
     "term": "\"hazard communication\" | \"air contaminants\" | \"occupational exposure\" | \"process safety management\""},
]
FEDREG_LIST_RULES = [
    ("significant new use", "IR_US_TSCA_SNUR"),
    ("toxic chemical release reporting", "IR_EPCRA_313"),
    ("community right-to-know", "IR_EPCRA_313"),
    ("regulation under the toxic substances control act", "US_TSCA_SECTION6_RULES"),
    ("section 6", "US_TSCA_SECTION6_RULES"),
    ("export notification", "US_TSCA_12B_EXPORT_NOTIFICATION"),
    ("air contaminants", "IR_US_OSHA_PEL"),
    ("process safety management", "IR_US_OSHA_PSM"),
]

# ECHA CHEM Candidate List API (the list collector uses the same endpoint). Inclusion date per entry.
ECHA_CANDIDATE_API = "https://chem.echa.europa.eu/api-obligation-list/v1/candidateList"
ECHA_CANDIDATE_PAGE = "https://chem.echa.europa.eu/obligation-lists/candidateList"
ECHA_PAGE_SIZE = 200
ECHA_LIST_ID = "EU_REACH_SVHC_CANDIDATE"

# 법제처 OPEN API. The OC value must be registered for this PC's IP (the public demo "test" is refused).
# Read from the environment or .env under one of these names; without it the source is skipped and reported.
LAW_OC_NAMES = ("LAW_GO_KR_OC", "LAW_OC")
LAW_SEARCH_API = "https://www.law.go.kr/DRF/lawSearch.do"

# ---- export ----
CHANGES_RECENT = 300             # items in v1/reg/changes.json
RSS_ITEMS = 60                   # items in v1/reg/changes.xml
AGGREGATE_OVER = 12              # more row changes than this for one (date, list, change) → one summary item
SITE = "https://chemip.yule.pics"
LIST_PAGE_URL = SITE + "/chemip?view=reg&list={id}"
FEED_URL = SITE + "/data/v1/reg/changes.xml"
