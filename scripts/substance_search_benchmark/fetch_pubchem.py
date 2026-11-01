"""Fetch PubChem Title and IUPACName for every CAS of data/common_substances.json into data/pubchem_names.json.

Cached: CAS already in the file are skipped. Source of the benchmark's IUPAC query strings only;
the search index never reads this file.  Run: python fetch_pubchem.py
"""
from __future__ import annotations

import datetime
import json
import os
import time
import urllib.error
import urllib.request

import config


def _wanted() -> list[str]:
    with open(config.COMMON, encoding="utf-8") as fh:
        return sorted({it["cas"] for it in json.load(fh)["items"]})


def _fetch(cas: str) -> dict:
    req = urllib.request.Request(config.PUBCHEM_URL.format(cas=cas), headers={"User-Agent": config.USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            props = json.load(r)["PropertyTable"]["Properties"][0]
    except urllib.error.HTTPError as e:
        return {"status": e.code}
    return {"cid": props.get("CID"), "title": props.get("Title", ""), "iupac": props.get("IUPACName", "")}


def main() -> None:
    data = {}
    if os.path.exists(config.PUBCHEM_NAMES):
        with open(config.PUBCHEM_NAMES, encoding="utf-8") as fh:
            data = json.load(fh)
    names = data.setdefault("names", {})
    for cas in _wanted():
        if cas in names:
            continue
        names[cas] = _fetch(cas)
        print(cas, names[cas])
        time.sleep(config.PUBCHEM_GAP_SECONDS)
    data["_source"] = "PubChem PUG REST compound/name/<CAS>/property/IUPACName,Title"
    data["_fetched"] = data.get("_fetched") or datetime.date.today().isoformat()
    with open(config.PUBCHEM_NAMES, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1, sort_keys=True)


if __name__ == "__main__":
    main()
