"""한국 수출입 의무 규칙(kr_rules.json) 생성 진입점. 재료를 모아 조립 모듈에 넘기고 결과를 쓴다.

실행(프로젝트 루트에서):
    python -m scripts.trade_controls.build_kr_rules            # 대조 후 backend/data/trade_controls/kr_rules.json 작성
    python -m scripts.trade_controls.build_kr_rules --cas 71-43-2   # 해당 물질에 걸리는 규칙만 출력(파일 쓰지 않음)
    python -m scripts.trade_controls.build_kr_rules --refresh  # law.go.kr 본문·별표를 다시 받는다
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

if __package__ in (None, ""):  # 파일 경로로 직접 실행한 경우에도 패키지 import 가 되게 한다
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    __package__ = "scripts.trade_controls"

from scripts.trade_controls import kr_rules_builder, law_text, rule_matcher  # noqa: E402
from scripts.trade_controls.customs_annex import parse_annex  # noqa: E402
from scripts.trade_controls.ncis_index import load_index  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).with_name("kr_rules_source.json")
DB = ROOT / "data" / "terminology.db"
OUT = ROOT / "backend" / "data" / "trade_controls" / "kr_rules.json"
CACHE = Path(tempfile.gettempdir()) / "chemip_trade_controls_cache"


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--source", type=Path, default=SOURCE)
    p.add_argument("--db", type=Path, default=DB)
    p.add_argument("--out", type=Path, default=OUT)
    p.add_argument("--cache-dir", type=Path, default=CACHE)
    p.add_argument("--refresh", action="store_true", help="캐시를 무시하고 다시 받는다")
    p.add_argument("--cas", help="이 CAS 에 걸리는 규칙만 출력하고 끝낸다")
    return p.parse_args()


def _load_annexes(source: dict, cache_dir: Path, refresh: bool) -> dict:
    tables = {}
    for key, spec in source.get("customs_annexes", {}).items():
        if isinstance(spec, dict) and "url" in spec:
            tables[key] = parse_annex(law_text.fetch_bytes(spec["url"], cache_dir, ".xlsx", refresh))
    return tables


def _print_summary(result: dict) -> None:
    print("NCIS 분류(물질 수/항목 수):")
    for name, c in result["ncis_categories"].items():
        print(f"  {name}: {c['substances']} / {c['entries']}")
    by_dir: dict[str, int] = {}
    for r in result["rules"]:
        by_dir[r["direction"]] = by_dir.get(r["direction"], 0) + 1
    print(f"규칙 {len(result['rules'])}건 {by_dir}, 미검증 {len(result['unverified'])}건")
    for r in result["rules"]:
        extra = f", 세관 HSK 목록 {r['matched_in_customs_hsk_list']}" if "matched_in_customs_hsk_list" in r else ""
        flag = "" if r["active"] else f"  [비활성: 분류 없음 {r.get('missing_categories')}]"
        print(f"  {r['rule_id']} ({r['direction']}): {r['matched_substances']}종{extra}{flag}")
    for u in result["unverified"]:
        print(f"  [미검증] {u['topic']}: {u['missing'][:120]}")


def _print_for_cas(result: dict, cas: str, db: Path) -> None:
    idx = load_index(db)
    customs_cas = set(result["customs_framework"]["import_cas_by_law"].get(kr_rules_builder.CUSTOMS_LAW, []))
    print(f"{cas} — 분류: {sorted(n for n, s in idx.by_category.items() if cas in s)}, 국제목록: {sorted(n for n, s in idx.by_list.items() if cas in s)}")
    print(f"  세관장확인 HSK 목록(화학물질관리법) 등재: {cas in customs_cas}")
    for r in result["rules"]:
        if cas in rule_matcher.match(r["when"], idx):
            print(f"  [{r['direction']}] {r['rule_id']}: {r['obligation']} | {r['legal_basis']} | 세관장확인={r['customs_confirmation']}")


def main() -> int:
    args = _parse_args()
    source = json.loads(args.source.read_text(encoding="utf-8"))
    idx = load_index(args.db)
    annexes = _load_annexes(source, args.cache_dir, args.refresh)
    result = kr_rules_builder.build(source, idx, annexes, args.cache_dir, args.refresh)
    if args.cas:
        _print_for_cas(result, args.cas.strip(), args.db)
        return 0
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    _print_summary(result)
    print(f"작성: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
