"""Official-source country lists (2026-11-01): US DOT HMT + Appendix A RQ, Japan 化管法 / 安衛法 / 化審法 優先評価,
Canada NPRI (scripts/country_lists_official/) and the g/intl_reg_add shards (scripts/static_export/intl_reg_add.py).

Pure functions on small inline fixtures; raw-file checks run only when data/portal_raw/intl_reg/ holds the downloads.
No network.
"""
from __future__ import annotations

import os
import sqlite3
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for sub in ("scripts", "scripts/country_lists_official", "scripts/static_export"):
    p = os.path.join(ROOT, *sub.split("/"))
    if p not in sys.path:
        sys.path.append(p)

import jp_ishl  # noqa: E402
import raw  # noqa: E402
import us_dot_hmt as H  # noqa: E402

HMT_XML = """<DIV8><TABLE><CAPTION><P>§ 172.101 Hazardous Materials Table</P></CAPTION><TBODY>
<TR><TD></TD><TD><E T="03">Accumulators, electric, see</E> Batteries, wet <E T="03">etc</E></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD></TR>
<TR><TD> </TD><TD>Ethylene</TD><TD>2.1</TD><TD>UN1962</TD><TD></TD><TD>2.1</TD><TD></TD><TD>306</TD><TD>304</TD><TD>314</TD><TD>Forbidden</TD><TD>150 kg</TD><TD>E</TD><TD>40</TD></TR>
<TR><TD> </TD><TD>Ethylene, refrigerated liquid <E T="03">(cryogenic liquid)</E></TD><TD>2.1</TD><TD>UN1038</TD><TD></TD><TD>2.1</TD><TD>T75, TP5</TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD></TR>
<TR><TD> </TD><TD>Acetal</TD><TD>3</TD><TD>UN1088</TD><TD>II</TD><TD>3</TD><TD>IB2, T4, TP1</TD><TD>150</TD><TD>202</TD><TD>242</TD><TD>5 L</TD><TD>60 L</TD><TD>E</TD><TD></TD></TR>
<TR><TD></TD><TD></TD><TD></TD><TD></TD><TD>III</TD><TD>3</TD><TD>B1, IB3</TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD></TR>
</TBODY></TABLE>
<TABLE><CAPTION><P>Table 1 to Appendix A—Hazardous Substances Other Than Radionuclides</P></CAPTION><TBODY>
<TR><TD>Benzene</TD><TD>10 (4.54)</TD></TR><TR><TD>Unknownium</TD><TD>1 (0.454)</TD></TR></TBODY></TABLE></DIV8>"""
CFR302_XML = """<TABLE><CAPTION>Table 302.4—List of Hazardous Substances and Reportable Quantities</CAPTION><TBODY>
<TR><TD>Benzene <sup>a</sup></TD><TD>71-43-2</TD><TD>1,2,3,4</TD><TD>U019</TD><TD>10 (4.54)</TD></TR></TBODY></TABLE>"""


# ---- US DOT HMT ----

def test_parse_hmt_skips_cross_references_and_joins_packing_groups():
    entries = H.parse_hmt(HMT_XML)
    assert [e.psn for e in entries] == ["Ethylene", "Ethylene, refrigerated liquid", "Acetal"]
    acetal = entries[2]
    assert acetal.pgs == ["II", "III"] and acetal.ident == "UN1088"
    assert entries[1].description.endswith("(cryogenic liquid)")  # italic text kept as description, not PSN


def test_base_names_strip_one_state_qualifier():
    assert H.base_names("Ethylene, refrigerated liquid") == [("Ethylene, refrigerated liquid", "name"), ("Ethylene", "name+state")]
    assert H.base_names("Ammonia, anhydrous")[1] == ("Ammonia", "name+state")
    assert H.base_names("Benzene") == [("Benzene", "name")]


def test_match_uses_un_then_names_and_disambiguates_shared_names():
    entries = H.parse_hmt(HMT_XML)
    un = {"74-85-1": {"1962": "KOSHA MSDS §14"}}
    names = {"ethylene": {"74-85-1", "9002-88-4"}, "acetal": {"105-57-7"}}  # "ethylene" is shared: needs the UN match
    out, stats = H.match_hmt(entries, un, names)
    got = {(cas, e.ident): m for cas, e, m in out}
    assert "UN number (KOSHA MSDS §14)" in got[("74-85-1", "UN1962")]
    assert got[("74-85-1", "UN1038")].startswith("name+state (Ethylene), disambiguated")
    assert got[("105-57-7", "UN1088")] == "name"
    assert not any(cas == "9002-88-4" for cas, _, _ in out)
    assert stats["cas"] == 2


def test_detail_carries_class_un_pg_and_match():
    e = H.parse_hmt(HMT_XML)[2]
    d = H.entry_detail(e, "name")
    assert d.startswith("UN1088 | Class 3 | PG II/III | Labels 3") and "match: name" in d


def test_rq_rows_match_302_4_names_exactly():
    rows, stats = H.rq_rows(HMT_XML, CFR302_XML, "src")
    assert [(r.cas_no, r.chemical_name) for r in rows] == [("71-43-2", "Benzene")]
    assert rows[0].detail.startswith("RQ 10 lb (4.54 kg)") and stats["unmatched_names"] == 1


# ---- Japan ISHL name matching ----

def test_name_key_normalizes_statute_spelling():
    assert jp_ishl.name_key("フエノール") == jp_ishl.name_key("フェノール")
    assert jp_ishl.name_key("一・四―ジオキサン") == jp_ishl.name_key("１，４－ジオキサン")
    assert jp_ishl.name_key("弗化水素") == jp_ishl.name_key("フッ化水素")
    assert "ジクロロメタン" in jp_ishl.name_keys("ジクロロメタン（別名二塩化メチレン）")


def test_statute_items_skip_ruby_and_mixtures():
    xml = """<Law><AppdxTable><AppdxTableTitle>別表第三</AppdxTableTitle>
      <Item><ItemTitle>二</ItemTitle><ItemSentence><Sentence>第二類物質</Sentence></ItemSentence>
        <Subitem1><Subitem1Title>１</Subitem1Title><Subitem1Sentence><Sentence><Ruby>沃<Rt>よう</Rt></Ruby>化メチル</Sentence></Subitem1Sentence></Subitem1>
        <Subitem1><Subitem1Title>２</Subitem1Title><Subitem1Sentence><Sentence>ベンゼン</Sentence></Subitem1Sentence></Subitem1>
        <Subitem1><Subitem1Title>３</Subitem1Title><Subitem1Sentence><Sentence>１に掲げる物を含有する製剤その他の物</Sentence></Subitem1Sentence></Subitem1>
      </Item></AppdxTable></Law>""".encode("utf-8")
    items = jp_ishl.statute_items(xml)["tokka"]
    assert items[0][2] == "沃化メチル"
    rows, stats = jp_ishl.statute_rows(xml, {jp_ishl.name_key("ベンゼン"): ["71-43-2"]}, "t", "o")
    assert [(r.cas_no, r.regulation) for r in rows] == [("71-43-2", "JP_ISHL_TOKKA")]
    assert stats["JP_ISHL_TOKKA"]["items"] == 2  # the mixture item is not a substance


# ---- static side shards ----

def test_items_by_cas_merges_rows_like_the_api():
    from intl_reg_add import items_by_cas

    labels = {"US_DOT_HMT": ("US", "DOT HMT"), "JP_PRTR_CLASS1": ("JP", "PRTR 1")}
    rows = [("74-85-1", "US_DOT_HMT", "UN1962 | match: x", "s", "Ethylene"),
            ("74-85-1", "US_DOT_HMT", "UN1038 | match: y", "s", "Ethylene, refrigerated liquid"),
            ("71-43-2 ", "JP_PRTR_CLASS1", "政令番号 1-452", "s", "ベンゼン"), ("", "US_DOT_HMT", "x", "s", "n")]
    out = items_by_cas(rows, labels)
    assert set(out) == {"74-85-1", "71-43-2"}
    eth = out["74-85-1"]["US"]
    assert len(eth) == 1 and eth[0]["list"] == "DOT HMT" and len(eth[0]["forms"]) == 2
    assert out["71-43-2"]["JP"][0]["regulation"] == "JP_PRTR_CLASS1"


# ---- loaded data (only when the loader has run) ----

def _db_rows(cas: str) -> set[str]:
    path = os.path.join(ROOT, "data", "terminology.db")
    if not os.path.exists(path):
        pytest.skip("no terminology.db")
    with sqlite3.connect(f"file:{path.replace(os.sep, '/')}?mode=ro", uri=True) as c:
        return {r[0] for r in c.execute("SELECT regulation FROM intl_regulatory WHERE cas_no = ?", (cas,))}


def test_loaded_reference_substances():
    if not os.path.exists(raw.path("us_dot_hmt", raw.MANIFEST)):
        pytest.skip("official lists not downloaded")
    eth, benz = _db_rows("74-85-1"), _db_rows("71-43-2")
    if "US_DOT_HMT" not in eth:
        pytest.skip("loader has not been applied")
    assert {"US_DOT_HMT", "JP_ISHL_LABEL_SDS", "CA_NPRI"} <= eth
    assert {"US_DOT_HMT", "US_DOT_HMT_RQ", "JP_PRTR_CLASS1", "JP_ISHL_LABEL_SDS", "JP_ISHL_TOKKA", "JP_CSCL_PRIORITY"} <= benz
    assert {"US_DOT_HMT", "US_DOT_HMT_RQ", "JP_ISHL_TOKKA"} <= _db_rows("7664-41-7")
