"""Pure assembly of the portal facts files (no I/O): f/<CAS>.json, g/un_index.json and f/id_<n>.json.

Input is plain rows read from portal_facts.db by portal_facts.py. Formats: CONTRACT.md "f/<CAS>.json".
"""
from __future__ import annotations

import collections

import config

# identifier types shown in f/<CAS>.json "ids" (names are summarised in "names"); order = display order
ID_TYPES = ["ec", "ke", "un", "inchikey", "pubchem_cid", "wikidata", "kosha_id"]
# identifier types put in the search lookup f/id_<n>.json (EC, KE and InChIKey; UN has g/un_index.json)
LOOKUP_TYPES = ["ec", "ke", "inchikey"]
# best name first: ChemIP's own list (what search shows), then NCIS, Wikidata, aliases
NAME_SOURCE_RANK = {"chemip_terms": 0, "ncis": 1, "wikidata": 2, "chemip_aliases": 3}
NAMES_KEPT = 3
NAME_MAX = 80
IDS_KEPT = 10        # values per identifier type in f/<CAS>.json (benzene has 65 KOSHA MSDS record ids)
UN_CAS_KEPT = 8      # CAS entries per UN number in g/un_index.json ("n" keeps the full count)


def fnv1a32(s: str) -> int:
    """Same hash as search_keys.fnv1a32 / static_search_index.jsx ssiFnv1a32 (kept here so this module stays pure)."""
    h = 0x811C9DC5
    for b in s.encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h


def lookup_key(value: str) -> str:
    """Normalised identifier as the client builds it from the query: upper case, no spaces."""
    return "".join(str(value).split()).upper()


def lookup_bucket(value: str, buckets: int = config.FACTS_ID_BUCKETS) -> int:
    return fnv1a32(lookup_key(value)) % buckets


def best_names(rows: list[tuple[str, str, str]]) -> dict[str, list[str]]:
    """[(id_type, value, source_id)] → {"ko": [...], "en": [...]}, best first, at most NAMES_KEPT each."""
    out = {}
    for lang in ("ko", "en"):
        cand = [(NAME_SOURCE_RANK.get(s, 9), i, v) for i, (t, v, s) in enumerate(rows) if t == f"name_{lang}"]
        seen, names = set(), []
        for _, _, v in sorted(cand):
            if v not in seen:
                seen.add(v)
                names.append(v[:NAME_MAX])
        out[lang] = names[:NAMES_KEPT]
    return out


def link_id(cas: str, id_rows: list[tuple[str, str, str]]) -> str:
    """chem id the UI opens for this CAS: the KOSHA id of ChemIP's list (as search links it), else the CAS when the
    list has it (p/<CAS>.json exists), else an MSDS-only record id (p/<id>.json, kind "msds")."""
    kosha_terms = sorted(v for t, v, s in id_rows if t == "kosha_id" and s == "chemip_terms")
    if kosha_terms:
        return kosha_terms[0]
    if any(s == "chemip_terms" for _, _, s in id_rows):
        return cas
    msds = sorted(v for t, v, s in id_rows if t == "kosha_id")
    return msds[0] if msds else cas


def _prop_rank(row: dict, kosha_ids: set[str]) -> tuple:
    return (row["chem_id"] not in kosha_ids, row["value_num"] is None, not row["origin"], row["chem_id"] or "")


def facts_object(cas: str, id_rows, prop_rows, transport_rows, oel_rows, oel_text_rows, sources: dict) -> dict:
    """One f/<CAS>.json body. Rows are dicts with the DB column names."""
    kosha_terms = {v for t, v, s in id_rows if t == "kosha_id" and s == "chemip_terms"}
    ids = {}
    for t in ID_TYPES:
        vals = sorted({v for tt, v, _ in id_rows if tt == t})
        if vals:
            ids[t] = vals[:IDS_KEPT]
    props = collections.defaultdict(list)
    for r in sorted(prop_rows, key=lambda r: _prop_rank(r, kosha_terms)):
        props[r["prop"]].append({"t": r["value_text"], "n": r["value_num"], "u": r["unit"], "c": r["condition"],
                                 "o": r["origin"], "id": r["chem_id"], "s": r["source_id"]})
    transport = [{"un": r["un_number"], "name": r["proper_name"], "class": r["hazard_class"], "pg": r["packing_group"],
                  "mp": r["marine_pollutant"], "ems": r["ems"], "erg": r["erg_guide"], "id": r["chem_id"], "s": r["source_id"]}
                 for r in sorted(transport_rows, key=lambda r: (r["chem_id"] not in kosha_terms, r["chem_id"] or ""))]
    oel = [{"j": r["jurisdiction"], "kind": r["kind"], "v": r["value"], "u": r["unit"], "note": r["notation"],
            "as_of": r["as_of"], "s": r["source_id"]} for r in oel_rows]
    oel_text = [{"j": r["jurisdiction"], "id": r["chem_id"], "t": r["text"], "s": r["source_id"]} for r in oel_text_rows]
    used = {x["s"] for x in [*sum(props.values(), []), *transport, *oel, *oel_text]}
    used.update(s for _, _, s in id_rows)
    return {
        "v": config.FACTS_FORMAT,
        "cas": cas,
        "link": link_id(cas, id_rows),
        "names": best_names(id_rows),
        "ids": ids,
        "props": dict(props),
        "transport": transport,
        "oel": oel,
        "oel_text": oel_text,
        "sources": {s: sources[s] for s in sorted(used) if s in sources},
    }


def _most_common(values):
    vals = [v for v in values if v]
    return collections.Counter(vals).most_common(1)[0][0] if vals else None


def un_index(transport_by_cas: dict[str, list[dict]], card: dict[str, dict]) -> dict:
    """{UN: {name, class, pg, mp, ems, n, cas: [[CAS, link, name_ko, name_en], ...]}}. Fields = most common value over
    the MSDS rows of that UN; cas list = the first UN_CAS_KEPT by (no Korean name, no English name, CAS), n = all."""
    by_un = collections.defaultdict(list)
    for cas, rows in transport_by_cas.items():
        for r in rows:
            by_un[r["un_number"]].append((cas, r))
    out = {}
    for un in sorted(by_un):
        pairs = by_un[un]
        cas_list = sorted({c for c, _ in pairs})
        out[un] = {
            "name": _most_common(r["proper_name"] for _, r in pairs),
            "class": _most_common(r["hazard_class"] for _, r in pairs),
            "pg": _most_common(r["packing_group"] for _, r in pairs),
            "mp": _most_common(r["marine_pollutant"] for _, r in pairs),
            "ems": _most_common(r["ems"] for _, r in pairs),
            "n": len(cas_list),
            "cas": [[c, card[c]["link"], *card[c]["names"]] for c in
                    sorted(cas_list, key=lambda c: (not card[c]["names"][0], not card[c]["names"][1], c))[:UN_CAS_KEPT]],
        }
    return out


def id_shards(id_rows_by_cas: dict[str, list[tuple[str, str, str]]], card: dict[str, dict],
              buckets: int = config.FACTS_ID_BUCKETS) -> dict[int, dict]:
    """{bucket: {key: [[type, CAS, link, name_ko, name_en], ...]}} for the LOOKUP_TYPES identifiers."""
    shards = collections.defaultdict(lambda: collections.defaultdict(list))
    for cas in sorted(id_rows_by_cas):
        seen = set()
        for t, v, _ in id_rows_by_cas[cas]:
            if t not in LOOKUP_TYPES or (t, v) in seen:
                continue
            seen.add((t, v))
            key = lookup_key(v)
            shards[lookup_bucket(v, buckets)][key].append([t, cas, card[cas]["link"], *card[cas]["names"]])
    return {b: dict(sorted(d.items())) for b, d in shards.items()}
