"""Service 6 (regulation lists + change alerts): list rows, snapshot diff, official-source parsers, change folding, RSS.

Pure functions only; no network, no portal_facts.db (append_changes runs on an in-memory DB).
"""
from __future__ import annotations

import os
import sqlite3
import sys
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for sub in ("scripts/portal_build", "scripts/static_export"):
    p = os.path.join(ROOT, *sub.split("/"))
    if p not in sys.path:
        sys.path.append(p)

import reg_lists  # noqa: E402
import reg_official  # noqa: E402
import reg_snapshot  # noqa: E402
from reg_rss import build_rss  # noqa: E402


def test_row_from_entry_formats():
    assert reg_lists.row_from_entry({"cas": "71-43-2", "name_ko": "벤젠", "name_en": "Benzene", "detail": "Ⅰ그룹"}) == \
        ["71-43-2", "벤젠", "Benzene", "Ⅰ그룹"]
    assert reg_lists.row_from_entry({"cas": "107-44-8", "name": "Sarin", "category": "Schedule 1A", "detail": "x"}) == \
        ["107-44-8", "Sarin", "", "Schedule 1A; x"]
    assert reg_lists.row_from_entry({"cas": "1-1-1", "name": "fam"}, family=True)[0] == ""
    assert reg_lists.trim("a" * 300, 10) == "a" * 9 + "…"


def test_ncis_ids_stable():
    assert reg_lists.base_category("제한물질 세분류") == "제한물질"
    assert reg_lists.ncis_list_id("사고대비물질") == "NCIS_ACCIDENT_PREP"
    new = reg_lists.ncis_list_id("새분류")
    assert new.startswith("NCIS_X_") and new == reg_lists.ncis_list_id("새분류")


def _lists(rows_a, amended="2025-01-01"):
    return [{"id": "L1", "title": "목록1", "jurisdiction": "KR", "amended_on": amended, "version": "", "rows": rows_a}]


def test_diff_added_removed_modified_and_meta():
    old = reg_snapshot.build(_lists([["71-43-2", "벤젠", "", "a"], ["108-88-3", "톨루엔", "", ""], ["", "계열", "", ""]]), "2026-10-01")
    new = reg_snapshot.build(_lists([["71-43-2", "벤젠", "", "b"], ["64-17-5", "에탄올", "", ""], ["", "계열", "", ""]],
                                    amended="2026-09-01"), "2026-10-31")
    rows = reg_snapshot.diff(old, new, "2026-10-31")
    got = {(r[4], r[3], r[5]) for r in rows}
    assert ("modified", "71-43-2", "벤젠") in got
    assert ("added", "64-17-5", "에탄올") in got
    assert ("removed", "108-88-3", "톨루엔") in got
    assert ("modified", None, "개정일: 2025-01-01 → 2026-09-01") in got
    assert all(r[0] == "2026-10-31" and r[2] == "L1" and r[7] == "chemip_export_diff" for r in rows)
    assert len(rows) == 4  # the unchanged family row is not reported
    assert reg_snapshot.diff(new, new, "2026-11-01") == []


def test_diff_list_added_and_removed():
    a = reg_snapshot.build(_lists([["1-1-1", "x", "", ""]]), "d")
    empty = {"v": 1, "taken_at": "d", "lists": {}}
    assert [r[4] for r in reg_snapshot.diff(empty, a, "d")] == ["added"]
    assert [r[4] for r in reg_snapshot.diff(a, empty, "d")] == ["removed"]


def test_listmeta_and_law_api_rows():
    kr = {"id": "KR_X", "group": "kr_law", "law": "법", "title": "목록", "amended_on": "2025-08-07",
          "source_url": "https://www.law.go.kr/행정규칙/화학물질배출저감계획서의작성등에관한규정"}
    assert reg_official.listmeta_rows([kr, {**kr, "group": "intl"}])[0][:5] == ("2025-08-07", "KR", "KR_X", None, "modified")
    xml = ("<AdmRulSearch><admrul><행정규칙명>화학물질 배출저감계획서의 작성 등에 관한 규정</행정규칙명><발령일자>20260115</발령일자>"
           "<발령번호>제2026-3호</발령번호></admrul><admrul><행정규칙명>다른 규정</행정규칙명><발령일자>20261001</발령일자></admrul>"
           "</AdmRulSearch>").encode("utf-8")
    hits = reg_official.law_search_hits(xml, "admrul")
    rows = reg_official.law_api_rows(kr, hits)
    assert rows and rows[0][0] == "2026-01-15" and rows[0][7] == "law_go_kr_api" and "제2026-3호" in rows[0][5]
    assert reg_official.law_api_rows({**kr, "amended_on": "2026-02-01"}, hits) == []


def test_fedreg_rows_and_list_mapping():
    body = {"results": [
        {"title": "Significant New Use Rules on Certain Chemical Substances (26-1)", "publication_date": "2026-10-15",
         "html_url": "https://www.federalregister.gov/d/1", "type": "Rule"},
        {"title": "Hazard Communication Standard", "publication_date": "2024-05-20", "html_url": "https://f/2", "type": "Rule"},
        {"title": "", "publication_date": "2024-05-20", "html_url": "https://f/3"},
    ]}
    rows = reg_official.fedreg_rows(body)
    assert len(rows) == 2
    assert rows[0][2] == "IR_US_TSCA_SNUR" and rows[0][5].startswith("[Rule] Significant") and rows[0][1] == "US"
    assert rows[1][2] is None


def test_echa_rows():
    items = [{"substanceName": ["n-hexane"], "casNumber": ["110-54-3"], "dateOfInclusion": "04-Feb-2026",
              "reasonForInclusion": ["STOT RE"]},
             {"substanceName": ["group"], "casNumber": ["-"], "dateOfInclusion": "5-Nov-2025", "reasonForInclusion": []},
             {"substanceName": ["bad"], "casNumber": ["1-1-1"], "dateOfInclusion": "nope"}]
    rows = reg_official.echa_rows(items)
    assert [(r[0], r[3], r[4]) for r in rows] == [("2026-02-04", "110-54-3", "added"), ("2025-11-05", None, "added")]
    assert rows[0][2] == "EU_REACH_SVHC_CANDIDATE" and rows[0][5] == "n-hexane — STOT RE"


def test_append_changes_is_idempotent():
    import reg_diff

    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE reg_changes (changed_on TEXT NOT NULL, jurisdiction TEXT, list_id TEXT, cas TEXT, "
                 "change TEXT NOT NULL, detail TEXT, source_url TEXT, source_id TEXT NOT NULL)")
    row = ("2026-10-31", "KR", "L1", None, "modified", "d", "u", "s")
    assert reg_diff.append_changes(conn, [row, row]) == 1
    assert reg_diff.append_changes(conn, [row]) == 0
    assert conn.execute("SELECT COUNT(*) FROM reg_changes").fetchone()[0] == 1


def test_fold_changes_and_rss():
    import reg_export

    many = [("2026-10-31", "US", "BIG", f"{i}-00-1", "added", f"s{i}", "u", "chemip_export_diff") for i in range(20)]
    few = [("2026-10-30", "KR", "L1", "71-43-2", "removed", "벤젠", "u", "chemip_export_diff"),
           ("2026-10-31", "US", "BIG", None, "modified", "개정일", "u", "chemip_export_diff")]
    items = reg_export.fold_changes(many + few, {"BIG": "큰 목록", "L1": "목록1"}, over=12)
    big = [it for it in items if it["list"] == "BIG" and it["ch"] == "added"]
    assert len(big) == 1 and big[0]["n"] == 20 and big[0]["cas"] is None and big[0]["title"] == "큰 목록"
    assert any(it["ch"] == "modified" and it["list"] == "BIG" for it in items)
    assert any(it["cas"] == "71-43-2" and it["n"] == 1 for it in items)

    xml = build_rss({"title": "T & <x>", "link": "https://l", "description": "d", "self_url": "https://s", "built": "2026-10-31"},
                    reg_export.rss_items(items))
    root = ET.fromstring(xml)
    assert root.tag == "rss" and root.find("channel/title").text == "T & <x>"
    titles = [i.findtext("title") for i in root.iter("item")]
    assert len(titles) == len(items) and any("20종" in t for t in titles)
    assert all(i.findtext("pubDate").endswith("+0000") for i in root.iter("item"))


def test_pc_static_area_route_rejects_unsafe(tmp_path, monkeypatch):
    from backend.api.routes import static_areas

    (tmp_path / "reg" / "list").mkdir(parents=True)
    (tmp_path / "reg" / "lists.json").write_bytes(b"{}")
    (tmp_path / "reg" / "list" / "KR_X.1.json").write_bytes(b"{}")
    monkeypatch.setattr(static_areas, "EXPORT_DIR", tmp_path)
    assert static_areas.resolve("reg", "lists.json")
    assert static_areas.resolve("reg/list", "KR_X.1.json")
    assert static_areas.resolve("reg", "missing.json") is None
    assert static_areas.resolve("p", "lists.json") is None          # area not served here
    assert static_areas.resolve("reg", "..json") is None
    assert static_areas.resolve("reg", "lists.txt") is None
