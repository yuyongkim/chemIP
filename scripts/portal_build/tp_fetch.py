"""Download the raw files of the temperature-dependent property sources into data/portal_raw/tp/<source_id>/.

    python -I -B G:\\MSDS\\scripts\\portal_build\\tp_fetch.py                 # all sources
    python -I -B G:\\MSDS\\scripts\\portal_build\\tp_fetch.py --only nasa_cea

ChemSep: the official lite.zip is opened with zipfile and only the databank XML files and the two licence texts are kept
(nothing in the archive is executed). NASA CEA: thermo.inp, NOTICE.txt and LICENSE.txt at a pinned commit. Wikidata: one
SPARQL query (critical points of items with a CAS number). CoolProp constants: heos_constants.tsv of chemicals v1.5.2.
Each file is recorded in manifest.json with url, date and sha256 (tp_raw.py).
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
import urllib.parse
import urllib.request
import zipfile

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tp_raw  # noqa: E402

USER_AGENT = "ChemIP-portal-build/1 (https://chemip.yule.pics; thermo property build)"
TIMEOUT = 120

CHEMSEP_MEMBERS = {   # zip member suffix → stored name
    "pcd/chemsep1.xml": "chemsep1.xml",
    "pcd/chemsep2.xml": "chemsep2.xml",
    "pcd/Artistic_license_2_0.txt": "Artistic_license_2_0.txt",
    "help/chemsep.lic": "chemsep.lic",
}
NASA_COMMIT = "985fd33368b2334c4162a586c499e0ab41d12bd3"
NASA_FILES = {"data/thermo.inp": "thermo.inp", "NOTICE.txt": "NOTICE.txt", "LICENSE.txt": "LICENSE.txt"}
HEOS_URL = "https://raw.githubusercontent.com/CalebBell/chemicals/v1.5.2/chemicals/Misc/heos_constants.tsv"
WIKIDATA_QUERY = """SELECT ?item ?cas ?T ?P WHERE {
  ?item p:P873 ?st . ?st ps:P873 wd:Q111059 . ?item wdt:P231 ?cas .
  OPTIONAL { ?st pqn:P2076/wikibase:quantityAmount ?T }
  OPTIONAL { ?st pqn:P2077/wikibase:quantityAmount ?P }
}"""


def get(url: str, accept: str = "*/*") -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": accept})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp.read()


def fetch_chemsep() -> None:
    url = tp_raw.source("chemsep_lite")["url"]
    blob = get(url)
    with zipfile.ZipFile(io.BytesIO(blob)) as zf:
        for member in zf.namelist():
            for suffix, name in CHEMSEP_MEMBERS.items():
                if member.replace("\\", "/").endswith(suffix):
                    tp_raw.save_file("chemsep_lite", name, zf.read(member), f"{url}!{member}")
    missing = [n for n in CHEMSEP_MEMBERS.values() if not os.path.exists(tp_raw.raw_path("chemsep_lite", n))]
    if missing:
        raise SystemExit(f"chemsep: missing in lite.zip: {missing}")


def fetch_nasa() -> None:
    for path, name in NASA_FILES.items():
        url = f"https://raw.githubusercontent.com/nasa/cea/{NASA_COMMIT}/{path}"
        tp_raw.save_file("nasa_cea", name, get(url), url)


def fetch_wikidata() -> None:
    url = tp_raw.source("wikidata")["url"] + "?" + urllib.parse.urlencode({"query": WIKIDATA_QUERY})
    data = json.loads(get(url, "application/sparql-results+json"))
    rows = [{k: v["value"] for k, v in b.items()} for b in data["results"]["bindings"]]
    body = json.dumps({"query": WIKIDATA_QUERY, "rows": rows}, ensure_ascii=False, indent=1).encode("utf-8")
    tp_raw.save_file("wikidata", "critical_points.json", body, tp_raw.source("wikidata")["url"])


def fetch_heos() -> None:
    tp_raw.save_file("coolprop_heos", "heos_constants.tsv", get(HEOS_URL), HEOS_URL)


FETCHERS = {"chemsep_lite": fetch_chemsep, "nasa_cea": fetch_nasa, "wikidata": fetch_wikidata, "coolprop_heos": fetch_heos}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--only", nargs="*", choices=sorted(FETCHERS))
    args = ap.parse_args(argv)
    for sid in args.only or list(FETCHERS):
        FETCHERS[sid]()
        print(f"{sid}: {sorted(tp_raw.read_manifest(sid)['files'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
