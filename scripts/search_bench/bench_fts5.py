"""방식 C — SQLite FTS5 전문 색인(본문은 저장하지 않는 contentless). 서버 한 대에 파일 하나로 두는 가장 단순한 형태."""
from __future__ import annotations

import sqlite3

import pyarrow.parquet as pq

from config import FTS5_DB, QUERY_TERMS, SAMPLE_PARQUET, TEXT_FIELDS
from results import Timer, save, size_bytes


def phrase(term: str) -> str:
    return '"' + term.replace('"', " ") + '"'


def build(con: sqlite3.Connection) -> int:
    cols = ", ".join(TEXT_FIELDS)
    con.executescript(f"""
        PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;
        CREATE TABLE doc_keys (id INTEGER PRIMARY KEY, doc_key TEXT);
        CREATE VIRTUAL TABLE docs USING fts5({cols}, content='', tokenize='unicode61 remove_diacritics 2');
    """)
    n = 0
    for batch in pq.ParquetFile(SAMPLE_PARQUET).iter_batches(batch_size=5_000):
        rows = batch.to_pylist()
        ids = range(n + 1, n + 1 + len(rows))
        con.executemany("INSERT INTO doc_keys VALUES (?, ?)", [(i, r["doc_key"]) for i, r in zip(ids, rows)])
        con.executemany(f"INSERT INTO docs(rowid, {cols}) VALUES (?{', ?' * len(TEXT_FIELDS)})",
                        [(i, *(r[f] for f in TEXT_FIELDS)) for i, r in zip(ids, rows)])
        n += len(rows)
    con.execute("INSERT INTO docs(docs) VALUES ('optimize')")
    con.commit()
    return n


def main() -> None:
    FTS5_DB.parent.mkdir(parents=True, exist_ok=True)
    FTS5_DB.unlink(missing_ok=True)
    con = sqlite3.connect(FTS5_DB)
    with Timer() as tb:
        docs = build(con)
    queries = []
    for term in QUERY_TERMS:
        with Timer() as t:
            n = con.execute("SELECT count(*) FROM docs WHERE docs MATCH ?", [phrase(term)]).fetchone()[0]
            top = con.execute("SELECT rowid FROM docs WHERE docs MATCH ? LIMIT 100", [phrase(term)]).fetchall()
        queries.append({"term": term, "docs": n, "first_page": len(top), "seconds": round(t.s, 3)})
    con.close()
    secs = [q["seconds"] for q in queries]
    save("fts5", {
        "method": "SQLite FTS5 전문 색인 (본문 미저장)",
        "docs": docs,
        "build_seconds": round(tb.s, 1),
        "index_bytes": size_bytes(FTS5_DB),
        "median_seconds": sorted(secs)[len(secs) // 2],
        "queries": queries,
    })


if __name__ == "__main__":
    main()
