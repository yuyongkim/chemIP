"""Decide, after the scan, which terms are too generic to publish as-is (stoplist + corpus document frequency).

Applied at shard time so the stoplist / MAX_TERM_DF can be tightened without rescanning the sources.
"""
import collections
import json

import config
import source_files
import terms
from cas import is_valid_cas

STOPLIST, TITLE_ONLY = "stoplist", "title_only"


def corpus_df():
    """{term: number of source records it was the best hit for}, summed over all finished stats files."""
    df = collections.Counter()
    records = 0
    for folder, path, _size in source_files.list_source_files():
        _m, s = source_files.match_paths(folder, path)
        if s.exists():
            st = json.loads(s.read_text(encoding="utf-8"))
            df.update(st["term_df"])
            records += st["records"]
    return df, records


def suppressed_terms(df):
    """{term: reason}. reason 'stoplist' -> all rows dropped; 'title_only' -> abstract hits dropped."""
    stop = terms.load_stoplist()
    out = {}
    for term, n in df.items():
        if is_valid_cas(term):
            continue
        if term in stop:
            out[term] = STOPLIST
        elif n > config.MAX_TERM_DF:
            out[term] = TITLE_ONLY
    return out


def keep_row(row, suppressed):
    reason = suppressed.get(row["term"])
    return reason is None or (reason == TITLE_ONLY and row["field"] == "title")
