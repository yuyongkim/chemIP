"""표본 원본을 읽어 Parquet(zstd)로 저장한다. 읽기 시간 = 원본 해석 비용의 기준선."""
from __future__ import annotations

import pyarrow as pa
import pyarrow.parquet as pq

from config import PATENT_RAW_ROOT, SAMPLE_FILES, SAMPLE_PARQUET, TEXT_FIELDS
from records import iter_records
from results import Timer, save, size_bytes

BATCH = 5_000
SCHEMA = pa.schema([("doc_key", pa.string())] + [(f, pa.string()) for f in TEXT_FIELDS])


def main() -> None:
    SAMPLE_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    files = [PATENT_RAW_ROOT / f for f in SAMPLE_FILES]
    n = text_bytes = 0
    with Timer() as t, pq.ParquetWriter(SAMPLE_PARQUET, SCHEMA, compression="zstd") as writer:
        batch: list[dict] = []
        for path in files:
            for rec in iter_records(path):
                batch.append(rec)
                text_bytes += sum(len(rec[f].encode("utf-8")) for f in TEXT_FIELDS)
                if len(batch) == BATCH:
                    writer.write_table(pa.Table.from_pylist(batch, SCHEMA), row_group_size=BATCH)
                    n += len(batch)
                    batch = []
        if batch:
            writer.write_table(pa.Table.from_pylist(batch, SCHEMA))
            n += len(batch)
    save("sample", {
        "files": SAMPLE_FILES,
        "raw_gz_bytes": sum(size_bytes(p) for p in files),
        "records": n,
        "text_bytes": text_bytes,
        "parquet_bytes": size_bytes(SAMPLE_PARQUET),
        "parse_seconds": round(t.s, 1),
    })


if __name__ == "__main__":
    main()
