"""PubChem fetch settings for the search synonyms (values defined once). Scope is fixed by the owner (2026-10-28):
only the benchmark substances plus the SEO tier-1 substances; never a bulk download."""
from __future__ import annotations

import os

from spec import PROJECT, SEARCH_DATA_DIR

CACHE_DIR = r"E:\dev-cache\pubchem"                       # raw PUG REST responses, one file per CAS (off C:)
OUT_FILE = os.path.join(SEARCH_DATA_DIR, "pubchem_synonyms.json")
BENCHMARK_LIST = os.path.join(PROJECT, "scripts", "substance_search_benchmark", "data", "common_substances.json")
SEO_SELECTION_CSV = r"E:\dev-cache\chemip-seo\reports\selection.csv"   # rows whose tier == SEO_TIER
SEO_TIER = "tier1"
MAX_TARGETS = 800                                         # guard: benchmark (329) + SEO tier 1 (400), overlap removed

PROPERTY_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{cas}/property/IUPACName,Title/JSON"
SYNONYMS_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
DOCS_URL = "https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest"
GAP_SECONDS = 0.35                                        # PubChem asks for at most 5 requests/s
TIMEOUT = 30
USER_AGENT = "chemip-search-synonyms/1"

TOP_SYNONYMS = 8                                          # first N usable synonyms (PubChem lists the best first)
MAX_NAME_CHARS = 80
# Registry numbers and database codes, not names. The first pattern is matched case-insensitively.
JUNK_PATTERNS = [
    r"^(UNII|DTXSID|DTXCID|CHEBI|CHEMBL|NSC|EINECS|EC |CCRIS|HSDB|RCRA|UN ?\d|AI3-|BRN |MFCD|SCHEMBL|ZINC|AKOS|"
    r"InChI|WLN|Caswell|EPA Pesticide|FEMA|BDBM|NCGC|CAS-|SMR|MLS|Tox21|EN300|NCI)",
    r"^\d{2,7}-\d{2}-\d$",
    r"^\d{3}-\d{3}-\d$",
    r"^[A-Z0-9-]{1,12}$",
    r"^[A-Z]{1,6}[- ]?\d{2,}",
    r"_(FLUKA|SIAL|ALDRICH|RIEDEL|SUPELCO|SIGMA|USP|MERCK)",   # vendor catalogue numbers
    r"^[A-Za-z]+:\S+$",                                       # prefixed database ids (RefChem:66979)
    r"\d{5,}",                                                # long digit runs: catalogue / registry numbers
]
