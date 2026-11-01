"""Emergency exposure guidelines (el) + toxic probit constants — every path, URL and source definition, defined once.

Sources (all public, values copied with attribution):
  aegl  EPA AEGL program pages (US government work) — AEGL-1/2/3 at 10 min, 30 min, 60 min, 4 h, 8 h.
  pac   DOE Protective Action Criteria Rev. 29 (May 2016, US government work) — PAC-1/2/3 (60 min). A PAC row whose
        basis is an ERPG reproduces that AIHA ERPG value; it is shown only as "ERPG via DOE PAC", with no AIHA text.
        edms3.energy.gov resets connections from outside the US, so the file is taken from the Internet Archive copy
        of the same DOE URL (the manifest records both URLs).
  rivm  RIVM probitrelaties (Dutch government, public web pages) — lethal probit a, b, n (C in mg/m3, t in min).
"""
from __future__ import annotations

import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW_DIR = os.path.join(PROJECT, "data", "portal_raw", "el")
MANIFEST = "manifest.json"

# static output (same root as scripts/static_export/config.py OUT)
OUT = os.environ.get("CHEMIP_STATIC_EXPORT_DIR", r"E:\dev-cache\chemip-static\out\v1")
AREA = "el"
FORMAT = 1
INDEX_FILE = "index.json"

# generated frontend data file for the toxic_probit calculator
PROBIT_JSX = os.path.join(PROJECT, "frontend", "public", "chemip", "calc_toxic_probit_data.jsx")

USER_AGENT = "Mozilla/5.0 (compatible; ChemIP-portal-build/1; +https://chemip.yule.pics)"
GAP_SECONDS = 0.6
TIMEOUT = 90

AEGL_BASE = "https://www.epa.gov"
AEGL_INDEX = "https://www.epa.gov/aegl/access-acute-exposure-guideline-levels-aegls-values"
AEGL_TIMES = ["10min", "30min", "60min", "4h", "8h"]

PAC_DOE_URL = "https://edms3.energy.gov/pac/Docs/Revision_29.xlsx"
PAC_ARCHIVE_URL = "https://web.archive.org/web/2022id_/" + PAC_DOE_URL
PAC_FILE = "Revision_29.xlsx"
# sheets inside Revision_29.xlsx (xl/worksheets/sheetN.xml): 1 = chemical data (MW), 2 = Table 2 PACs in original units
# with their basis, 4 = Table 4 PACs in mg/m3. Checked against the header rows by el_pac.py.
PAC_SHEET_DATA = "xl/worksheets/sheet1.xml"
PAC_SHEET_ORIGINAL = "xl/worksheets/sheet2.xml"
PAC_SHEET_MGM3 = "xl/worksheets/sheet4.xml"

RIVM_BASE = "https://www.rivm.nl"
RIVM_INDEX = "https://www.rivm.nl/probitrelaties/statusoverzicht-probitrelaties"
RIVM_METHOD = "https://www.rivm.nl/probitrelaties/afleiding-beoordeling-en-vaststelling"

SOURCES = {
    "epa_aegl": {
        "name": "US EPA Acute Exposure Guideline Levels (AEGL) values",
        "url": AEGL_INDEX,
        "license": "US government work (17 USC 105), public domain. NAS/NAP technical volumes are linked, not copied.",
    },
    "doe_pac_rev29": {
        "name": "US DOE Protective Action Criteria (PAC) Rev. 29, May 2016 (DOE-HDBK-1046-2016)",
        "url": "https://www.energy.gov/nnsa/protective-action-criteria-pac-aegls-erpgs-teels",
        "license": "US government work (17 USC 105). No DOE endorsement implied. ERPG values belong to AIHA and are shown "
                   "only as values reproduced in DOE PAC.",
    },
    "rivm_probit": {
        "name": "RIVM Probitrelaties (Dutch National Institute for Public Health and the Environment)",
        "url": "https://www.rivm.nl/probitrelaties",
        "license": "Dutch government public web pages; values cited with the page URL and date.",
    },
}


def raw_dir(source_id: str) -> str:
    return os.path.join(RAW_DIR, source_id)


def out_dir() -> str:
    return os.path.join(OUT, AREA)
