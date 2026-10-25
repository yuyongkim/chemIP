"""PubChem PUG-REST fallback: English common name -> CAS (accepted only for a unique CID).

Responses are cached under RAW_ROOT/pubchem (untrusted, parsed with json only).
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

from kr_env import cas as casmod
from kr_env import termdb

from . import config

_PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
_CAS_FULL = re.compile(r"^\d{2,7}-\d{2}-\d$")


def _pug_json(url: str, dest) -> dict | None:
    """GET a PUG-REST JSON (cached under RAW_ROOT/pubchem). 404 -> None (cached as such)."""
    if dest.exists():
        data = json.loads(dest.read_text(encoding="utf-8"))
        return None if data.get("_status") == 404 else data
    dest.parent.mkdir(parents=True, exist_ok=True)
    time.sleep(0.25)
    req = urllib.request.Request(url, headers={"User-Agent": "ChemIP-kr-product/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read(5_000_000)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            dest.write_text('{"_status": 404}', encoding="utf-8")
            return None
        raise
    data = json.loads(raw.decode("utf-8"))
    dest.write_text(json.dumps(data), encoding="utf-8")
    return data


def pubchem_cas(name: str) -> dict | None:
    """English common name -> CAS via PubChem, only when the name resolves to exactly one CID.
    CAS = first synonym with CAS shape and a valid check digit; other CAS synonyms are recorded."""
    safe = re.sub(r"[^0-9A-Za-z]+", "_", name).strip("_")[:80]
    q = urllib.parse.quote(name, safe="")
    d = _pug_json(f"{_PUG}/compound/name/{q}/cids/JSON", config.RAW_ROOT / "pubchem" / f"cids_{safe}.json")
    cids = ((d or {}).get("IdentifierList") or {}).get("CID") or []
    if len(cids) != 1:
        return None
    cid = cids[0]
    s = _pug_json(f"{_PUG}/compound/cid/{cid}/synonyms/JSON", config.RAW_ROOT / "pubchem" / f"syn_{cid}.json")
    info = (((s or {}).get("InformationList") or {}).get("Information") or [{}])[0]
    cas_list = [x for x in info.get("Synonym", []) if _CAS_FULL.match(x) and casmod.is_valid(x)]
    if not cas_list:
        return None
    return {"cas": casmod.normalize(cas_list[0]), "cid": cid, "query": name,
            "other_cas_synonyms": [casmod.normalize(c) for c in cas_list[1:5]]}


def resolve_pubchem(acc: dict) -> int:
    """Move 'no_exact_name_in_db' rows that carry an English common name to entries via PubChem."""
    keep, moved = [], 0
    idx = termdb.index()
    for u in acc["unmatched"]:
        forms = u.pop("_en_forms", None) or []
        hit = None
        if u.get("reason") == "no_exact_name_in_db":
            for f in forms:
                hit = pubchem_cas(f)
                if hit:
                    break
        if not hit:
            keep.append(u)
            continue
        e = {"cas": hit["cas"], "name_ko": u["name"], "name_en": u.get("name_en"), "detail": u["detail"],
             "item_no": u["item_no"], "match_method": "pubchem", "pubchem_cid": hit["cid"],
             "pubchem_query": hit["query"], "db_name_ko": idx.name_ko.get(hit["cas"]),
             "db_name_en": idx.name_en.get(hit["cas"])}
        if hit["other_cas_synonyms"]:
            e["pubchem_other_cas_synonyms"] = hit["other_cas_synonyms"]
        acc["entries"].append(e)
        moved += 1
    acc["unmatched"] = keep
    return moved
