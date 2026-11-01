"""Pure builder of the KOSHA guide full-text index (scripts/static_export/guide_text_build.py)."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts", "static_export"))

import guide_text_build as gtb  # noqa: E402


def test_normalize_keeps_letters_and_digits_only():
    assert gtb.normalize("Flash Point 21℃ (ＡＢ)") == "flashpoint21cab"
    assert gtb.normalize("작업환경 측정․분석") == "작업환경측정분석"
    assert gtb.normalize("") == "" and gtb.normalize(None) == ""


def test_bigrams_and_shard():
    assert gtb.bigrams("abc") == ["ab", "bc"]
    assert gtb.bigrams("a") == []
    assert gtb.fnv1a32("") == 0x811C9DC5
    assert 0 <= gtb.shard_of("구리", 512) < 512


def test_doc_counts_do_not_cross_pages():
    c = gtb.doc_counts(["ab", "cd"])
    assert c == {"ab": 1, "cd": 1}  # no "bc" window across the page break


def test_build_postings_roundtrip():
    docs = [
        {"no": "A-1", "title": "t1", "date": "2020", "url": "u1", "pages": ["구리 구리", "측정"]},
        {"no": "A-2", "title": "t2", "date": "", "url": "", "pages": ["측정   분석\n"]},
    ]
    rows, shard_map = gtb.build(docs, 16)
    assert rows[0] == ["A-1", "t1", "2020", "u1", 2, len("구리 구리") + len("측정")]
    assert rows[1][4:] == [1, len("측정 분석")]
    postings = {bg: arr for shard in shard_map.values() for bg, arr in shard.items()}
    assert gtb.decode_postings(postings["구리"]) == {0: 2}
    assert gtb.decode_postings(postings["측정"]) == {0: 1, 1: 1}
    for n, shard in shard_map.items():
        assert all(gtb.shard_of(bg, 16) == n for bg in shard)


def test_clean_page_collapses_whitespace():
    assert gtb.clean_page(" a \n\n b\tc ") == "a b c"
