"""CAS lookup on PubChem for substances whose legal text gives no CAS number.

Only used for Korean 마약류 원료물질 that are not on the INCB Red List. The result
is tagged cas_source='PubChem' so it is never mistaken for a number printed in law.
Rule: take the first synonym that is a well-formed CAS RN with a valid check digit.
"""
from __future__ import annotations

import json
import re
import urllib.parse
from pathlib import Path

from common import cas_is_valid, fetch

URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{name}/synonyms/JSON"
CAS_FULL = re.compile(r"^\d{2,7}-\d{2}-\d$")


def lookup(name: str, raw_dir: Path, offline: bool) -> dict:
    safe = re.sub(r"[^0-9A-Za-z]+", "_", name).strip("_")[:60]
    dest = raw_dir / "pubchem" / f"{safe}.json"
    try:
        path = fetch(URL.format(name=urllib.parse.quote(name)), dest, offline)
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"cas": "", "cid": None, "error": str(exc)[:200]}
    info = (data.get("InformationList") or {}).get("Information") or []
    if not info:
        return {"cas": "", "cid": None, "error": "no PubChem record"}
    first = info[0]
    for syn in first.get("Synonym", []):
        if CAS_FULL.match(syn) and cas_is_valid(syn):
            return {"cas": syn, "cid": first.get("CID"), "error": ""}
    return {"cas": "", "cid": first.get("CID"), "error": "no CAS synonym"}
