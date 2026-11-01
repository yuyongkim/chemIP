"""Write frontend/public/chemip/safety_rules_data.jsx from safety_rules/*.json (the browser's copy of the rules).

    python -B G:\\MSDS\\scripts\\portal_build\\gen_frontend_rules.py [--check]

--check exits 1 when the generated file is out of date (used by tests/test_portal_safety.py).
"""
from __future__ import annotations

import argparse
import json
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import safety_rules  # noqa: E402

TARGET = os.path.join(r"G:\MSDS", "frontend", "public", "chemip", "safety_rules_data.jsx")
HEADER = """// 생성된 파일 — 고치지 않는다. 원본: scripts/portal_build/safety_rules/*.json, 만드는 스크립트: scripts/portal_build/gen_frontend_rules.py
// 안전 도구(저장 혼촉 매트릭스·혼합물 GHS 분류)의 규칙 자료 한 벌: ghs = GHS 유해성 분류 표(KOSHA 분류 이름·CLP 코드·구분별 H 문구·그림문자·신호어),
// compat = 혼촉 체계 3개(kr 위험물 유별 혼재 기준·un IMDG 격리표·ghs 반응성 묶음)와 짝 규칙, mixture = 혼합물 분류 상수(CLP 부속서 I).
// 파이썬(scripts/portal_build)도 같은 JSON 을 읽는다. 문구의 ko/en 쌍은 화면이 tr 로 고른다.
"""


def render() -> str:
    body = {name: safety_rules.load(name) for name in safety_rules.FILES}
    data = json.dumps(body, ensure_ascii=False, indent=1)
    return f"{HEADER}\nconst SAFETY_RULES = {data};\n\nObject.assign(window, {{ SAFETY_RULES }});\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    text = render()
    current = open(TARGET, encoding="utf-8").read() if os.path.exists(TARGET) else ""
    if args.check:
        sys.exit(0 if current == text else 1)
    if current != text:
        with open(TARGET, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        print(f"wrote {TARGET} ({len(text.encode('utf-8')):,} B)")
    else:
        print("up to date")


if __name__ == "__main__":
    main()
