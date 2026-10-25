"""방식 B — 버킷 + SQL 스캔(Athena·R2 SQL·Data Query 와 같은 구조): Parquet 를 DuckDB 로 질의어마다 전부 훑는다.
스캔량 = 읽은 Parquet 바이트이므로, 스캔 과금 상품의 질의 1회 비용을 이 값으로 셈한다."""
from __future__ import annotations

import duckdb

from config import QUERY_TERMS, SAMPLE_PARQUET, TEXT_FIELDS
from results import Timer, save, size_bytes


def main() -> None:
    con = duckdb.connect()
    src = f"read_parquet('{SAMPLE_PARQUET.as_posix()}')"
    where = " OR ".join(f"contains(lower({f}), ?)" for f in TEXT_FIELDS)
    queries = []
    for term in QUERY_TERMS:
        with Timer() as t:
            n = con.execute(f"SELECT count(*) FROM {src} WHERE {where}", [term] * len(TEXT_FIELDS)).fetchone()[0]
        queries.append({"term": term, "docs": n, "seconds": round(t.s, 2)})
    secs = [q["seconds"] for q in queries]
    save("parquet_scan", {
        "method": "Parquet + DuckDB 전체 스캔 (질의어 1개 = 텍스트 열 전부 읽기)",
        "parquet_bytes": size_bytes(SAMPLE_PARQUET),
        "threads": con.execute("SELECT current_setting('threads')").fetchone()[0],
        "median_seconds": sorted(secs)[len(secs) // 2],
        "queries": queries,
    })


if __name__ == "__main__":
    main()
