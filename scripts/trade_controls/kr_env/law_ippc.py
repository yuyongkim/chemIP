"""환경오염시설의 통합관리에 관한 법률: 배출부과금 부과대상 오염물질등(시행령 별표 9).

통합허가 자체는 업종·규모 기반이라 kr_permits_env.json 에서 다룸."""
from __future__ import annotations

import re

from . import common, entries, lawgo, listfile, textutil

IPPC = "환경오염시설의 통합관리에 관한 법률"
IPPC_DECREE = "환경오염시설의 통합관리에 관한 법률 시행령"


def build_ippc_charges() -> dict:
    decree = lawgo.fetch_law(IPPC_DECREE)
    a = lawgo.annex(decree, 9)
    acc = entries.new_accumulator()
    charge = medium = None
    for ln in textutil.lines(a["text"]):
        s = ln.strip()
        if re.match(r"^1\.\s*기본배출부과금", s):
            charge = "기본배출부과금"
        elif re.match(r"^2\.\s*초과배출부과금", s):
            charge = "초과배출부과금"
        elif re.match(r"^가\.\s*대기오염물질", s):
            medium = "대기오염물질"
        elif re.match(r"^나\.\s*수질오염물질", s):
            medium = "수질오염물질"
        m = re.match(r"^(\d+)\)\s*(.+)$", s)
        if m and charge and medium:
            name = re.sub(r"\(polychlorinated biphenyl\)", "", m.group(2)).strip()
            entries.add_item(acc, f"{charge[:2]}-{medium[:2]}-{m.group(1)}", name,
                             f"{charge} 부과대상 {medium} (통합환경법 시행령 별표 9)")
    meta = common.law_meta(decree, a, "KR_IPPC_CHARGE_POLLUTANTS", IPPC, "배출부과금의 부과대상 오염물질등",
                           "환경오염시설의 통합관리에 관한 법률 제15조, 같은 법 시행령 제11조 및 별표 9", [
                               "통합관리사업장: 허가배출기준 초과 시 초과배출부과금, 기준 이내 배출량에 기본배출부과금(법 제15조)",
                           ])
    notes = ["통합허가 대상 여부는 물질이 아니라 업종(시행령 별표 1)과 규모(먼지·질소산화물·황산화물 연 20톤 이상 발생 또는 폐수 일 700㎥ 이상 배출, 법 제6조제1항·시행규칙 제4조)로 정해짐 → kr_permits_env.json 참조."]
    return listfile.build(meta, acc, 33, 0, notes)


def build_all() -> list[dict]:
    return [build_ippc_charges()]
