#!/usr/bin/env python
"""시드 물질(frontend/lib/chemip-seed.ts)의 데이터를 작은 번들로 추출한다 — Cloudflare 오프로드용.

목적: 134GB 원본/PC 가 꺼져도 자주 찾는 물질의 MSDS·규제·대표 특허는 뜨게, 번들만 클라우드에 올린다.
방식: 실행 중인 백엔드 API(127.0.0.1:7011) 응답을 그대로 모은다(로직 재구현 안 함). 특허는 상위 N건 + 총수만.
출력: data/offload/<cas>.json  (+ index.json), 전체 크기 출력.

    python scripts/build_offload.py            # 전부
    python scripts/build_offload.py --limit-patents 50
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = "http://127.0.0.1:7011"
SEED_TS = ROOT / "frontend" / "lib" / "chemip-seed.ts"
TERM_DB = ROOT / "data" / "terminology.db"
OUT_DIR = ROOT / "data" / "offload"


def load_seed() -> list[tuple[str, str]]:
    text = SEED_TS.read_text(encoding="utf-8")
    return re.findall(r'cas:\s*"([^"]+)",\s*ko:\s*"([^"]+)"', text)


def jget(path: str):
    try:
        with urllib.request.urlopen(API + path, timeout=60) as r:
            return json.load(r)
    except Exception as exc:  # noqa: BLE001
        return {"_error": str(exc)}


def external_id(cas: str) -> str:
    con = sqlite3.connect(TERM_DB)
    row = con.execute("SELECT external_id FROM chemical_terms WHERE cas_no=? LIMIT 1", (cas,)).fetchone()
    con.close()
    return (row[0] if row else "") or ""


def patents(ext: str, cas: str, limit: int) -> dict:
    key = ext or cas
    data = jget(f"/api/patents/global/{urllib.parse.quote(key)}")
    items = data.get("items") or data.get("results") or (data if isinstance(data, list) else [])
    total = data.get("total") if isinstance(data, dict) else len(items)
    return {"total": total, "top": items[:limit]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit-patents", type=int, default=50)
    a = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    seed = load_seed()
    index = []
    for cas, ko in seed:
        ext = external_id(cas)
        detail = jget(f"/api/chemicals/{urllib.parse.quote(ext or cas)}")
        bundle = {
            "cas": cas,
            "ko": ko,
            "external_id": ext,
            "detail": detail,  # 이름·MSDS 섹션·영문안전
            "international": jget(f"/api/regulations/international/{urllib.parse.quote(cas)}"),
            "trade_controls": jget(f"/api/regulations/trade-controls/{urllib.parse.quote(cas)}"),
            "patents": patents(ext, cas, a.limit_patents),
        }
        (OUT_DIR / f"{cas}.json").write_text(json.dumps(bundle, ensure_ascii=False), encoding="utf-8")
        index.append({"cas": cas, "ko": ko, "patents": bundle["patents"]["total"]})
    (OUT_DIR / "index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")

    total_bytes = sum(f.stat().st_size for f in OUT_DIR.glob("*.json"))
    print(f"번들 {len(seed)}개 → {OUT_DIR}")
    print(f"전체 크기 {total_bytes/1024/1024:.2f} MB (평균 {total_bytes/max(len(seed),1)/1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
