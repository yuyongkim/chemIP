"""Pure assembly of the static law area from what law_export_read.py loaded (no DB, no files).

files(corpus, lists, basis, today) -> ({relative file name: JSON object}, report)
  index.json, toc.json, lists.json, <doc id>.json per doc, cas_<n>.json shards (CONTRACT.md "law/")
fnv1a32(s) -> int   same hash as the client (static_search_index.jsx ssiFnv1a32): UTF-8 bytes, FNV-1a 32-bit
Tested in tests/test_law_export.py.
"""
from __future__ import annotations

from collections import Counter

import law_cite
import law_export_config as C
import law_export_shape as S
import law_mentions


def fnv1a32(s: str) -> int:
    h = 0x811C9DC5
    for b in s.encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h


def cas_bucket(cas: str, buckets: int = C.CAS_BUCKETS) -> int:
    return fnv1a32(cas.strip()) % buckets


def list_cites(lists: list[dict], basis: dict, lookup: dict) -> tuple[dict, dict]:
    """{list_id: {title, group, law, basis, cites}} for lists with at least one resolved citation, + report rows."""
    names = list(lookup)
    out, rep = {}, {}
    for lst in lists:
        b = basis.get(lst["id"])
        if not b:
            rep[lst["id"]] = {"basis": "", "cites": 0, "unresolved": [], "note": "no legal basis text"}
            continue
        parsed = law_cite.parse_basis(b["basis"], names)
        cites, unresolved = law_cite.resolve(parsed, lookup, b["term"])
        rep[lst["id"]] = {"basis": b["basis"], "cites": len(cites), "unresolved": unresolved}
        if cites:
            out[lst["id"]] = {"title": lst["title"], "group": lst["group"], "law": lst["law"], "basis": b["basis"],
                              "cites": cites}
    return out, rep


def names_by_cas(lists: list[dict]) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    for lst in lists:
        for cas, name, _name_en, _detail in lst["rows"]:
            if cas and name:
                out.setdefault(cas, set()).add(name)
    return out


def corpus_articles(corpus: list[dict]) -> list[dict]:
    return [{"doc": S.doc_id(d["doc"]["kind"], d["doc"]["law_id"]), "no": a["article_no"], "text": a["text"]}
            for d in corpus for a in d["articles"] if a["kind"] in ("article", "body") and a["article_no"]]


def shards(lists: list[dict], cited: dict, found: dict, buckets: int = C.CAS_BUCKETS) -> dict[int, dict]:
    """{n: {cas: {l: [list ids], m: [[doc, no, term, snippet]], mn: total}}} — a CAS is in a shard when it is on a
    list with citations or is mentioned in the text."""
    per: dict[str, dict] = {}
    for lst in lists:
        if lst["id"] not in cited:
            continue
        for cas in sorted({r[0] for r in lst["rows"] if r[0]}):
            per.setdefault(cas, {"l": []})["l"].append(lst["id"])
    for cas, rec in found.items():
        e = per.setdefault(cas, {"l": []})
        e["m"], e["mn"] = rec["rows"], rec["total"]
    rank = {lid: i for i, lid in enumerate(lst["id"] for lst in lists)}
    order = lambda lid: (0 if lid in C.LIST_FIRST else 2 if lid in C.LIST_LAST else 1,  # noqa: E731
                         C.LIST_FIRST.index(lid) if lid in C.LIST_FIRST else rank.get(lid, 0))
    for e in per.values():
        e["l"].sort(key=order)
    out: dict[int, dict] = {n: {} for n in range(buckets)}
    for cas in sorted(per):
        out[cas_bucket(cas, buckets)][cas] = per[cas]
    return out


def files(corpus: list[dict], lists: list[dict], basis: dict, today: str) -> tuple[dict, dict]:
    lookup = S.doc_lookup(corpus)
    cited, list_rep = list_cites(lists, basis, lookup)
    by_cas = names_by_cas(lists)
    term_map = law_mentions.terms(by_cas)
    found = law_mentions.mentions(corpus_articles(corpus), term_map, set(by_cas))
    out: dict[str, object] = {}
    index_docs, toc = [], []
    for d in corpus:
        f = S.doc_file(d["doc"], d["articles"], d["annexes"], d["history"])
        out[C.DOC_FILE.format(id=f["id"])] = f
        index_docs.append(S.index_entry(d["doc"], len(f["history"])))
        toc += S.toc_rows(f["id"], f["items"])
    as_of = max((x["as_of"] for x in index_docs), default="")
    out[C.INDEX_FILE] = {"v": C.FORMAT, "exported_at": today, "as_of": as_of, "count": len(index_docs),
                         "cas_buckets": C.CAS_BUCKETS, "source": C.SOURCE, "docs": index_docs}
    out[C.TOC_FILE] = {"v": C.FORMAT, "exported_at": today, "fields": ["doc", "t", "no", "title"], "rows": toc}
    out[C.LISTS_FILE] = {"v": C.FORMAT, "exported_at": today, "as_of": as_of, "source": C.SOURCE, "lists": cited}
    sh = shards(lists, cited, found)
    for n, body in sh.items():
        out[C.SHARD_FILE.format(n=n)] = {"v": C.FORMAT, "n": n, "cas": body}
    term_hits = Counter(r[2] for rec in found.values() for r in rec["rows"])
    report = {"docs": len(index_docs), "toc_rows": len(toc), "lists_with_cites": len(cited), "lists": list_rep,
              "cas_in_shards": sum(len(b) for b in sh.values()), "cas_with_mentions": len(found),
              "mention_rows": sum(rec["total"] for rec in found.values()), "top_terms": term_hits.most_common(25)}
    return out, report
