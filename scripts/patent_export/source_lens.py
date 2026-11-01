"""Reader for Lens.org-format patent records (*.jsonl.gz, one JSON object per line).

Only the fields needed are decoded: the fixed header (lens_id, jurisdiction, doc_number, kind,
date_published, docdb_id) by regex on the first bytes, and the 'invention_title' / 'abstract' arrays
by raw_decode at their offsets. Claims and description (most of the bytes in USPTO/WIPO) are never parsed.
"""
import gzip
import json
import re

_HEADER = re.compile(
    rb'"lens_id":\s*"(?P<lens>[^"]*)".{0,80}?"jurisdiction":\s*"(?P<jur>[A-Z]{2})".{0,20}?'
    rb'"doc_number":\s*"(?P<num>[^"]*)"(?:.{0,20}?"kind":\s*"(?P<kind>[^"]*)")?', re.S)
_DATE = re.compile(rb'"date_published":\s*"([0-9-]*)"')   # missing on some pre-1950 records
_DOCDB = re.compile(rb'"docdb_id":\s*(\d+)')
_TITLE_KEY = re.compile(rb'"invention_title":\s*\[')
_ABSTRACT_KEY = re.compile(rb'"abstract":\s*\[')
_HEADER_SPAN = 800
_DECODER = json.JSONDecoder()


def _decode_array_at(line, match):
    """Decode the JSON array that starts at match.end()-1; [] on any problem."""
    if not match:
        return []
    start = match.end() - 1
    for span in (65536, len(line) - start):
        chunk = line[start:start + span].decode("utf-8", "ignore")
        try:
            value, _ = _DECODER.raw_decode(chunk)
            return value if isinstance(value, list) else []
        except ValueError:
            continue
    return []


def _texts(items):
    """[{'text':..,'lang':..}] -> [(lang, text)]"""
    out = []
    for it in items:
        if isinstance(it, dict) and it.get("text"):
            out.append((it.get("lang") or "", it["text"]))
    return out


def parse_line(line):
    """bytes -> record dict or None (non-patent / malformed line)."""
    head = _HEADER.search(line, 0, _HEADER_SPAN)
    if not head:
        return None
    docdb = _DOCDB.search(line, 0, _HEADER_SPAN)
    date = _DATE.search(line, 0, _HEADER_SPAN)
    jur, num, kind = head["jur"].decode(), head["num"].decode(), (head["kind"] or b"").decode()
    return {
        "patent_id": f"{jur}{num}{kind}",
        "jurisdiction": jur,
        "date": date.group(1).decode() if date else "",
        "lens_id": head["lens"].decode(),
        "docdb_id": docdb.group(1).decode() if docdb else None,
        "titles": _texts(_decode_array_at(line, _TITLE_KEY.search(line))),
        "abstracts": _texts(_decode_array_at(line, _ABSTRACT_KEY.search(line))),
    }


def iter_records(fileobj):
    """Yield parsed records (None for unparseable lines) from an open binary gzip file object."""
    with gzip.GzipFile(fileobj=fileobj, mode="rb") as f:
        for line in f:
            yield parse_line(line)
