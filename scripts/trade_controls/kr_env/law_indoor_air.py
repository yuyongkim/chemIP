"""실내공기질 관리법: 오염물질(시행규칙 별표 1)."""
from __future__ import annotations

import re

from . import common, entries, lawgo, listfile, textutil

IAQ = "실내공기질 관리법"
IAQ_RULE = "실내공기질 관리법 시행규칙"


def build_indoor_air() -> dict:
    rule = lawgo.fetch_law(IAQ_RULE)
    a = lawgo.annex(rule, 1)
    acc = entries.new_accumulator()
    items = textutil.numbered_items(a["text"])
    for it in items:
        m = re.match(r"^(.+?)\((.+)\)$", it["text"].strip())
        ko = m.group(1).strip() if m else it["text"].strip()
        extra = [p.strip() for p in m.group(2).split(";")] if m else []
        extra = [x for x in extra if not re.fullmatch(r"[A-Z0-9.\-]+", x)] + [x for x in extra if re.fullmatch(r"[A-Z0-9.\-]+", x)]
        entries.add_item(acc, it["no"], ko, "실내공기질 관리법 오염물질 (시행규칙 별표 1)", extra_names=extra or None)
    meta = common.law_meta(rule, a, "KR_INDOOR_AIR_POLLUTANTS", IAQ, "실내공기 오염물질",
                           "실내공기질 관리법 제2조제3호, 같은 법 시행규칙 제2조 및 별표 1", [
                               "다중이용시설 유지기준(별표 2)·권고기준(별표 3) 관리, 신축 공동주택 권고기준(별표 4의2)",
                               "건축자재 오염물질 방출기준(별표 5: 폼알데하이드·톨루엔·총휘발성유기화합물) — 건축자재 제조·수입자 확인",
                           ])
    return listfile.build(meta, acc, len(items), 0)


def build_all() -> list[dict]:
    return [build_indoor_air()]
