"""results/*.json 을 읽어 표본 측정값과 전체(USPTO 238 GB · 원본 640 GB) 추정을 report.md 로 쓴다."""
from __future__ import annotations

import math
import os

from config import RAW_TOTALS_GB, REPORT_MD
from quickwit_config import index_config
from results import load_all

GIB = 1024 ** 3
# 단가(부가세 별도): 네이버 Object Storage 28원/GB·월·GET 0.0004원(사장님 제공 요금표), 네이버 SSD 약 115원/GB·월(0.16원/GB·시간),
# Cloudflare R2 SQL 스캔 $2.50/TB (developers.cloudflare.com/r2-sql/platform/pricing)
WON_PER_GB_BUCKET, WON_PER_GB_SSD, WON_PER_GET, USD_PER_TB_SCAN = 28, 115, 0.0004, 2.50


def gb(n: float) -> str:
    return f"{n / GIB:,.1f} GB"


def scale_rows(sample: dict) -> list[tuple[str, float]]:
    return [(name, total * GIB / sample["raw_gz_bytes"]) for name, total in RAW_TOTALS_GB.items()]


def section_sample(s: dict) -> list[str]:
    return ["## 표본", "",
            f"- 파일: {', '.join(s['files'])} — gz {gb(s['raw_gz_bytes'])}, 특허 {s['records']:,}건",
            f"- 텍스트(제목·초록·청구항·본문): {gb(s['text_bytes'])}, Parquet(zstd): {gb(s['parquet_bytes'])}",
            f"- 원본 해석(압축 풀기 + JSON): {s['parse_seconds']:,} 초", ""]


def section_methods(r: dict) -> list[str]:
    s = r["sample"]
    workers = os.cpu_count() or 1
    out = ["## 방식별 결과", "",
           "| 방식 | 표본 크기 | 표본 처리 | 질의 1회(표본) | " + " | ".join(f"{n} 크기 / 처리" for n, _ in scale_rows(s)) + " |",
           "|---|---|---|---|" + "---|" * len(RAW_TOTALS_GB)]
    if "raw_scan" in r:
        a = r["raw_scan"]
        est = [f"원본 그대로 / {f * a['scan_seconds'] / 3600 / workers:,.1f} 시간({workers}프로세스 가정)" for _, f in scale_rows(s)]
        out.append(f"| A 원본 전체 스캔 (지금 방식) | gz {gb(s['raw_gz_bytes'])} | {a['scan_seconds']:,} 초, {a['terms']:,}개 검색어 동시 | 질의 단위 없음(일괄) | " + " | ".join(est) + " |")
    if "parquet_scan" in r:
        b = r["parquet_scan"]
        est = [f"{gb(b['parquet_bytes'] * f)} / 질의당 약 {b['median_seconds'] * f / 60:,.0f} 분" for _, f in scale_rows(s)]
        out.append(f"| B Parquet + SQL 스캔 | {gb(b['parquet_bytes'])} | 변환 {s['parse_seconds']:,} 초 | {b['median_seconds']} 초 | " + " | ".join(est) + " |")
    for key, label in (("fts5", "C SQLite FTS5"), ("tantivy", "D Tantivy")):
        if key in r:
            c = r[key]
            est = [f"{gb(c['index_bytes'] * f)} / 생성 {c['build_seconds'] * f / 3600:,.1f} 시간" for _, f in scale_rows(s)]
            out.append(f"| {label} 전문 색인 | {gb(c['index_bytes'])} | 생성 {c['build_seconds']:,} 초 | {c['median_seconds']} 초 | " + " | ".join(est) + " |")
    if "quickwit" in r:
        q = r["quickwit"]
        est = [f"버킷 {gb(q['index_bytes'] * f)} / 수집 {q['ingest_seconds'] * f / 3600:,.1f} 시간" for _, f in scale_rows(s)]
        out.append(f"| F Quickwit (색인을 버킷에) | 버킷 {gb(q['index_bytes'])} | 수집 {q['ingest_seconds']:,} 초 | "
                   f"cold {q['median_seconds']} 초 / warm {q['median_warm_seconds']} 초 | " + " | ".join(est) + " |")
    if "tantivy_all_terms" in r:
        x = r["tantivy_all_terms"]
        est = [f"재색인 약 {x['seconds'] * f / 3600:,.1f} 시간(선형 가정)" for _, f in scale_rows(s)]
        out.append(f"| D' 색인에 전체 검색어 질의 (재색인 대체) | — | {x['terms']:,}개 검색어 {x['seconds']} 초 | — | " + " | ".join(est) + " |")
    return out + [""]


def section_costs(r: dict) -> list[str]:
    s = r["sample"]
    out = ["## 월 비용 추정 (부가세 별도)", "", "| 방식 | 범위 | 보관 | 질의 비용 |", "|---|---|---|---|"]
    for name, f in scale_rows(s):
        if "parquet_scan" in r:
            size = r["parquet_scan"]["parquet_bytes"] * f
            out.append(f"| B 버킷 + 스캔 과금 SQL | {name} | 버킷 {size / GIB * WON_PER_GB_BUCKET:,.0f}원 | 질의 1회 약 ${size / 1e12 * USD_PER_TB_SCAN:,.2f} |")
        for key, label in (("fts5", "C FTS5"), ("tantivy", "D Tantivy")):
            if key in r:
                size = r[key]["index_bytes"] * f
                out.append(f"| {label} 서버 SSD | {name} | SSD {size / GIB * WON_PER_GB_SSD:,.0f}원 | 정액(서버 요금에 포함) |")
        if "quickwit" in r:
            q = r["quickwit"]
            gets = q["median_cold_gets"] * quickwit_splits(q, f)
            out.append(f"| F Quickwit 버킷 | {name} | 버킷 {q['index_bytes'] * f / GIB * WON_PER_GB_BUCKET:,.0f}원 | "
                       f"질의 1회(cold) GET 약 {gets:,.0f}회 = {gets * WON_PER_GET:.3f}원 (+ 검색 노드 요금) |")
    return out + [""]


def quickwit_splits(q: dict, factor: float) -> int:
    """전체 규모의 분할 수 추정: 문서 수 / 분할당 목표 문서 수. 질의당 GET 은 분할 수에 비례한다고 본다."""
    return max(1, math.ceil(q["docs"] * factor / index_config()["indexing_settings"]["split_num_docs_target"]))


def section_quickwit(r: dict) -> list[str]:
    if "quickwit" not in r:
        return []
    q = r["quickwit"]
    out = ["## Quickwit — 버킷에 둔 색인을 질의 때 조각만 읽기 (표본)", "",
           f"- 버전: {q['versions']['quickwit']} / 버킷 흉내: {q['versions']['bucket']} — {q['bucket_note']}",
           f"- 수집 {q['ingest_seconds']:,} 초, 버킷 객체 {q['bucket_objects']}개(분할 {q['splits']}개) 합계 {gb(q['index_bytes'])}",
           f"- 잰 방법: {q['measure_method']}", "",
           "| 질의어 | 건수 (Tantivy) | cold | cold GET · MB | warm | warm GET · MB | 띄워 둔 노드 첫 질의 | GET · MB |",
           "|---|---|---|---|---|---|---|---|"]
    ref = {h["term"]: h["tantivy"] for h in q["hits_vs_tantivy"]}
    run = {x["term"]: x for x in q["running_searcher"]}
    for x in q["queries"]:
        c, w, n = x["cold"], x["warm"], run[x["term"]]
        out.append(f"| {x['term']} | {c['docs']:,} ({ref.get(x['term'])}) | {c['seconds']} 초 | {c['object_gets']} · {c['get_mb']} | "
                   f"{w['seconds']} 초 | {w['object_gets']} · {w['get_mb']} | {n['seconds']} 초 | {n['object_gets']} · {n['get_mb']} |")
    same = all(h["same"] for h in q["hits_vs_tantivy"])
    out += ["", f"건수가 Tantivy 결과와 {'모두 같다' if same else '다른 질의어가 있다'}. "
            "전체 규모 GET 추정은 분할(split) 수에 비례한다고 가정했다(분할당 목표 문서 수는 quickwit_config.py).", ""]
    return out


def section_lookup(r: dict) -> list[str]:
    if "lookup" not in r:
        return []
    e = r["lookup"]
    out = ["## 서비스 조회 (물질 → 특허 100건 한 쪽)", "",
           f"- 옮긴 행: {e['rows']:,} (원 색인 앞쪽), 정렬 Parquet {gb(e['parquet_bytes'])}, 행 묶음 {e['row_group_size']:,}", "",
           "| 물질 | 해당 행 | 쪽 위치 | 지금 SQLite(1,000건 표본) | Parquet 로컬 | Parquet 버킷 흉내 | 요청 수 | 읽은 양 | 버킷 GET 비용 |",
           "|---|---|---|---|---|---|---|---|---|"]
    for c in e["cases"]:
        out.append(f"| {c['chem_id']} | {c['rows_for_chem']:,} | {c['offset']:,} | {c['sqlite_production_s']} 초 | {c['parquet_local_s']} 초 | "
                   f"{c['parquet_http_s']} 초 | {c['http_requests']} | {c['http_mb']} MB | {c['http_requests'] * WON_PER_GET:.4f}원 |")
    return out + [""]


def section_queries(r: dict) -> list[str]:
    keys = [k for k in ("parquet_scan", "fts5", "tantivy", "quickwit") if k in r]
    if not keys:
        return []
    out = ["## 질의어별 결과 건수 (표본)", "", "| 질의어 | " + " | ".join(keys) + " |", "|---|" + "---|" * len(keys)]
    for i, q in enumerate(r[keys[0]]["queries"]):
        out.append(f"| {q['term']} | " + " | ".join(f"{r[k]['queries'][i]['docs']:,}건 · {r[k]['queries'][i]['seconds']} 초" for k in keys) + " |")
    return out + ["", "B 는 부분 문자열(대소문자 무시), C·D·F 는 단어 구(phrase) 일치라 건수가 조금 다르다. F 는 cold 값.", ""]


def main() -> None:
    r = load_all()
    lines = ["# 특허 전문 검색 방식 비교", ""]
    if "sample" in r:
        lines += section_sample(r["sample"]) + section_methods(r) + section_costs(r)
    lines += section_quickwit(r) + section_lookup(r) + section_queries(r)
    REPORT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(REPORT_MD.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
