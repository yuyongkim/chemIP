"""Turn one source record + its term hits into compact per-substance match rows."""
import config

_FIELD_RANK = {"title": 0, "abstract": 1}
ELLIPSIS = "…"


def pick_title(titles):
    """English title if present, else the first one; trimmed to config.TITLE_MAX."""
    if not titles:
        return ""
    en = [t for lang, t in titles if lang == "en"]
    return " ".join((en[0] if en else titles[0][1]).split())[:config.TITLE_MAX]


def snippet_around(text, start):
    lo = max(0, start - config.SNIPPET_BEFORE)
    body = text[lo:lo + config.SNIPPET_MAX - (1 if lo else 0)]
    return (ELLIPSIS if lo else "") + body


def ordered_texts(rec):
    """[(field, lang, raw_text)]: titles then abstracts, English first; unmatchable languages dropped."""
    out = []
    for field, items in (("title", rec["titles"]), ("abstract", rec["abstracts"])):
        if field in config.MATCH_FIELDS:
            out += [(field, lang, t) for lang, t in sorted(items, key=lambda x: x[0] != "en")
                    if lang not in config.SKIP_TEXT_LANGS]
    return out


def best_hits(rec, automaton, cas_set, match_text):
    """{cas: (field, term, snippet)}: title hits beat abstract hits, then longer terms win."""
    best = {}
    first_abstract = None
    for field, _lang, raw in ordered_texts(rec):
        display, hits = match_text(automaton, cas_set, raw)
        if field == "abstract" and first_abstract is None and display:
            first_abstract = display[:config.SNIPPET_MAX]
        for start, end, term, cas in hits:
            key = (_FIELD_RANK[field], start - end)
            if cas not in best or key < best[cas][0]:
                snip = snippet_around(display, start) if field == "abstract" else None
                best[cas] = (key, field, term, snip)
    return {cas: (field, term, snip or first_abstract or "")
            for cas, (_key, field, term, snip) in best.items()}


def match_rows(rec, folder, hits):
    """One row per substance found in this record."""
    base = {"pid": rec["patent_id"], "jur": rec["jurisdiction"], "date": rec["date"],
            "lens": rec["lens_id"], "title": pick_title(rec["titles"]), "src": folder}
    for cas, (field, term, snip) in hits.items():
        yield dict(base, cas=cas, term=term, field=field, snip=snip)
