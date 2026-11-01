"""Portal facts (services 2-4): pure parsers of scripts/portal_build and the file assembly of scripts/static_export/portal_facts_build."""
import os
import sqlite3
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts", "portal_build"))
sys.path.insert(0, os.path.join(ROOT, "scripts", "static_export"))

import cas_utils  # noqa: E402
import msds_oel  # noqa: E402
import msds_transport  # noqa: E402
import msds_values  # noqa: E402
import msds_xml  # noqa: E402
import portal_db  # noqa: E402
import portal_facts_build as pfb  # noqa: E402


def one(code, text):
    rows = msds_values.parse_property(code, text)
    assert len(rows) == 1, rows
    return rows[0]


# ---- section 9 values ----
def test_flash_point_with_origin():
    r = one("I14", "-11 ℃|   ※출처 : ICSC")
    assert r == {"prop": "flash_point", "value_text": "-11 ℃", "value_num": -11.0, "unit": "°C", "condition": None, "origin": "ICSC"}


def test_origin_first_and_filler_dropped():
    r = one("I12", "※출처 : NLM;HSDB, EPI SUITE|158 ℃(실험치)")
    assert (r["value_text"], r["value_num"], r["condition"], r["origin"]) == ("158 ℃(실험치)", 158.0, "실험치", "NLM;HSDB, EPI SUITE")
    assert one("I38", "226.94   |자료없음")["value_text"] == "226.94"


def test_double_escaped_comparator_keeps_text_but_no_number():
    text = msds_xml.unescape("&amp;gt; 93.3 ℃")
    r = one("I14", text)
    assert r["value_text"] == "> 93.3 ℃" and r["value_num"] is None and r["unit"] == "°C"


def test_range_has_no_number():
    r = one("I12", "119~121 ℃")
    assert r["value_num"] is None and r["unit"] == "°C"


def test_si_conversions():
    assert one("I22", "10 ㎪(20℃)|   ※출처 : ECHA")["value_num"] == 10000.0
    assert one("I22", "0.159 ㎜Hg ( (25 ℃))")["value_num"] == pytest.approx(21.198, rel=1e-3)
    assert one("I24", "1.88 g/ℓ(23.5℃)")["value_num"] == 1.88
    assert one("I24", "63 ㎎/ℓ (at 20 °C, pH 7.5)")["value_num"] == pytest.approx(0.063)
    assert one("I24", "0.32 g/100㎖ (25℃)")["value_num"] == pytest.approx(3.2)
    v = one("I36", "0.604 cP(25℃)")
    assert (v["value_num"], v["unit"]) == (0.604, "mPa·s")
    k = one("I36", "0.92 ㎟/s|   ※출처 : ECHA")
    assert (k["value_num"], k["unit"]) == (0.92, "mm²/s")
    assert one("I12", "576 K (100 kPa)")["value_num"] == pytest.approx(302.85)


def test_dimensionless_and_assumed_units():
    assert one("I28", "0.877 (20 ℃)")["value_num"] == 0.877
    assert one("I28", "밀도 : 1.32 g/cm3   |   ※출처 : Lookchem")["value_num"] == 1.32
    assert one("I30", "2.13 |   ※출처 : CHemIDplus,IPCS")["value_num"] == 2.13
    m = one("I38", "78.1134   |   ※출처 : ChemIDplus")
    assert (m["value_num"], m["unit"]) == (78.1134, "g/mol")


def test_no_data_and_text_only():
    for code, text in [("I14", "(자료없음)"), ("I14", "&lt;  ℃"), ("I12", "(해당없음) |자료없음"), ("I22", "(해당 안됨)"),
                       ("I12", "0 |자료없음"), ("I14", "℃ (사용할 수 없는) |자료없음"), ("I20", "- / -"), ("I08", "(없음)")]:
        assert msds_values.parse_property(code, msds_xml.unescape(text)) == [], text
    r = one("I24", "(불용성)")
    assert r["value_text"] == "(불용성)" and r["value_num"] is None
    assert one("I10", "0 ℃")["value_num"] == 0.0  # a measured 0 with a unit is kept


def test_flammability_limits_split_upper_lower():
    rows = msds_values.parse_property("I20", "8.0 / 1.2 %  |   ※출처 : ICSC")
    assert [(r["prop"], r["value_text"], r["value_num"], r["origin"]) for r in rows] == [("ufl", "8.0 %", 8.0, "ICSC"), ("lfl", "1.2 %", 1.2, "ICSC")]
    assert [r["prop"] for r in msds_values.parse_property("I20", "- / 2.2   |   ※출처 : 혼멜(1991)")] == ["lfl"]


# ---- section 14 / 8 / 3 ----
def test_transport_row_normalised():
    t = msds_transport.transport_row({"N02": "UN1993", "N04": "인화성 액체(FLAMMABLE LIQUID, N.O.S.)", "N06": "3", "N08": "Ⅱ",
                                      "N10": "해당(MP)", "N1202": "FA?", "N1204": "S-E"})
    assert t == {"un_number": "1993", "proper_name": "인화성 액체(FLAMMABLE LIQUID, N.O.S.)", "hazard_class": "3", "packing_group": "II",
                 "marine_pollutant": "yes", "ems": "F-A, S-E"}
    assert msds_transport.transport_row({"N02": "UN 운송위험물질 분류정보가 없음"}) is None
    assert msds_transport.packing_group("III") == "III" and msds_transport.packing_group("해당없음") is None
    assert msds_transport.marine_pollutant("비해당") == "no" and msds_transport.marine_pollutant("자료없음") is None


def test_kr_oel_parse():
    assert msds_oel.parse_oel("|TWA : 0.5ppm |STEL : 2.5ppm(허용기준)") == [
        {"kind": "TWA", "value": 0.5, "unit": "ppm", "notation": None},
        {"kind": "STEL", "value": 2.5, "unit": "ppm", "notation": "허용기준"}]
    assert msds_oel.parse_oel("| |STEL : C25ppm") == [{"kind": "C", "value": 25.0, "unit": "ppm", "notation": None}]
    two = msds_oel.parse_oel("|TWA : 5ppm19mg/m3")
    assert [(r["value"], r["unit"]) for r in two] == [(5.0, "ppm"), (19.0, "mg/m3")]
    assert msds_oel.parse_oel("|TWA : 1mg/m3망간 및 무기 화합물")[0]["notation"] == "망간 및 무기 화합물"
    assert msds_oel.parse_oel("|구성성분을 고려하여 노출기준을 적용하시오.") == []
    assert not msds_oel.has_text("|자료없음") and msds_oel.has_text("|TWA : 0.5ppm")


def test_cas_repair_only_with_check_digit():
    assert cas_utils.repair_cas("71-43-2") == "71-43-2"
    assert cas_utils.repair_cas("6973-09-07") is None or cas_utils.cas_checksum_ok(cas_utils.repair_cas("6973-09-07"))
    assert cas_utils.repair_cas("7732-18-05") == "7732-18-5"  # water, check digit 5
    assert cas_utils.repair_cas("not a cas") is None


def test_xml_items_first_wins_and_unescape():
    xml = ("<items><item><msdsItemCode>I14</msdsItemCode><itemDetail>&amp;amp;gt; 10 ℃</itemDetail></item>"
           "<item><msdsItemCode>I14</msdsItemCode><itemDetail>20 ℃</itemDetail></item>"
           "<item><msdsItemCode>I02</msdsItemCode></item></items>")
    assert msds_xml.parse_items(xml) == {"I14": "> 10 ℃"}


# ---- DB helpers ----
def test_replace_rows_only_touches_own_source(tmp_path):
    path = str(tmp_path / "pf.db")
    conn = portal_db.connect(path)
    portal_db.replace_rows(conn, "oel", ["moel"], ["cas", "jurisdiction", "kind", "value", "unit", "notation", "as_of", "source_id"],
                           [("71-43-2", "KR", "TWA", 0.5, "ppm", None, "2024", "moel")])
    portal_db.replace_rows(conn, "oel", ["kosha_msds_s8"], ["cas", "jurisdiction", "kind", "value", "unit", "notation", "as_of", "source_id"],
                           [("71-43-2", "KR", "TWA", 0.5, "ppm", None, None, "kosha_msds_s8")])
    portal_db.replace_rows(conn, "oel", ["kosha_msds_s8"], ["cas", "jurisdiction", "kind", "value", "unit", "notation", "as_of", "source_id"], [])
    assert conn.execute("SELECT source_id FROM oel").fetchall() == [("moel",)]
    conn.close()


# ---- static file assembly ----
IDS = [("name_ko", "벤젠 (Benzene)", "chemip_terms"), ("name_en", "Benzene", "chemip_terms"), ("name_ko", "벤졸", "chemip_aliases"),
       ("kosha_id", "001008", "chemip_terms"), ("kosha_id", "046153", "kosha_msds"), ("ke", "KE-02150", "ncis"),
       ("ec", "200-753-7", "wikidata"), ("un", "1114", "kosha_msds_s14")]


def _prop(chem_id, n, origin="ICSC"):
    return {"cas": "71-43-2", "prop": "flash_point", "value_text": f"{n} ℃", "value_num": n, "unit": "°C", "condition": None,
            "origin": origin, "chem_id": chem_id, "source_id": "kosha_msds_s9"}


def test_facts_object_best_row_first_and_link():
    body = pfb.facts_object("71-43-2", IDS, [_prop("046153", -10.0), _prop("001008", -11.0)], [], [], [],
                            {"kosha_msds_s9": {"name": "KOSHA MSDS §9"}, "ncis": {"name": "NCIS"}})
    assert body["link"] == "001008"
    assert [r["id"] for r in body["props"]["flash_point"]] == ["001008", "046153"]
    assert body["names"]["ko"][0] == "벤젠 (Benzene)" and body["ids"]["ec"] == ["200-753-7"]
    assert "kosha_msds_s9" in body["sources"] and "ncis" in body["sources"]


def test_link_falls_back_to_cas_then_msds_record():
    assert pfb.link_id("1-1-1", [("name_en", "X", "chemip_terms")]) == "1-1-1"
    assert pfb.link_id("1-1-1", [("kosha_id", "049999", "kosha_msds")]) == "049999"


def test_un_index_and_id_shards():
    card = {"71-43-2": {"link": "001008", "names": ["벤젠", "Benzene"]}}
    t = {"un_number": "1114", "proper_name": "벤젠(BENZENE)", "hazard_class": "3", "packing_group": "II", "marine_pollutant": "yes", "ems": "F-E, S-D"}
    idx = pfb.un_index({"71-43-2": [t]}, card)
    assert idx["1114"]["class"] == "3" and idx["1114"]["n"] == 1 and idx["1114"]["cas"] == [["71-43-2", "001008", "벤젠", "Benzene"]]
    shards = pfb.id_shards({"71-43-2": IDS}, card, buckets=128)
    b = pfb.lookup_bucket("KE-02150", 128)
    assert shards[b]["KE-02150"] == [["ke", "71-43-2", "001008", "벤젠", "Benzene"]]
    assert all("1114" not in keys for keys in shards.values())  # UN numbers live in g/un_index.json
    assert pfb.fnv1a32("a") == 0xE40C292C  # FNV-1a 32 test vector


@pytest.mark.skipif(not os.path.exists(portal_db.PORTAL_DB), reason="portal_facts.db not built")
def test_built_db_has_benzene_facts():
    conn = sqlite3.connect(f"file:{portal_db.PORTAL_DB.replace(os.sep, '/')}?mode=ro", uri=True)
    try:
        fp = conn.execute("SELECT value_num FROM properties WHERE cas='71-43-2' AND prop='flash_point' AND chem_id='001008'").fetchone()
        un = conn.execute("SELECT un_number, packing_group FROM transport WHERE cas='71-43-2' AND chem_id='001008'").fetchone()
        ke = conn.execute("SELECT value FROM identifiers WHERE cas='71-43-2' AND id_type='ke'").fetchone()
    finally:
        conn.close()
    assert fp == (-11.0,) and un == ("1114", "II") and ke == ("KE-02150",)
