"""Build the GHS H-/P-code index served at /ghs.

Sources
  - English text, hazard class/category, pictogram, signal word, H->P links:
    PubChem GHS code table (UN GHS Rev.11, falls back to Rev.10 for missing rows)
    https://pubchem.ncbi.nlm.nih.gov/ghs/
  - Korean text: harvested from KOSHA MSDS section 2 (msds_details) — the most
    frequent phrasing per code, i.e. the wording of the MoEL GHS/MSDS notice.
  - Usage counts: msds_english (PubChem) + msds_details (KOSHA) in terminology.db.

Output: frontend/public/data/ghs_codes.json
"""
import collections
import json
import re
import sqlite3
import sys
from datetime import date
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "terminology.db"
OUT = ROOT / "frontend" / "public" / "data" / "ghs_codes.json"
PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/ghs/ghscode_{rev}.txt"

CODE_RE = re.compile(r"[HP]\d{3}(?:\+[HP]\d{3})*")
KO_ITEM_RE = re.compile(r"([HP]\d{3}(?:\s*\+\s*[HP]\d{3})*)\s*[:：]\s*([^|<]+)")

# Codes introduced in UN GHS Rev.8-10 (or combinations) that the Korean MoEL notice
# does not yet carry. ChemIP translations in the notice's style — NOT official text.
KO_SUPPLEMENT = {
    "H221": "인화성 가스",
    "H230": "공기가 없어도 폭발적으로 반응할 수 있음",
    "H231": "상승된 압력 및/또는 온도에서는 공기가 없어도 폭발적으로 반응할 수 있음",
    "H281": "냉동 가스 포함; 극저온의 화상 또는 손상을 일으킬 수 있음",
    "H300+H310": "삼키거나 피부에 접촉하면 치명적임",
    "H300+H310+H330": "삼키거나 피부에 접촉하거나 흡입하면 치명적임",
    "H300+H330": "삼키거나 흡입하면 치명적임",
    "H301+H311": "삼키거나 피부에 접촉하면 유독함",
    "H301+H311+H331": "삼키거나 피부에 접촉하거나 흡입하면 유독함",
    "H301+H331": "삼키거나 흡입하면 유독함",
    "H302+H312": "삼키거나 피부에 접촉하면 유해함",
    "H302+H312+H332": "삼키거나 피부에 접촉하거나 흡입하면 유해함",
    "H302+H332": "삼키거나 흡입하면 유해함",
    "H303": "삼키면 유해할 수 있음",
    "H303+H333": "삼키거나 흡입하면 유해할 수 있음",
    "H310+H330": "피부에 접촉하거나 흡입하면 치명적임",
    "H311+H331": "피부에 접촉하거나 흡입하면 유독함",
    "H312+H332": "피부에 접촉하거나 흡입하면 유해함",
    "H313": "피부와 접촉하면 유해할 수 있음",
    "H315+H320": "피부 및 눈에 자극을 일으킴",
    "H316": "경미한 피부 자극을 일으킴",
    "H333": "흡입하면 유해할 수 있음",
    "H401": "수생생물에 유독함",
    "H402": "수생생물에 유해함",
    "P203": "사용 전 모든 안전 지침을 확보하여 읽고 따르시오.",
    "P231": "내용물을 불활성 가스/…하에서 취급 및 저장하시오.",
    "P236": "원래의 포장으로만 보관하시오; 운송 형태의 등급 …",
    "P264+P265": "취급 후에는 손[및 …]을 철저히 씻으시오. 눈을 만지지 마시오.",
    "P282": "방한장갑 및 안면보호구 또는 보안경을 착용하시오.",
    "P301+P316": "삼켰다면: 즉시 응급 의료 도움을 받으시오.",
    "P301+P317": "삼켰다면: 의료 도움을 받으시오.",
    "P302+P317": "피부에 묻으면: 의료 도움을 받으시오.",
    "P302+P361+P354": "피부에 묻으면: 오염된 모든 의복을 즉시 벗으시오. 즉시 몇 분간 물로 씻어내시오.",
    "P304+P317": "흡입하면: 의료 도움을 받으시오.",
    "P305+P354+P338": "눈에 묻으면: 즉시 몇 분간 물로 씻어내시오. 가능하면 콘택트렌즈를 제거하시오. 계속 씻으시오.",
    "P308+P316": "노출되거나 노출이 우려되면: 즉시 응급 의료 도움을 받으시오.",
    "P316": "즉시 응급 의료 도움을 받으시오.",
    "P317": "의료 도움을 받으시오.",
    "P318": "노출되거나 노출이 우려되면 의학적인 조언을 구하시오.",
    "P319": "불편함을 느끼면 의료 도움을 받으시오.",
    "P332+P317": "피부 자극이 생기면: 의료 도움을 받으시오.",
    "P333+P317": "피부 자극 또는 홍반이 나타나면: 의료 도움을 받으시오.",
    "P336+P317": "동상 부위를 미지근한 물로 즉시 녹이시오. 문지르지 마시오. 의료 도움을 받으시오.",
    "P337": "눈에 자극이 지속되면:",
    "P337+P317": "눈에 자극이 지속되면: 의료 도움을 받으시오.",
    "P342+P316": "호흡기 증상이 나타나면: 즉시 응급 의료 도움을 받으시오.",
    "P370+P380": "화재 시: 주변 지역을 대피시키시오.",
    "P372": "폭발 위험.",
    "P373": "불길이 폭발성 물질에 닿으면 소화를 시도하지 마시오.",
    "P378": "불을 끄기 위해 …을(를) 사용하시오.",
    "P380": "주변 지역을 대피시키시오.",
    "P503": "폐기/회수/재활용 정보는 제조자/공급자…에 문의하시오.",
}

P_GROUPS = {"1": "General", "2": "Prevention", "3": "Response", "4": "Storage", "5": "Disposal"}
H_GROUPS = {"2": "Physical", "3": "Health", "4": "Environmental"}


def fetch_table(rev: int) -> dict:
    text = requests.get(PUBCHEM.format(rev=rev), timeout=30).text
    rows = {}
    for line in text.splitlines()[1:]:
        cols = [c.strip() for c in line.split("\t")]
        if not cols or not CODE_RE.fullmatch(cols[0]):
            continue
        cols += [""] * (8 - len(cols))
        rows[cols[0]] = cols
    return rows


def group_of(code: str) -> str:
    first = code.split("+")[0]
    return (P_GROUPS if first[0] == "P" else H_GROUPS).get(first[1], "")


def main() -> None:
    rev11, rev10 = fetch_table(11), fetch_table(10)
    table = {**{k: (v, 10) for k, v in rev10.items()}, **{k: (v, 11) for k, v in rev11.items()}}

    con = sqlite3.connect(DB)

    # Usage counts from PubChem-derived statements (one count per chemical).
    usage_pubchem = collections.Counter()
    for h, p in con.execute("SELECT hazard_statements, precautionary_statements FROM msds_english"):
        codes = set()
        for blob in (h, p):
            for s in json.loads(blob or "[]"):
                codes.update(CODE_RE.findall(s))
        usage_pubchem.update(codes)

    # Korean phrasing + counts from KOSHA section 2 XML.
    ko_text = collections.defaultdict(collections.Counter)
    usage_kosha = collections.Counter()
    for (xml,) in con.execute("SELECT xml_data FROM msds_details WHERE section_no = 2"):
        codes = set()
        for code, txt in KO_ITEM_RE.findall(xml or ""):
            code = re.sub(r"\s+", "", code)
            txt = txt.strip()
            if txt:
                ko_text[code][txt] += 1
                codes.add(code)
        usage_kosha.update(codes)
    con.close()

    # Reverse link: which H statements call for each P statement.
    p_to_h = collections.defaultdict(list)
    for code, (cols, _) in table.items():
        if code.startswith("H"):
            for p in filter(None, (x.strip() for x in cols[7].split(","))):
                p_to_h[p].append(code)

    all_codes = set(table) | set(ko_text) | {c for c in usage_pubchem if c in table}
    entries = []
    for code in sorted(all_codes, key=lambda c: (c[0], [int(x[1:]) for x in c.split("+")])):
        cols, rev = table.get(code, ([code] + [""] * 7, None))
        if ko_text.get(code):
            ko, ko_src = ko_text[code].most_common(1)[0][0], "kosha"
        elif code in KO_SUPPLEMENT:
            ko, ko_src = KO_SUPPLEMENT[code], "chemip"
        else:
            ko, ko_src = "", ""
        e = {
            "code": code,
            "type": code[0],
            "group": group_of(code),
            "en": cols[1],
            "ko": ko,
            "ko_src": ko_src,
            "deleted": cols[1].startswith("(Deleted)"),
            "rev": rev,
            "usage": {"pubchem": usage_pubchem.get(code, 0), "kosha": usage_kosha.get(code, 0)},
        }
        if code.startswith("H"):
            e.update({
                "hazard_class": cols[2], "category": cols[3], "un_class": cols[4],
                "pictogram": cols[5], "signal": cols[6],
                "p_codes": [x.strip() for x in cols[7].split(",") if x.strip()],
            })
        else:
            e["h_codes"] = sorted(set(p_to_h.get(code, [])))
        entries.append(e)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "generated": date.today().isoformat(),
        "sources": {
            "en": "PubChem GHS Classification table (UN GHS Rev.11; Rev.10 fallback) — https://pubchem.ncbi.nlm.nih.gov/ghs/",
            "ko": "KOSHA MSDS 2항 유해·위험문구/예방조치문구 (고용노동부 고시 문안, 최빈 표현)",
            "ko_chemip": "UN GHS Rev.8~10 신설 코드는 국내 고시 문안이 없어 ChemIP 번역 (비공식)",
            "usage": "ChemIP terminology.db — msds_english (PubChem) / msds_details (KOSHA)",
        },
        "codes": entries,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    n_ko = sum(1 for e in entries if e["ko"])
    n_missing = [e["code"] for e in entries if not e["en"]]
    print(f"{len(entries)} codes -> {OUT} (ko {n_ko}, no-en {len(n_missing)})")
    if n_missing:
        print("no English text:", ", ".join(n_missing[:40]), file=sys.stderr)


if __name__ == "__main__":
    main()
