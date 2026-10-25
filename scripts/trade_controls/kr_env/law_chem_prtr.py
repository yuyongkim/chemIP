"""화학물질관리법 제11조·제11조의2: 배출량조사(PRTR) 대상 화학물질 / 배출저감계획서 제출 대상 물질.

Sources (law.go.kr 행정규칙):
  화학물질의 배출량조사 및 산정계수에 관한 규정 별표 2 (I그룹·II그룹 + (주N) 물질군 주요 물질 표)
  화학물질 배출저감계획서의 작성 등에 관한 규정 별표 1 (1·2·3단계)
"""
from __future__ import annotations

import re

from . import cas as casmod
from . import config, entries, lawgo, listfile, textutil

LAW = "화학물질관리법"
PRTR_RULE = "화학물질의 배출량조사 및 산정계수에 관한 규정"
PLAN_RULE = "화학물질 배출저감계획서의 작성 등에 관한 규정"
_SEG = re.compile(r"(?m)^\s*(\[Ⅰ그룹[^\]]*\]|\[Ⅱ그룹[^\]]*\]|\(주\d+\)[^\n]*)")


def _segments(text: str) -> list[tuple[str, str]]:
    parts = _SEG.split(text)
    out = [("_head", parts[0])]
    for i in range(1, len(parts), 2):
        out.append((parts[i].strip(), parts[i + 1]))
    return out


def _meta(doc, list_id, title, basis, obligations, annex_no):
    a = lawgo.annex(doc, annex_no)
    return {
        "list_id": list_id, "law": LAW, "title": title, "legal_basis": basis,
        "source_url": config.admrul_page_url(doc.name),
        "amended_on": doc.promulgated, "law_effective": doc.effective, "law_mst": doc.mst,
        "raw_file": str(doc.raw_path), "obligations": obligations,
        "_version_note": f"{doc.name} (고시 제{getattr(doc, 'number', '?')}호, 발령 {doc.promulgated}, 시행 {doc.effective})",
    }, a


def build_prtr() -> dict:
    doc = lawgo.fetch_admrul(PRTR_RULE)
    meta, a = _meta(doc, "KR_CHEM_PRTR", "화학물질 배출량조사 대상 화학물질",
                    "화학물질관리법 제11조, 같은 법 시행령 제6조, 시행규칙 제5조; 화학물질의 배출량조사 및 산정계수에 관한 규정 제5조제1항 및 별표 2",
                    ["조사대상 업종(고시 별표 1) + 대기·물환경 배출시설 설치허가/신고 사업장이 Ⅰ그룹 연 1톤 이상 또는 Ⅱ그룹 연 10톤 이상 제조·사용 시 화학물질 배출량·이동량 조사표 제출(고시 제3조·제12조, 매년 4월 30일)",
                     "배출량 산정(직접측정·물질수지·배출계수·공학적 계산, 고시 제10조)",
                     "배출저감계획서 제출 대상 판단의 기준 목록(화학물질관리법 제11조의2)"], 2)
    acc = entries.new_accumulator()
    group = None
    family_notes: dict[str, dict] = {}
    groups = {"Ⅰ": 0, "Ⅱ": 0}
    for head, body in _segments(a["text"]):
        if head.startswith("[Ⅰ"):
            group = "Ⅰ"
        elif head.startswith("[Ⅱ"):
            group = "Ⅱ"
        if head.startswith("(주"):
            note = re.match(r"\(주(\d+)\)", head).group(1)
            fam = family_notes.get(note, {"note": note})
            fam["note_text"] = head
            for rec in textutil.table_records(body):
                cas_cell = next((c for c in rec if casmod.CAS_IN_TEXT.search(c or "")), None)
                if not cas_cell or len(rec) < 3:
                    continue
                m = casmod.CAS_IN_TEXT.search(cas_cell)
                c = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
                entries.add_law_cas(acc, f"주{note}", c, None, rec[-1],
                                    f"배출량조사 대상 물질군 '{fam.get('name', '')}'(주{note})의 주요 화학물질 (고시 별표 2)",
                                    count=False, role="group_member")
                fam["members_listed"] = fam.get("members_listed", 0) + 1
            family_notes[note] = fam
            continue
        for rec in textutil.table_records(body):
            if len(rec) < 5 or not rec[0].isdigit():
                continue
            no, cas_cell, ko, en, rng = rec[0], rec[1], rec[2], rec[3], rec[4]
            groups[group] += 1
            threshold = "연 1톤" if group == "Ⅰ" else "연 10톤"
            detail = f"{group}그룹(취급량 {threshold} 이상), 조사대상범위 무게함유율 {rng}"
            nm = re.match(r"NA-\(주(\d+)\)", cas_cell.replace(" ", ""))
            if nm:
                note = nm.group(1)
                family_notes.setdefault(note, {"note": note})
                family_notes[note].update({"name": ko, "name_en": en, "group": group, "item_no": f"{group}-{no}",
                                           "detail": detail})
                acc["items"] += 1
                continue
            if not casmod.CAS_IN_TEXT.search(cas_cell):
                # the law prints 'NA' (no CAS) for a few individual substances
                entries.add_item(acc, f"{group}-{no}", ko, detail + "; 고시 CAS 칸 'NA'",
                                 extra_names=[re.sub(r"\s+", " ", en)])
                continue
            entries.add_law_cas(acc, f"{group}-{no}", cas_cell, ko, re.sub(r"\s+", " ", en), detail)
    for note, fam in sorted(family_notes.items(), key=lambda kv: int(kv[0])):
        base = re.match(r"^(.+?)\s*및\s*그\s*화합물$", fam.get("name") or "")
        acc["family_entries"].append({
            "name": fam.get("name"), "name_en": fam.get("name_en"), "item_no": fam.get("item_no"),
            "element": entries._families()["elements"].get(base.group(1).strip()) if base else None,
            "detail": f"{fam.get('detail', '')}; (주{note}) {fam.get('note_text', '')}",
            "listed_member_cas": fam.get("members_listed", 0)})
    # member entries carry the family name now that every note is known
    for e in acc["entries"]:
        if e.get("role") == "group_member":
            note = e["item_no"][1:]
            e["detail"] = e["detail"].replace("''", f"'{family_notes[note].get('name', '')}'")
            e["group"] = family_notes[note].get("group")
    meta["groups"] = {"Ⅰ그룹(1톤/년)": groups["Ⅰ"], "Ⅱ그룹(10톤/년)": groups["Ⅱ"]}
    total = groups["Ⅰ"] + groups["Ⅱ"]
    notes = [f"번호 매긴 대상 항목 {total}개(Ⅰ그룹 {groups['Ⅰ']} + Ⅱ그룹 {groups['Ⅱ']}). 그 중 'NA-(주N)' 물질군 {len(family_notes)}개는 family_entries, "
             "물질군의 (주N) 표에 CAS와 함께 열거된 주요 물질은 role=group_member 엔트리로 수록(표에 없는 같은 군 화합물도 대상이라는 원문 단서 있음)."]
    return listfile.build(meta, acc, total, 0, notes)


def build_reduction_plan() -> dict:
    doc = lawgo.fetch_admrul(PLAN_RULE)
    meta, a = _meta(doc, "KR_CHEM_EMISSION_REDUCTION_PLAN", "화학물질 배출저감계획서 제출 대상 물질",
                    "화학물질관리법 제11조의2, 같은 법 시행규칙 제5조의2제1항제1호; 화학물질 배출저감계획서의 작성 등에 관한 규정 제3조 및 별표 1",
                    ["별표 1 물질 중 어느 하나를 연간 1톤 이상 배출 + 종업원 30명 이상 사업장 → 5년마다 배출저감계획서 작성·제출(시행규칙 제5조의2제1항, 화학물질안전원장)",
                     "최초 제출기한: 1톤 이상 배출한 해의 1월 1일 기준 2년이 되는 해의 5월 31일(시행규칙 제5조의2제3항)"], 1)
    acc = entries.new_accumulator()
    text = a["text"]
    stage_split = re.split(r"(?m)^\s*(\d)\.\s*(\d단계 적용 대상 물질[^\n]*)", text)
    stage_counts = {}
    for i in range(1, len(stage_split), 3):
        stage, title, body = stage_split[i], stage_split[i + 1].strip(), stage_split[i + 2]
        n = 0
        for rec in textutil.table_records(body):
            if len(rec) >= 4 and rec[0].isdigit():
                n += 1
                entries.add_law_cas(acc, rec[0], rec[1], rec[2], rec[3], f"{stage}단계 적용 대상 물질 (고시 별표 1)")
        if n == 0:
            entries.add_family(acc, f"{stage}단계", title,
                               " ".join(ln.strip() for ln in body.splitlines() if ln.strip())[:300])
        stage_counts[f"{stage}단계"] = n
    meta["groups"] = stage_counts
    official = stage_counts.get("1단계", 0) + stage_counts.get("2단계", 0) + 1
    notes = ["표 제목 기준 1단계 9종, 2단계 44종. 3단계는 '시행령 제6조에 따라 정해진 배출량조사 대상 화학물질 중 제1호 및 제2호에 해당되지 않는 물질'(KR_CHEM_PRTR 목록 참조)로 family_entries 1건.",
             "단계별 적용 시기는 고시 부칙에 따름(이 파일에 미수록)."]
    if stage_counts.get("1단계") != 9 or stage_counts.get("2단계") != 44:
        notes.append(f"주의: 단계별 파싱 수 {stage_counts} 가 표 제목(9종/44종)과 다름")
    return listfile.build(meta, acc, official, 0, notes)


def build_all() -> list[dict]:
    return [build_prtr(), build_reduction_plan()]
