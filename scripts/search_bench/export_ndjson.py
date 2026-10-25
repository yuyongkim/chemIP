"""방식 F 준비: 표본 Parquet → Quickwit 수집용 NDJSON (Windows .venv 에서 실행, pyarrow 필요)."""
from __future__ import annotations

import json

import pyarrow.parquet as pq

from config import QUICKWIT_NDJSON, SAMPLE_PARQUET, TEXT_FIELDS
from results import Timer, save


def main() -> None:
    QUICKWIT_NDJSON.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with Timer() as t, QUICKWIT_NDJSON.open("w", encoding="utf-8", newline="\n") as out:
        for batch in pq.ParquetFile(SAMPLE_PARQUET).iter_batches(batch_size=5_000):
            for r in batch.to_pylist():
                out.write(json.dumps({k: r[k] or "" for k in ("doc_key", *TEXT_FIELDS)}, ensure_ascii=False) + "\n")
                n += 1
    save("quickwit_ndjson", {"docs": n, "ndjson_bytes": QUICKWIT_NDJSON.stat().st_size, "seconds": round(t.s, 1)})


if __name__ == "__main__":
    main()
