"""Law corpus (scripts/portal_build/law_*.py): reference scan, 법제처 OPEN API parsers, article diff, reg_changes rows
and the re-runnable pipeline. Recorded, OC-masked fixtures in tests/fixtures/law/ (trimmed real answers, 2026-10-31);
no network, no portal_facts.db (an in-memory DB and a tmp raw store)."""
from __future__ import annotations

import copy
import json
import os
import sqlite3
import sys
import types

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, "scripts", "portal_build")
if p not in sys.path:
    sys.path.append(p)

import law_api  # noqa: E402
import law_corpus  # noqa: E402
import law_parse as P  # noqa: E402
import law_raw  # noqa: E402
import law_refs  # noqa: E402
import law_store as S  # noqa: E402
import portal_db  # noqa: E402

FIX = os.path.join(ROOT, "tests", "fixtures", "law")


def fx(name: str) -> dict:
    with open(os.path.join(FIX, name), encoding="utf-8") as fh:
        return json.load(fh)


# ---------- references ----------

def test_refs_in_text_plain_and_encoded():
    text = ('"https://www.law.go.kr/법령/화학물질관리법시행규칙" '
            "https://www.law.go.kr/%ED%96%89%EC%A0%95%EA%B7%9C%EC%B9%99/%ED%9C%98%EB%B0%9C%EC%84%B1%EC%9C%A0%EA%B8%B0"
            "%ED%99%94%ED%95%A9%EB%AC%BC%EC%A7%80%EC%A0%95%EA%B3%A0%EC%8B%9C/(2025-1) "
            "https://www.law.go.kr/법령/산업안전보건법/제44조 https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=1")
    assert law_refs.refs_in_text(text) == {("law", "화학물질관리법시행규칙"), ("admrul", "휘발성유기화합물지정고시"),
                                           ("law", "산업안전보건법")}


def test_merge_adds_missing_and_keeps_core():
    law_set = {"laws": [{"name": "화학물질관리법 시행규칙", "kind": "law", "origin": ["core"]}]}
    found = {("law", "화학물질관리법시행규칙"): {"name": "화학물질관리법시행규칙", "files": ["a.json"], "list_ids": ["KR_X"]},
             ("admrul", "X고시"): {"name": "X고시", "files": ["b.jsx"], "list_ids": []}}
    out, added = law_refs.merge(law_set, found)
    assert [e["name"] for e in added] == ["X고시"]
    core = out["laws"][0]
    assert core["origin"] == ["core", "referenced"] and core["list_ids"] == ["KR_X"] and core["refs"] == ["a.json"]


def test_norm_name_ignores_spaces_and_dot_forms():
    assert P.norm_name("전기·전자제품 및 자동차") == P.norm_name("전기ㆍ전자제품및자동차")


def test_law_set_file_is_well_formed():
    with open(os.path.join(ROOT, "scripts", "portal_build", "law_set.json"), encoding="utf-8") as fh:
        laws = json.load(fh)["laws"]
    keys = [(e["kind"], P.norm_name(e["name"])) for e in laws]
    assert len(keys) == len(set(keys)) and {e["kind"] for e in laws} == {"law", "admrul"}
    names = {P.norm_name(e["name"]) for e in laws if e["kind"] == "law"}
    for fam in ("화학물질관리법", "고압가스안전관리법", "산업안전보건법", "중대재해처벌등에관한법률"):
        assert fam in names and fam + "시행령" in names


# ---------- search / 현행 pick ----------

def test_search_hits_and_pick_current_law():
    hits, total = P.search_hits(fx("search_law.json"), "law")
    assert total == 3 and len(hits) == 3
    hit, why = P.pick_current(hits, "화학물질관리법시행령")
    assert why == "" and hit["serial"] == "290837" and hit["law_id"] == "004390"
    assert hit["promulgated_on"] == "2026-10-06" and hit["law_type"] == "대통령령"


def test_pick_current_admrul_skips_pending_version():
    hits, _ = P.search_hits(fx("search_admrul.json"), "admrul")
    hit, _ = P.pick_current(hits, "유해화학물질의규정수량에관한규정")
    assert hit["serial"] == "2100000278502" and hit["status"] == "현행" and hit["promulgation_no"] == "2026-4"


def test_pick_current_failures():
    hits, _ = P.search_hits(fx("search_law.json"), "law")
    assert P.pick_current(hits, "화학물질")[1].startswith("no exact name match")
    old = [dict(h, status="연혁") for h in hits]
    assert "no 현행" in P.pick_current(old, "화학물질관리법")[1]
    two = [hits[0], dict(hits[0], law_id="999")]
    assert P.pick_current(two, "화학물질관리법")[1].startswith("ambiguous")


def test_single_hit_answer_is_a_dict():
    data = {"LawSearch": {"totalCnt": "1", "law": fx("search_law.json")["LawSearch"]["law"][0]}}
    hits, total = P.search_hits(data, "law")
    assert total == 1 and hits[0]["name"] == "화학물질관리법"


# ---------- bodies ----------

def test_law_doc_articles_paras_annexes():
    d = P.law_doc(fx("body_law.json"))
    assert d["meta"]["law_id"] == "000162" and d["meta"]["ministry"] == "기후에너지환경부"
    assert d["meta"]["promulgated_on"] == "2026-04-07" and d["meta"]["law_type"] == "법률"
    arts = {a["article_no"]: a for a in d["articles"] if a["kind"] == "article"}
    assert set(arts) == {"1", "2", "9", "11의2"}
    assert [a["kind"] for a in d["articles"]].count("heading") == 2
    art2 = arts["2"]
    assert art2["title"] == "정의" and art2["paras"][0]["items"][2]["no"] == "2의2"
    assert "2의2. \"인체만성유해성물질\"" in art2["text"]
    assert arts["9"]["paras"][0]["no"] == "①" and arts["9"]["paras"][0]["items"][0]["no"] == "1"
    assert d["annexes"][0]["annex_no"] == "1" and d["annexes"][0]["title"].startswith("과징금의 부과기준")
    assert d["annexes"][0]["pdf_url"].startswith("https://www.law.go.kr/LSW/flDownload.do?flSeq=")


def test_admrul_doc_articles():
    d = P.admrul_doc(fx("body_admrul.json"))
    assert d["meta"]["law_id"] == "93578" and d["meta"]["promulgation_no"] == "2026-4"
    assert [(a["article_no"], a["title"]) for a in d["articles"]] == [("1", "목적"), ("2", "용어정의"), ("3", "규정수량")]
    assert d["annexes"][0]["title"] == "유해·위험성 그룹별 규정수량"


# ---------- diff / reg_changes rows ----------

def _art(no, text, title="t", kind="article"):
    return {"article_no": no, "text": text, "title": title, "kind": kind}


def test_diff_articles():
    old = [_art("1", "제1조(목적) a"), _art("2", "제2조(정의) b"), _art("3", "제3조(x) c"), _art("4", "제4조 삭제 <2020.1.1>"),
           _art("1", "제1장 총칙", kind="heading")]
    new = [_art("1", "제1조(목적)  a"), _art("2", "제2조(정의) b2"), _art("3", "제3조 삭제 <2026.1.1>"),
           _art("3의2", "제3조의2(y) d", "y"), _art("4", "제4조 삭제 <2020.1.1>")]
    assert P.diff_articles(old, new) == [("modified", "2", "t"), ("removed", "3", "t"), ("added", "3의2", "y")]


def test_change_rows():
    meta = {"name": "화학물질관리법", "promulgated_on": "2026-04-07", "effective_on": "2026-10-08",
            "amend_type": "일부개정", "law_type": "법률", "promulgation_no": "21531"}
    rows = S.change_rows([("added", "11의2", "배출저감"), ("modified", "9", "")], meta, "https://x", ["KR_A", "KR_B"])
    assert len(rows) == 4 and rows[0][:5] == ("2026-04-07", "KR", "KR_A", None, "added")
    assert rows[0][5].startswith("화학물질관리법 제11조의2(배출저감) 신설 — 일부개정 법률 제21531호")
    assert rows[0][7] == "law_go_kr_api"
    assert S.change_rows([("removed", "3", "")], meta, "u", None)[0][2] is None


# ---------- OC masking ----------

def test_mask_hides_oc():
    oc = "secretoc"
    assert law_api.mask("https://x/DRF/lawService.do?OC=secretoc&MST=1", oc) == "https://x/DRF/lawService.do?OC=***&MST=1"
    assert b"secretoc" not in law_api.mask_bytes(b'{"link": "/DRF/a?OC=secretoc&x=1", "o": "secretoc"}', oc)
    for name in os.listdir(FIX):
        with open(os.path.join(FIX, name), encoding="utf-8") as fh:
            assert all(m == "OC=***" for m in __import__("re").findall(r"OC=[^&\"]+", fh.read()))


def test_client_masks_errors_and_spaces_requests():
    slept = []
    clock = iter([0.0, 0.2, 0.3, 5.0]).__next__

    def getter(url, params):
        if params.get("MST") == "bad":
            raise RuntimeError(f"GET failed: {url}?OC={params['OC']}")
        return b'{"LawSearch": {"totalCnt": "0"}}'

    c = law_api.Client("secretoc", getter=getter, sleep=slept.append, clock=clock)
    data, body, url = c.search_current("law", "x")
    assert "secretoc" not in url and data["LawSearch"]["totalCnt"] == "0"
    try:
        c.service("law", "bad")
        raise AssertionError("expected LawApiError")
    except law_api.LawApiError as exc:
        assert "secretoc" not in str(exc)
    assert slept and abs(slept[0] - 0.8) < 1e-9


# ---------- pipeline (fake client, in-memory DB) ----------

class FakeClient:
    """Answers the six requests from fixtures; `bodies` maps serial → body JSON."""

    def __init__(self, search: dict, bodies: dict, history: dict):
        self.search, self.bodies, self.history, self.oc, self.requests, self.calls = search, bodies, history, "oc", 0, []

    def _ans(self, what, data):
        self.requests += 1
        self.calls.append(what)
        return data, json.dumps(data, ensure_ascii=False).encode("utf-8"), f"https://www.law.go.kr/DRF/{what}?OC=***"

    def search_current(self, kind, name):
        return self._ans("search", self.search)

    def service(self, kind, serial):
        return self._ans("service", self.bodies[serial])

    def history_page(self, kind, name, page):
        return self._ans("history", self.history)


def _conn():
    conn = sqlite3.connect(":memory:")
    portal_db.ensure_schema(conn)
    return conn


def test_run_baseline_rerun_and_version_change(tmp_path):
    opts = types.SimpleNamespace(reparse=False, history=False)
    entry = [{"name": "화학물질관리법", "kind": "law", "list_ids": ["KR_CHEM_X"]}]
    search = fx("search_law.json")
    body = fx("body_law.json")
    client = FakeClient(search, {"285367": body}, fx("history_eflaw.json"))
    raw, conn = law_raw.RawStore(str(tmp_path)), _conn()

    rep = law_corpus.run(entry, client, raw, conn, opts)          # baseline
    assert rep["resolved"] == 1 and rep["failed"] == [] and rep["articles_current"] == 4
    assert client.calls == ["search", "service", "history"]
    assert rep["history_rows"] == 2                                # the third history row is another 법령ID
    assert raw.has("body/law/285367.json.gz") and os.path.exists(tmp_path / "manifest.json")
    assert conn.execute("SELECT COUNT(*) FROM reg_changes").fetchone()[0] == 0

    client.calls.clear()
    rep = law_corpus.run(entry, client, raw, conn, opts)          # unchanged: no body, no history
    assert client.calls == ["search"] and rep["results"][0]["body"] == "kept"

    new_body = copy.deepcopy(body)                                 # a new 현행 version: 제9조 changed, 제11조의2 gone
    units = new_body["법령"]["조문"]["조문단위"]
    new_body["법령"]["조문"]["조문단위"] = [u for u in units if u.get("조문가지번호") != "2"]
    for u in new_body["법령"]["조문"]["조문단위"]:
        if u.get("조문번호") == "9" and u.get("조문여부") == "조문":
            u["조문내용"] = "제9조(화학물질확인) 바뀐 본문"
    new_body["법령"]["기본정보"].update(공포일자="20261201", 공포번호="22000")
    new_search = copy.deepcopy(search)
    new_search["LawSearch"]["law"][0].update(법령일련번호="300000", 공포일자="20261201", 공포번호="22000")
    client.search, client.bodies["300000"] = new_search, new_body
    rep = law_corpus.run(entry, client, raw, conn, opts)
    d = rep["version_changes"][0]
    assert d["from"] == "law:285367" and d["to"] == "law:300000" and d["articles"] == 2
    rows = conn.execute("SELECT changed_on, list_id, change, detail, source_id FROM reg_changes ORDER BY change").fetchall()
    assert [(r[0], r[1], r[2], r[4]) for r in rows] == [("2026-12-01", "KR_CHEM_X", "modified", "law_go_kr_api"),
                                                         ("2026-12-01", "KR_CHEM_X", "removed", "law_go_kr_api")]
    assert conn.execute("SELECT doc_key FROM law_docs WHERE is_current = 1").fetchall() == [("law:300000",)]
    assert conn.execute("SELECT COUNT(*) FROM law_docs").fetchone()[0] == 2   # the old version is kept

    rep = law_corpus.run(entry, client, raw, conn, opts)          # same change is not appended twice
    assert conn.execute("SELECT COUNT(*) FROM reg_changes").fetchone()[0] == 2


def test_run_reports_unresolved_name(tmp_path):
    opts = types.SimpleNamespace(reparse=False, history=False)
    client = FakeClient(fx("search_law.json"), {}, {})
    rep = law_corpus.run([{"name": "없는법", "kind": "law"}], client, law_raw.RawStore(str(tmp_path)), _conn(), opts)
    assert rep["resolved"] == 0 and rep["failed"][0]["reason"].startswith("no exact name match")


def test_admrul_without_article_form_is_one_body_row():
    data = {"AdmRulService": {"행정규칙기본정보": {"행정규칙ID": "1", "조문형식여부": "N"},
                              "조문내용": "1. 관련근거 : 대기환경보전법 제2조제10호 2. 내용 : 휘발성유기화합물의 종류"}}
    arts = P.admrul_doc(data)["articles"]
    assert [(a["kind"], a["article_no"]) for a in arts] == [("body", "본문")]
    changed = [dict(arts[0], text=arts[0]["text"] + " 추가")]
    assert P.diff_articles(arts, changed) == [("modified", "본문", "")]
    meta = {"name": "X 고시", "promulgated_on": "2026-01-01", "effective_on": "", "amend_type": "", "law_type": "고시",
            "promulgation_no": "1"}
    assert S.change_rows([("modified", "본문", "")], meta, "u", None)[0][5].startswith("X 고시 본문 개정")
