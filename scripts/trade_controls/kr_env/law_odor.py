"""악취방지법: 지정악취물질(시행규칙 별표 1)."""
from __future__ import annotations

import re

from . import common, entries, lawgo, listfile, textutil

LAW = "악취방지법"
RULE = "악취방지법 시행규칙"


def build() -> dict:
    rule = lawgo.fetch_law(RULE)
    a = lawgo.annex(rule, 1)
    acc = entries.new_accumulator()
    since = None
    n = 0
    for row in textutil.table_rows(a["text"]):
        cells = [c.strip() for c in row]
        if len(cells) < 2:
            continue
        if cells[1]:
            since = cells[1] if "부터" in cells[1] else since
        m = re.match(r"^(\d+)\.\s*(.+)$", cells[0])
        if not m:
            continue
        n += 1
        entries.add_item(acc, m.group(1), m.group(2), f"지정악취물질 (시행규칙 별표 1), 적용시기 {since}")
    meta = common.law_meta(rule, a, "KR_ODOR_DESIGNATED", LAW, "지정악취물질",
                           "악취방지법 제2조제2호, 같은 법 시행규칙 제2조 및 별표 1", [
                               "악취관리지역 내 악취배출시설(시행규칙 별표 2) 설치 시 신고 및 악취방지계획 제출(법 제8조)",
                               "악취관리지역 외: 민원 1년 이상 지속 + 배출허용기준 3회 이상 초과 시 신고대상시설 지정·신고(법 제8조의2)",
                               "지정악취물질 배출허용기준 준수(법 제7조, 시행규칙 별표 3)",
                           ])
    return listfile.build(meta, acc, 22, 0)


def build_all() -> list[dict]:
    return [build()]
