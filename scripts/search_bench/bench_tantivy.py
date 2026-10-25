"""방식 D — Tantivy(Rust 전문 검색 엔진, Lucene 계열) 색인. 본문은 저장하지 않고 문서 키만 저장한다."""
from __future__ import annotations

import os
import shutil

import pyarrow.parquet as pq
import tantivy

from config import QUERY_TERMS, SAMPLE_PARQUET, TANTIVY_DIR, TEXT_FIELDS
from results import Timer, save, size_bytes


def schema() -> tantivy.Schema:
    sb = tantivy.SchemaBuilder()
    sb.add_text_field("doc_key", stored=True, tokenizer_name="raw")
    for f in TEXT_FIELDS:
        sb.add_text_field(f, stored=False)
    return sb.build()


def build() -> tuple[tantivy.Index, int]:
    shutil.rmtree(TANTIVY_DIR, ignore_errors=True)
    TANTIVY_DIR.mkdir(parents=True)
    index = tantivy.Index(schema(), path=str(TANTIVY_DIR))
    writer = index.writer(heap_size=1_000_000_000, num_threads=min(8, os.cpu_count() or 4))
    n = 0
    for batch in pq.ParquetFile(SAMPLE_PARQUET).iter_batches(batch_size=5_000):
        for r in batch.to_pylist():
            writer.add_document(tantivy.Document(**{k: r[k] or "" for k in ("doc_key", *TEXT_FIELDS)}))
            n += 1
    writer.commit()
    writer.wait_merging_threads()
    index.reload()
    return index, n


def main() -> None:
    with Timer() as tb:
        index, docs = build()
    searcher = index.searcher()
    queries = []
    for term in QUERY_TERMS:
        with Timer() as t:
            q = index.parse_query(f'"{term}"', list(TEXT_FIELDS))
            res = searcher.search(q, 100, count=True)
        queries.append({"term": term, "docs": res.count, "first_page": len(res.hits), "seconds": round(t.s, 3)})
    secs = [q["seconds"] for q in queries]
    save("tantivy", {
        "method": "Tantivy 전문 색인 (본문 미저장)",
        "docs": docs,
        "build_seconds": round(tb.s, 1),
        "index_bytes": size_bytes(TANTIVY_DIR),
        "median_seconds": sorted(secs)[len(secs) // 2],
        "queries": queries,
    })


if __name__ == "__main__":
    main()
