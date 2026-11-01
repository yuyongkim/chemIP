"""Pure functions: match rows of one substance -> deduplicated published records + index summary."""
import collections

import config
from links import viewer_link
from matcher import context_rejects
from script_class import script_of
from cas import is_valid_cas

_FIELD_RANK = {"title": 0, "abstract": 1}


def year_of(date):
    return int(date[:4]) if date[:4].isdigit() else None


def _hit_offset(text, term, abstract_snippet):
    """Where the stored hit sits in its snippet/title (snippets start 70 chars before the hit)."""
    if abstract_snippet and text.startswith("…"):
        pos = config.SNIPPET_BEFORE + 1
        return pos if text[pos:pos + len(term)] == term else text.find(term)
    return text.find(term)


def context_ok(row):
    """Re-apply the matcher's context rules to a stored row (lets v1 benefit from rule fixes made after
    the scan without rescanning). Rows whose hit cannot be located are kept."""
    term = row["term"]
    if script_of(term) != "latin" or is_valid_cas(term):
        return True
    text = (row["snip"] if row["field"] == "abstract" else row["title"]).lower()
    pos = _hit_offset(text, term, row["field"] == "abstract")
    return pos < 0 or not context_rejects(text, pos, pos + len(term))


def to_record(row):
    """Published record schema (one patent publication for one substance)."""
    return {
        "patent_id": row["pid"],
        "title": row["title"][:config.TITLE_MAX],
        "jurisdiction": row["jur"],
        "year": year_of(row["date"]),
        "date": row["date"] or None,
        "matched_term": row["term"],
        "field": row["field"],
        "snippet": row["snip"][:config.SNIPPET_MAX],
        "link": viewer_link(row["pid"]),
        "lens_id": row["lens"] or None,
        "src": row["src"],
    }


def dedupe(rows):
    """One row per patent_id: title hit beats abstract hit; provenance folders are merged."""
    best, srcs = {}, collections.defaultdict(set)
    for r in rows:
        pid = r["pid"]
        srcs[pid].add(r["src"])
        key = (_FIELD_RANK.get(r["field"], 9), -len(r["term"]))
        if pid not in best or key < best[pid][0]:
            best[pid] = (key, r)
    out = []
    for pid, (_k, r) in best.items():
        rec = to_record(r)
        rec["src"] = "+".join(sorted(srcs[pid]))
        out.append(rec)
    return out


def sort_recent(records):
    return sorted(records, key=lambda x: (x["date"] or "", x["patent_id"]), reverse=True)


def by_jurisdiction(records):
    """{JUR: newest-first records}, each list capped at config.MAX_RECORDS_PER_FILE."""
    groups = collections.defaultdict(list)
    for rec in records:
        groups[rec["jurisdiction"]].append(rec)
    return {j: sort_recent(v)[:config.MAX_RECORDS_PER_FILE] for j, v in groups.items()}


def index_summary(cas, meta, records, suppressed_for_cas):
    """index.json content for one substance."""
    years = collections.Counter(str(r["year"]) if r["year"] else "unknown" for r in records)
    return {
        "cas": cas,
        "name": meta.get("name"),
        "name_en": meta.get("name_en"),
        "version": config.OUT_VERSION,
        "total": len(records),
        "by_jurisdiction": dict(collections.Counter(r["jurisdiction"] for r in records).most_common()),
        "by_year": dict(sorted(years.items())),
        "by_source": dict(collections.Counter(s for r in records for s in r["src"].split("+")).most_common()),
        "matched_terms": dict(collections.Counter(r["matched_term"] for r in records).most_common()),
        "restricted_terms": suppressed_for_cas,
        "files": {},
        "recent": sort_recent(records)[:config.INDEX_TOP_RECENT],
    }
