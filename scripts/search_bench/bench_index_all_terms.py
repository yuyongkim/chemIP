"""방식 D 의 재색인 비용: 원본을 다시 훑는 대신 Tantivy 색인에 전체 검색어(terms.tsv)를 하나씩 질의해 물질 → 특허 표를 만든다."""
from __future__ import annotations

import tantivy

from bench_tantivy import schema
from config import TANTIVY_DIR, TERMS_TSV, TEXT_FIELDS
from results import Timer, save


def main() -> None:
    index = tantivy.Index(schema(), path=str(TANTIVY_DIR))
    searcher = index.searcher()
    terms = [t for _, _, t in (l.partition("\t") for l in TERMS_TSV.read_text(encoding="utf-8").splitlines()) if len(t) >= 2]
    hits = failed = matched_terms = 0
    with Timer() as t:
        for term in terms:
            try:
                q = index.parse_query('"' + term.replace('"', " ").replace("\\", " ") + '"', list(TEXT_FIELDS))
                n = searcher.search(q, 1, count=True).count
            except ValueError:
                failed += 1
                continue
            hits += n
            matched_terms += n > 0
    save("tantivy_all_terms", {
        "method": "Tantivy 색인에 전체 검색어 질의 (재색인 대체)",
        "terms": len(terms),
        "parse_failed": failed,
        "terms_with_hits": matched_terms,
        "term_doc_hits": hits,
        "seconds": round(t.s, 1),
    })


if __name__ == "__main__":
    main()
