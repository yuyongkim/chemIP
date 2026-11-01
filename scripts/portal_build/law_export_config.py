"""Static law area (R2 v1/law/) of the Korean law corpus: every path, file name and tuning value, defined once.

law_export.py (entry), law_export_shape.py, law_cite.py and law_mentions.py import from here. The corpus itself is
data/portal_facts.db law_* (law_corpus.py); the curated legal basis of lists without one is law_basis.json (data).
Format: scripts/static_export/CONTRACT.md "law/".
"""
from __future__ import annotations

import os

import law_config as LC

PROJECT = LC.PROJECT
HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(PROJECT, "data", "portal_facts.db")              # read-only here
BASIS_FILE = os.path.join(HERE, "law_basis.json")                  # legal basis of lists whose file has none (NCIS, PSM)
REPORT = os.path.join(LC.RAW_DIR, "export_report.json")

# static output (same root as scripts/static_export/config.py OUT); this folder holds only law/ files = upload staging
OUT = os.environ.get("CHEMIP_STATIC_EXPORT_DIR", r"E:\dev-cache\chemip-static\out\v1")
AREA = "law"
FORMAT = 1
INDEX_FILE = "index.json"       # every current doc (meta, counts, links) + cas_buckets
TOC_FILE = "toc.json"           # headings + article titles of every doc (corpus-wide title search)
LISTS_FILE = "lists.json"       # KR list id → resolved legal-basis citations
DOC_FILE = "{id}.json"          # one current doc: articles (항/호/목), headings, annexes, history
SHARD_FILE = "cas_{n}.json"     # CAS → list ids + literal mentions, n = fnv1a32(CAS) % CAS_BUCKETS
CAS_BUCKETS = 64

# doc id = "<kind>_<law_id>" (law_id is stable across versions; kind law | admrul)
DOC_ID_FMT = "{kind}_{law_id}"
# law.go.kr article link template ({art} = 제N조 / 제N조의M, filled by the client); 행정규칙 have no article link
ART_URL = {"law": LC.SITE + "/법령/{name}/{{art}}", "admrul": ""}

# literal mentions of a substance's Korean name or CAS in article text (law_mentions.py)
NAME_MIN_CHARS = 2              # Hangul names shorter than this are not searched
NAME_MAX_CHARS = 40
MENTION_MAX_PER_CAS = 30        # rows kept per CAS (the total is kept too)
MENTION_CONTEXT = 50            # characters of context on each side of a hit
# names that are generic words in law text, not a reference to one substance
NAME_STOP = {"가스", "물", "석유", "공기", "분진", "먼지", "연료", "용제", "산", "염", "광물유", "윤활유", "경유", "등유", "휘발유"}
# particles that may follow a name and still count as the whole word
NAME_PARTICLES = "은는이가을를의과와도에로및만"

SOURCE = {
    "name": "법제처 국가법령정보센터 OPEN API",
    "url": "https://open.law.go.kr",
    "site": "https://www.law.go.kr",
    "license": LC.SOURCES[LC.SOURCE_ID]["license"],
}

INTL_REG_KR = ("IR_KR_OSHA_PSM",)     # intl_regulatory lists that are Korean law lists
# order of a substance's lists in its shard entry (= panel order): the 화관법·화평법 status and PSM first, then the
# other lists in reg order, 기존화학물질 (true for almost every substance) last
LIST_FIRST = ("NCIS_PROHIBITED", "NCIS_RESTRICTED", "NCIS_ACCIDENT_PREP", "NCIS_HAZARDOUS", "IR_KR_OSHA_PSM", "NCIS_PRIORITY", "NCIS_POPS")
LIST_LAST = ("NCIS_EXISTING",)


def out_dir() -> str:
    return os.path.join(OUT, AREA)
