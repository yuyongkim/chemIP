"""방식 E — 서비스 조회(물질 → 특허 목록): 지금 SQLite 색인 vs 물질별로 정렬한 Parquet(로컬 / 버킷 흉내 HTTP).
원 색인 앞쪽 LOOKUP_ROW_LIMIT 행만 옮긴다(134.5 GB 전체 변환 전 시험)."""
from __future__ import annotations

import sqlite3

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

import range_server
from config import BENCH_ROOT, GLOBAL_INDEX_DB, LOOKUP_PAGE, LOOKUP_PARQUET, LOOKUP_ROW_LIMIT, SECTION_PRIORITY
from results import Timer, save, size_bytes

COLS = ["id", "chem_id", "patent_id", "title", "section", "snippet", "matched_term", "jurisdiction"]
SCHEMA = pa.schema([("id", pa.int64())] + [(c, pa.string()) for c in COLS[1:]])
PRODUCTION_SQL = """SELECT patent_id, title, file_path, matched_term, jurisdiction, section, snippet, created_at
                    FROM patent_index WHERE chem_id = ? LIMIT 1000"""  # global_patent_adapter 와 같은 질의


def export_sorted(con: duckdb.DuckDBPyConnection) -> int:
    raw = LOOKUP_PARQUET.with_name("unsorted.parquet")
    src = sqlite3.connect(f"file:{GLOBAL_INDEX_DB.as_posix()}?mode=ro", uri=True)
    cur = src.execute(f"SELECT {', '.join(COLS)} FROM patent_index WHERE id <= ?", [LOOKUP_ROW_LIMIT])
    n = 0
    with pq.ParquetWriter(raw, SCHEMA, compression="zstd") as w:
        while rows := cur.fetchmany(200_000):
            w.write_table(pa.Table.from_pylist([dict(zip(COLS, r)) for r in rows], SCHEMA))
            n += len(rows)
    src.close()
    case = " ".join(f"WHEN '{k}' THEN {v}" for k, v in SECTION_PRIORITY.items())
    con.execute(f"""COPY (SELECT *, CASE section {case} ELSE 5 END AS rank_section FROM read_parquet('{raw.as_posix()}')
                         ORDER BY chem_id, rank_section, id)
                    TO '{LOOKUP_PARQUET.as_posix()}' (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 100000)""")
    raw.unlink()
    return n


def pick_chem_ids(con) -> list[tuple[str, int]]:
    rows = con.execute(f"""SELECT chem_id, count(*) n FROM read_parquet('{LOOKUP_PARQUET.as_posix()}')
                           GROUP BY 1 ORDER BY n DESC""").fetchall()
    return [rows[0], rows[len(rows) // 10], rows[len(rows) // 2], rows[-1]]  # 많은 것·중간·적은 것


def page_sql(src: str) -> str:
    return f"""SELECT patent_id, title, section, snippet FROM {src}
               WHERE chem_id = ? ORDER BY rank_section, id LIMIT {LOOKUP_PAGE} OFFSET ?"""


def main() -> None:
    LOOKUP_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect()
    con.execute(f"SET temp_directory='{(BENCH_ROOT / 'duckdb_tmp').as_posix()}'")
    con.execute("SET extension_directory='E:/dev-cache/duckdb_ext'")
    with Timer() as tx:
        rows = LOOKUP_PARQUET.exists() and pq.ParquetFile(LOOKUP_PARQUET).metadata.num_rows or export_sorted(con)
    targets = pick_chem_ids(con)

    sq = sqlite3.connect(f"file:{GLOBAL_INDEX_DB.as_posix()}?mode=ro", uri=True)
    httpd, port = range_server.serve(LOOKUP_PARQUET.parent)
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute("SET enable_http_metadata_cache=false")
    local = page_sql(f"read_parquet('{LOOKUP_PARQUET.as_posix()}')")
    remote = page_sql(f"read_parquet('http://127.0.0.1:{port}/{LOOKUP_PARQUET.name}')")

    cases = []
    for chem_id, n in targets:
        with Timer() as ts:
            sq.execute(PRODUCTION_SQL, [chem_id]).fetchall()
        offsets = [0, max(0, n - LOOKUP_PAGE)]  # 첫 쪽과 마지막 쪽
        for off in offsets:
            with Timer() as tl:
                con.execute(local, [chem_id, off]).fetchall()
            range_server.reset()
            with Timer() as tr:
                got = con.execute(remote, [chem_id, off]).fetchall()
            http = range_server.reset()
            cases.append({"chem_id": chem_id, "rows_for_chem": n, "offset": off, "returned": len(got),
                          "sqlite_production_s": round(ts.s, 3), "parquet_local_s": round(tl.s, 3),
                          "parquet_http_s": round(tr.s, 3), "http_requests": http["requests"],
                          "http_mb": round(http["bytes"] / 1e6, 2)})
    httpd.shutdown()
    save("lookup", {
        "method": "물질별 정렬 Parquet 조회 vs 지금 SQLite",
        "rows": rows,
        "export_seconds": round(tx.s, 1),
        "parquet_bytes": size_bytes(LOOKUP_PARQUET),
        "row_group_size": 100_000,
        "cases": cases,
    })


if __name__ == "__main__":
    main()
