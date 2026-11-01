"""Static law area (scripts/portal_build/law_export*.py, law_cite.py, law_mentions.py): legal-basis parsing and resolution,
literal-mention word boundaries, the article lead reconstruction, the FNV-1a shard hash (same as the client) and the
assembled files. Synthetic corpus only — no portal_facts.db, no network."""
from __future__ import annotations

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, "scripts", "portal_build")
if p not in sys.path:
    sys.path.append(p)

import law_cite as LC  # noqa: E402
import law_export  # noqa: E402
import law_export_build as B  # noqa: E402
import law_export_config as C  # noqa: E402
import law_export_shape as S  # noqa: E402
import law_mentions as M  # noqa: E402

NAMES = ["대기환경보전법", "대기환경보전법 시행규칙", "실내공기질 관리법 시행규칙", "폐기물관리법 시행령", "폐기물관리법 시행규칙",
         "산업안전보건법", "토양환경보전법", "토양환경보전법 시행규칙", "화학물질관리법", "화학물질관리법 시행령"]


def refs(parsed):
    return [(d["doc"], [r["label"] for r in d["refs"]]) for d in parsed["docs"]]


# ---------- parse_basis ----------

def test_same_law_and_bare_suffix():
    got = LC.parse_basis("대기환경보전법 제2조제9호, 같은 법 시행규칙 제4조 및 별표 2 (설치허가 적용기준: 시행규칙 제24조의2 및 별표 8의2)", NAMES)
    assert refs(got) == [("대기환경보전법", ["제2조제9호"]), ("대기환경보전법 시행규칙", ["제4조", "별표 2", "제24조의2", "별표 8의2"])]
    assert got["unknown"] == []


def test_unknown_law_is_not_guessed_and_same_law_means_it():
    got = LC.parse_basis("실내공기질 관리법 제2조제3호, 같은 법 시행규칙 제2조 및 별표 1", NAMES)
    assert refs(got) == [("실내공기질 관리법 시행규칙", ["제2조", "별표 1"])]
    assert "실내공기질 관리법" in got["unknown"] and "제2조제3호" in got["unknown"]


def test_unknown_notice_after_known_law_resets():
    got = LC.parse_basis("산업안전보건법 제106조, 고용노동부 고시 제2020-48호 「화학물질 및 물리적 인자의 노출기준」 별표 1", NAMES)
    assert refs(got) == [("산업안전보건법", ["제106조"])]
    got = LC.parse_basis("산업안전보건법 제5조, 먹는물관리법 제7조", NAMES)
    assert refs(got) == [("산업안전보건법", ["제5조"])]


def test_note_in_brackets_does_not_reset_and_item_suffix_is_kept():
    got = LC.parse_basis("토양환경보전법 제2조제2호, 같은 법 시행규칙 제1조의2 및 별표 1 (우려기준 별표 3, 대책기준 별표 7)", NAMES)
    assert refs(got)[1] == ("토양환경보전법 시행규칙", ["제1조의2", "별표 1", "별표 3", "별표 7"])
    got = LC.parse_basis("폐기물관리법 시행령 별표 1 제4호가목, 같은 법 시행규칙 제2조제2항 및 별표 2", NAMES)
    assert refs(got) == [("폐기물관리법 시행령", ["별표 1"]), ("폐기물관리법 시행규칙", ["제2조제2항", "별표 2"])]


def test_article_numbers():
    got = LC.parse_basis("화학물질관리법 제2조제6호, 제2조제6호의2, 제39조; 같은 법 시행령 제17조", NAMES)
    d = got["docs"][0]["refs"]
    assert [(r["no"], r["label"]) for r in d] == [("2", "제2조제6호"), ("2", "제2조제6호의2"), ("39", "제39조")]
    assert LC.sub_parts("제2조제1항제3호의2가목") == {"para": "①", "item": "3의2", "sub": "가."}


# ---------- resolve ----------

def lookup():
    arts = {
        "2": {"text": "제2조(정의) …\n6. \"사고대비물질\"이란 …", "title": "정의",
              "paras": [{"no": "", "text": "", "items": [{"no": "6", "text": "6. \"사고대비물질\"이란 …", "subitems": []}]}]},
        "39": {"text": "제39조(사고대비물질의 지정) …", "title": "사고대비물질의 지정", "paras": None},
        "40": {"text": "제40조(관리기준) …", "title": "관리기준", "paras": None},
    }
    return {"화학물질관리법": {"id": "law_000162", "kind": "law", "articles": arts,
                           "annexes": [{"annex_no": "1", "annex_kind": "별표", "title": "표 1", "pdf_url": "https://p", "file_url": ""},
                                       {"annex_no": "1", "annex_kind": "서식", "title": "신청서", "pdf_url": "", "file_url": ""}]}}


def test_resolve_item_snippet_annex_and_missing():
    parsed = LC.parse_basis("화학물질관리법 제2조제6호, 제39조, 제99조, 별표 1, 별표 2", ["화학물질관리법"])
    cites, unresolved = LC.resolve(parsed, lookup())
    assert [(c["t"], c["label"]) for c in cites] == [("art", "제2조제6호"), ("art", "제39조"), ("annex", "별표 1")]
    assert cites[0]["snippet"].startswith("6. \"사고대비물질\"")
    assert cites[2]["pdf"] == "https://p" and cites[2]["title"] == "표 1"
    assert "화학물질관리법 제99조" in unresolved and "화학물질관리법 별표 2" in unresolved


def test_resolve_term_check_drops_unrelated_article():
    parsed = LC.parse_basis("화학물질관리법 제39조, 제40조", ["화학물질관리법"])
    cites, unresolved = LC.resolve(parsed, lookup(), term="사고대비물질")
    assert [c["no"] for c in cites] == ["39"] and unresolved == ["화학물질관리법 제40조"]


def test_curated_basis_file_parses():
    with open(C.BASIS_FILE, encoding="utf-8") as fh:
        data = json.load(fh)["lists"]
    assert {"NCIS_ACCIDENT_PREP", "NCIS_HAZARDOUS", "IR_KR_OSHA_PSM"} <= set(data)
    for v in data.values():
        assert v["basis"] and "term" in v


# ---------- mentions ----------

def test_word_boundaries():
    tm = M.terms({"7664-93-9": {"황산"}, "7446-09-5": {"아황산가스(이산화황)"}})
    lens = sorted({len(t) for t in tm}, reverse=True)
    hits = lambda s: [t for _a, _b, t in M.scan(s, tm, lens)]  # noqa: E731
    assert hits("1. 황산, 질산") == ["황산"]
    assert hits("황산을 취급") == ["황산"]          # particle
    assert hits("황산으로 세척") == ["황산"]        # two-letter particle
    assert hits("황산화물 배출") == []              # longer word
    assert hits("아황산 처리") == []                 # inside another word
    assert hits("아황산가스 배출") == ["아황산가스"]  # variant without the note


def test_mentions_rows_cas_literal_and_cap():
    arts = [{"doc": "d1", "no": "1", "text": "황산 및 7664-93-9"}, {"doc": "d1", "no": "2", "text": "황산"},
            {"doc": "d2", "no": "본문", "text": "CAS 50-00-0 폼알데하이드"}]
    tm = M.terms({"7664-93-9": {"황산"}, "50-00-0": {"포름알데히드"}})
    got = M.mentions(arts, tm, {"7664-93-9", "50-00-0"}, keep=1)
    assert got["7664-93-9"]["total"] == 2 and len(got["7664-93-9"]["rows"]) == 1   # one row per article, capped
    assert got["50-00-0"]["rows"][0][:3] == ["d2", "본문", "50-00-0"]


def test_stop_words_and_short_names_are_not_terms():
    assert M.variants("가스") == set() and M.variants("물") == set()
    assert M.variants("니켈 및 그 화합물") == {"니켈 및 그 화합물", "니켈"}


# ---------- shapes ----------

def test_article_head_rebuilds_lead():
    paras = S._paras([{"no": "①", "text": "① 첫째 항", "items": [{"no": "1", "text": "1. 호\n둘째 줄", "subitems": []}]}])
    text = "제3조(적용 범위)\n① 첫째 항\n1. 호\n둘째 줄"
    assert S.article_head(text, paras) == "제3조(적용 범위)"
    item = S.article_item({"kind": "article", "article_no": "3", "title": "적용 범위", "text": text,
                           "paras_json": json.dumps([{"no": "①", "text": "① 첫째 항", "items": []}]), "effective_on": ""})
    assert item["t"] == "a" and "paras" in item and "text" not in item


def test_art_url_and_doc_id():
    assert S.doc_id("law", "000162") == "law_000162"
    assert S.art_url("law", "화학물질관리법 시행령") == "https://www.law.go.kr/법령/화학물질관리법시행령/{art}"
    assert S.art_url("admrul", "x") == ""


def test_fnv1a32_matches_reference_and_client():
    assert B.fnv1a32("") == 0x811C9DC5 and B.fnv1a32("a") == 0xE40C292C   # published FNV-1a 32 test values
    assert B.cas_bucket("7664-93-9") == 59 and B.cas_bucket("50-00-0") == 34  # same as test_law_viewer.cjs


def corpus():
    doc = {"doc_key": "law:1", "kind": "law", "law_id": "000162", "serial": "1", "name": "화학물질관리법", "law_type": "법률",
           "promulgated_on": "2026-04-07", "promulgation_no": "1", "effective_on": "2026-10-08", "amend_type": "일부개정",
           "ministry": "기후에너지환경부", "url": "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=1",
           "url_current": "https://www.law.go.kr/법령/화학물질관리법", "articles": 2, "annexes": 0, "fetched_at": "2026-10-31T12:00:00+09:00"}
    arts = [{"seq": 1, "article_no": "1", "kind": "heading", "title": "", "text": "제1장 총칙", "paras_json": None, "effective_on": ""},
            {"seq": 2, "article_no": "2", "kind": "article", "title": "정의", "text": "제2조(정의) 뜻\n6. \"사고대비물질\"이란 황산 등",
             "paras_json": json.dumps([{"no": "", "text": "", "items": [{"no": "6", "text": "6. \"사고대비물질\"이란 황산 등", "subitems": []}]}]),
             "effective_on": ""}]
    hist = [{"serial": "1", "effective_on": "2026-10-08", "name": "화학물질관리법", "law_type": "법률", "promulgated_on": "2026-04-07",
             "promulgation_no": "1", "amend_type": "일부개정", "status": "현행"}]
    return [{"doc": doc, "articles": arts, "annexes": [], "history": hist}]


def test_files_assembly():
    lists = [{"id": "NCIS_ACCIDENT_PREP", "group": "ncis", "title": "사고대비물질", "law": "", "rows": [["7664-93-9", "황산", "", ""]]},
             {"id": "NCIS_CMR", "group": "ncis", "title": "x", "law": "", "rows": [["1-1-1", "x", "", ""]]}]
    basis = {"NCIS_ACCIDENT_PREP": {"basis": "화학물질관리법 제2조제6호", "term": "사고대비물질"}}
    files, rep = B.files(corpus(), lists, basis, "2026-10-31")
    assert set(files) >= {"index.json", "toc.json", "lists.json", "law_000162.json"} and len([f for f in files if f.startswith("cas_")]) == 64
    assert files["index.json"]["docs"][0]["art_url"].endswith("/{art}") and files["index.json"]["as_of"] == "2026-10-31"
    doc = files["law_000162.json"]
    assert doc["items"][1]["head"] == "제2조(정의) 뜻" and doc["history"][0]["url"].endswith("lsiSeq=1")
    assert files["toc.json"]["rows"] == [["law_000162", "h", "1", "제1장 총칙"], ["law_000162", "a", "2", "정의"]]
    entry = files[f"cas_{B.cas_bucket('7664-93-9')}.json"]["cas"]["7664-93-9"]
    assert entry["l"] == ["NCIS_ACCIDENT_PREP"] and entry["m"][0][:3] == ["law_000162", "2", "황산"]
    assert rep["lists"]["NCIS_CMR"]["note"] == "no legal basis text"


def test_secret_check():
    assert law_export.secret_hits({"a.json": b'{"u":"x?OC=abc"}', "b.json": b"{}"}, "") == ["a.json"]
    assert law_export.secret_hits({"a.json": "키값secret".encode()}, "secret") == ["a.json"]
    assert law_export.secret_hits({"a.json": b"{}"}, "") == []


def test_shard_list_order_core_first_existing_last():
    lists = [{"id": i, "group": "x", "title": i, "law": "", "rows": [["7664-93-9", "황산", "", ""]]}
             for i in ("KR_CHEM_PRTR", "NCIS_EXISTING", "NCIS_ACCIDENT_PREP", "KR_OSH_WEM", "IR_KR_OSHA_PSM")]
    cited = {x["id"]: {} for x in lists}
    sh = B.shards(lists, cited, {})
    assert sh[B.cas_bucket("7664-93-9")]["7664-93-9"]["l"] == ["NCIS_ACCIDENT_PREP", "IR_KR_OSHA_PSM", "KR_CHEM_PRTR", "KR_OSH_WEM", "NCIS_EXISTING"]
