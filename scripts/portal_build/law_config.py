"""Korean law corpus (법제처 OPEN API → data/portal_facts.db law_*): every path, endpoint and tuning value, defined once.

law_refs.py, law_api.py, law_raw.py, law_store.py and law_corpus.py import from here. The law list itself is data:
law_set.json (next to this file). The OC key is read by reg_official.law_oc() (env or .env, never printed).

Endpoints used (open.law.go.kr 활용가이드, checked 2026-10-31):
| what                      | request                                                                 |
|---------------------------|-------------------------------------------------------------------------|
| 현행 법령 찾기            | lawSearch.do  target=law     type=JSON query=<name> display=100         |
| 현행 행정규칙 찾기        | lawSearch.do  target=admrul  type=JSON query=<name> display=100 (nw=1)  |
| 법령 본문                 | lawService.do target=law     type=JSON MST=<법령일련번호>                |
| 행정규칙 본문             | lawService.do target=admrul  type=JSON ID=<행정규칙일련번호>             |
| 법령 연혁(시행일 기준)    | lawSearch.do  target=eflaw   type=JSON query=<name> nw=1,2,3 (연혁·시행예정·현행), page |
| 행정규칙 연혁             | lawSearch.do  target=admrul  type=JSON query=<name> nw=2 (연혁 포함), page |
target=lsHistory (법령 연혁 목록) answers HTML only, so eflaw is used for 법령 history; rows are kept by 법령ID.
"""
from __future__ import annotations

import os

PROJECT = r"G:\MSDS"
HERE = os.path.dirname(os.path.abspath(__file__))
LAW_SET = os.path.join(HERE, "law_set.json")                       # the law list (data, not code)
RAW_DIR = os.path.join(PROJECT, "data", "portal_raw", "law")       # raw responses (gzip) + manifest.json
MANIFEST = os.path.join(RAW_DIR, "manifest.json")
REPORT = os.path.join(RAW_DIR, "build_report.json")

SEARCH_API = "https://www.law.go.kr/DRF/lawSearch.do"
SERVICE_API = "https://www.law.go.kr/DRF/lawService.do"
SITE = "https://www.law.go.kr"
# human links: the current version by name, and one fixed version by serial
LINK_CURRENT = {"law": SITE + "/법령/{name}", "admrul": SITE + "/행정규칙/{name}"}
LINK_VERSION = {"law": SITE + "/LSW/lsInfoP.do?lsiSeq={serial}", "admrul": SITE + "/LSW/admRulInfoP.do?admRulSeq={serial}"}

REQUEST_GAP_S = 1.0              # about one request per second
PAGE_SIZE = 100                  # lawSearch display maximum
MAX_PAGES = 20                   # history pages per law (2,000 versions)
MAX_DOWNLOAD_BYTES = 40 * 1024 * 1024   # a 고시 with large 별표 tables is several MB of JSON

SOURCE_ID = "law_go_kr_corpus"   # law_docs / law_articles / law_annexes / law_history rows
DIFF_SOURCE_ID = "law_go_kr_api"  # article-level diffs appended to reg_changes (same id as reg_official's API rows)
SOURCES = {
    SOURCE_ID: {
        "name": "법제처 국가법령정보 OPEN API — 법령·행정규칙 현행 본문(조문·별표 제목)과 연혁",
        "url": "https://open.law.go.kr",
        "license": "법령·고시는 저작권 보호 대상 아님(저작권법 제7조). 출처 표시(법제처 국가법령정보센터)",
    },
}

# which repo files are scanned for law.go.kr/<법령|행정규칙>/<name> links (law_refs.py)
SCAN_GLOBS = [
    "frontend/public/chemip/*.jsx",
    "backend/data/**/*.json",
    "scripts/portal_build/*.py",
    "data/portal_raw/**/*",
]
SCAN_SKIP_DIRS = [os.path.join("data", "portal_raw", "law")]       # our own output
SCAN_EXTS = (".jsx", ".json", ".py", ".txt", ".html", ".csv", ".md", ".xml")
SCAN_MAX_BYTES = 20 * 1024 * 1024
KR_LISTS_DIR = os.path.join("backend", "data", "trade_controls", "kr_lists")   # files here carry a list_id
