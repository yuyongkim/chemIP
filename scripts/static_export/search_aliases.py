"""Alias rows (chemical_aliases) and search synonyms (synonyms.jsonl) grouped by alias_norm into hash buckets."""
from __future__ import annotations

import collections

import config
from search_keys import fnv1a32
from backend.core.chemical_aliases import normalize_alias, pick_canonical_chem_id
from backend.core.terminology.synonyms import read_synonyms


def doc_refs(docs: dict[int, tuple]) -> dict[tuple, int]:
    """(canonical_id, name, name_en, cas_no, source) -> first doc id carrying exactly those values."""
    by_tuple: dict[tuple, int] = {}
    for d in sorted(docs):
        _, name, cas, desc, name_en, src = docs[d]
        canon = pick_canonical_chem_id(row_id=d, description=desc, cas_no=cas, source=src)
        by_tuple.setdefault((canon, name or "", name_en or "", cas or "", src or ""), d)
    return by_tuple


def alias_buckets(conn, docs: dict[int, tuple]) -> tuple[dict[int, dict[str, list]], int]:
    """bucket -> {alias_norm: [[alias, type_code, confidence, ref], ...]} sorted (confidence desc, alias).

    ref = doc id when the alias row's (canonical_id, chem_name, name_en, cas_no, source) equals that doc's values,
    else the inline list [canonical_id, chem_name, name_en, cas_no, source]. Returns (buckets, inline_ref_count).
    """
    by_tuple = doc_refs(docs)
    buckets: dict[int, dict[str, list]] = collections.defaultdict(lambda: collections.defaultdict(list))
    inline = 0
    for canon, alias, norm, atype, cname, nen, cas, src, conf in conn.execute(
        "SELECT canonical_id, alias, alias_norm, alias_type, chem_name, name_en, cas_no, source, confidence FROM chemical_aliases"
    ):
        ref = by_tuple.get((canon, cname or "", nen or "", cas or "", src or ""))
        if ref is None:
            ref = [canon, cname or "", nen or "", cas or "", src or ""]
            inline += 1
        tcode = config.ALIAS_TYPES.index(atype) if atype in config.ALIAS_TYPES else atype
        buckets[fnv1a32(norm) % config.ALIAS_BUCKETS][norm].append([alias, tcode, conf, ref])
    for norm, entry in synonym_rows(docs):
        buckets[fnv1a32(norm) % config.ALIAS_BUCKETS][norm].append(entry)
    for entries in buckets.values():
        for norm in entries:
            entries[norm].sort(key=lambda e: (-float(e[2] or 0), e[0]))
    return buckets, inline


def synonym_rows(docs: dict[int, tuple]):
    """(alias_norm, [name, type_code, 1.0, doc_id]) for every synonym x every chemical_terms row of its CAS.

    The backend merges all rows of a synonym's CAS directly (SearchMixin._fetch_rows_by_cas); one entry per doc
    lets the client do the same. type = "syn_" + tier ("registry" | "synonym").
    """
    by_cas: dict[str, list[int]] = collections.defaultdict(list)
    for d in sorted(docs):
        if docs[d][2]:
            by_cas[docs[d][2]].append(d)
    header, rows = read_synonyms()
    tiers = {code: s["tier"] for code, s in header["sources"].items()}
    for cas, names in rows:
        for name, code in names:
            tcode = config.ALIAS_TYPES.index(config.SYNONYM_TYPE_PREFIX + tiers[code])
            for d in by_cas.get(cas, []):
                yield normalize_alias(name), [name, tcode, 1.0, d]
