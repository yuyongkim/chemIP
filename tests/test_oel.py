"""Exposure-limit comparison (service 5): pure parsers of scripts/portal_build/oel_*.py, spot checks of the parsed official
sources (benzene, toluene, formaldehyde, ammonia, HF; skipped when the raw files are not downloaded) and the file assembly of
scripts/static_export/oel.py."""
import datetime as dt
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts", "portal_build"))
sys.path.insert(0, os.path.join(ROOT, "scripts", "static_export"))

import hwp5_tables  # noqa: E402
import oel_eu  # noqa: E402
import oel_kr_moel  # noqa: E402
import oel_raw  # noqa: E402
import oel_us_niosh  # noqa: E402
import oel_us_osha  # noqa: E402
import oel_values as ov  # noqa: E402


# ---------- shared helpers ----------

def test_parse_number_formats():
    assert ov.parse_number("1 210") == 1210
    assert ov.parse_number("0,66") == 0.66
    assert ov.parse_number("1,000") == 1000
    assert ov.parse_number("2 ( 8 )") == 2
    assert ov.parse_number("—") is None and ov.parse_number("-") is None and ov.parse_number("") is None
    assert ov.parse_number("abc") is None


def test_units_are_normalised():
    assert ov.norm_unit("mg/m 3") == ("mg/m3", 1.0)
    assert ov.norm_unit("µg/m3") == ("mg/m3", 0.001)
    assert ov.norm_unit("개/㎤") == ("f/cc", 1.0)
    assert ov.norm_unit("ppb") == ("ppm", 0.001)
    assert ov.norm_unit("furlong") is None
    assert ov.scaled(50, 0.001) == 0.05


def test_cas_list_and_qualify():
    assert ov.cas_list("[7440-02-0] 발암성 1A, [7440-02-0]") == ["7440-02-0"]
    a = [("Nickel metal", [ov.row("7440-02-0", "KR", "TWA", 1.0, "mg/m3", "발암성 2")]),
         ("Nickel soluble", [ov.row("7440-02-0", "KR", "TWA", 0.1, "mg/m3", None)]),
         ("Toluene", [ov.row("108-88-3", "KR", "TWA", 50.0, "ppm", None)])]
    rows = ov.qualify_shared_cas(a)
    assert rows[0]["notation"] == "[Nickel metal] 발암성 2" and rows[1]["notation"] == "[Nickel soluble]"
    assert rows[2]["notation"] is None
    with pytest.raises(ValueError):
        ov.row("1-11-1", "KR", "PEAK", 1, "ppm")


def test_hwp_para_text_drops_controls():
    text = "가A".encode("utf-16-le")
    inline = (11).to_bytes(2, "little") + b"\x00" * 14  # an 8-WCHAR control
    assert hwp5_tables.para_text(inline + text + (13).to_bytes(2, "little")) == "가A "


# ---------- Korea (MOEL notice annex 1) ----------

def test_kr_cell_values():
    assert oel_kr_moel.parse_cell("50", "TWA", "ppm") == ("TWA", 50.0, "ppm")
    assert oel_kr_moel.parse_cell("C 0.05", "STEL", "ppm") == ("C", 0.05, "ppm")
    assert oel_kr_moel.parse_cell("0.2개/㎤", "TWA", "mg/m3") == ("TWA", 0.2, "f/cc")
    assert oel_kr_moel.parse_cell("-", "TWA", "ppm") is None
    assert oel_kr_moel.parse_cell_values("0.01 (0.002)", "TWA", "mg/m3") == [
        ("TWA", 0.01, "mg/m3", None), ("TWA", 0.002, "mg/m3", oel_kr_moel.RESPIRABLE_NOTE)]
    with pytest.raises(ValueError):
        oel_kr_moel.parse_cell("abc", "TWA", "ppm")


def test_kr_table_rows():
    table = [
        ["일련 번호", "유해물질의 명칭", "", "화학식", "노출기준", "", "", "", "비 고"],
        ["8", "과산화수소", "Hydrogen peroxide", "H2O2", "1", "-", "-", "-", "[7722-84-1] 발암성 2"],
        ["40", "노말-프로필 아세테이트", "n-Propyl acetate", "x", "초산 프로필 참조", "", "", "", ""],
        ["243", "불화수소", "Hydrogen fluoride, as F", "HF", "0.5", "-", "C 3", "-", "[7664-39-3] Skin"],
    ]
    rows, stats = oel_kr_moel.parse_table(table)
    assert stats["entries"] == 3 and stats["see_refs"] == 1
    got = {(r["cas"], r["kind"], r["value"], r["unit"], r["notation"]) for r in rows}
    assert got == {("7722-84-1", "TWA", 1.0, "ppm", "발암성 2"), ("7664-39-3", "TWA", 0.5, "ppm", "Skin"),
                   ("7664-39-3", "C", 3.0, "ppm", "Skin")}


# ---------- United States (OSHA, NIOSH) ----------

def test_osha_values():
    assert oel_us_osha._z1_value("(C)10") == ("C", 10.0)
    assert oel_us_osha._z1_value("1,000") == ("TWA", 1000.0)
    assert oel_us_osha._z1_value("") is None
    assert oel_us_osha._z2_value("200 ppm") == (200.0, "ppm")
    assert oel_us_osha._z2_value("2 µg/m3") == (0.002, "mg/m3")
    assert oel_us_osha._z2_value("1 mg/10m3") == (0.1, "mg/m3")


def test_osha_z1_rows_and_parents():
    rows = [
        {"cells": ["Substance", "CAS No. (c)", "ppm", "mg/m3", "Skin designation"], "indent": False},
        {"cells": ["Ammonia", "7664-41-7", "50", "35", ""], "indent": False},
        {"cells": ["Benzene; see 1910.1028", "71-43-2", "", "", ""], "indent": False},
        {"cells": ["Butylamine", "109-73-9", "(C)5", "(C)15", "X"], "indent": False},
        {"cells": ["Vanadium", "1314-62-1", "", "", ""], "indent": False},
        {"cells": ["Fume (as V2O5)", "", "", "(C)0.1", ""], "indent": True},
    ]
    got = {(r["cas"], r["kind"], r["value"], r["unit"], r["notation"]) for r in oel_us_osha.parse_z1(rows)}
    assert got == {("7664-41-7", "TWA", 50.0, "ppm", None), ("7664-41-7", "TWA", 35.0, "mg/m3", None),
                   ("109-73-9", "C", 5.0, "ppm", "skin"), ("109-73-9", "C", 15.0, "mg/m3", "skin"),
                   ("1314-62-1", "C", 0.1, "mg/m3", None)}


def test_niosh_rel_text():
    rel = oel_us_niosh.parse_rel("TWA 10 ppm (25 mg/m 3 ) ST 15 ppm (37 mg/m 3 )")
    assert [(v["kind"], v["value"], v["unit"]) for v in rel] == [
        ("TWA", 10.0, "ppm"), ("TWA", 25.0, "mg/m3"), ("STEL", 15.0, "ppm"), ("STEL", 37.0, "mg/m3")]
    c = oel_us_niosh.parse_rel("C 1 ppm (4 mg/m 3 ) [15-minute]")
    assert c[0]["kind"] == "C" and "15 min" in c[0]["notes"]
    dust = oel_us_niosh.parse_rel("TWA 10 mg/m 3 (total) TWA 5 mg/m 3 (resp)")
    assert [v["notes"] for v in dust] == [["total"], ["respirable"]]
    cr = oel_us_niosh.parse_rel("Ca TWA 0.001 mg Cr(VI)/m 3 See Appendix A")
    assert cr[0]["value"] == 0.001 and cr[0]["unit"] == "mg/m3" and cr[0]["notes"] == ["as Cr(VI)"]


def test_niosh_idlh_text():
    assert oel_us_niosh.parse_idlh("Ca [500 ppm]<br>See: <a>71432</a>")["value"] == 500.0
    assert oel_us_niosh.parse_idlh("N.D. See: IDLH INDEX") is None
    assert oel_us_niosh.parse_idlh("Ca [N.D.]") is None
    lel = oel_us_niosh.parse_idlh("2500 ppm [10%LEL] See: 67641")
    assert lel["value"] == 2500.0 and lel["notes"] == ["10% LEL"]
    sb = oel_us_niosh.parse_idlh("50 mg/m 3 (as Sb)")
    assert sb["unit"] == "mg/m3" and sb["notes"] == ["as Sb"]


# ---------- European Union ----------

def test_eu_rows_right_aligned():
    rows = [
        ["Einecs", "CAS", "Name of agent", "Limit values", "Notation"],
        ["203-625-9", "108-88-3", "Toluene", "192", "50", "384", "100", "skin"],
        ["8003-34-7", "Pyrethrum ( 3 )", "1", "—", "—", "—", "—"],                # EC cell merged away
        ["Barium (soluble compounds as Ba)", "0,5", "—", "—", "—", "—"],          # no CAS → skipped
    ]
    agents = oel_eu.parse_rows(rows, oel_eu.IOELV_TAIL, 1, dt.date(2026, 10, 31))
    got = {(r["cas"], r["kind"], r["value"], r["unit"], r["notation"]) for _, rs in agents for r in rs}
    assert ("108-88-3", "STEL", 100.0, "ppm", "skin") in got and ("8003-34-7", "TWA", 1.0, "mg/m3", None) in got
    assert len(got) == 5


def test_eu_transitional_note_only_while_ahead():
    today = dt.date(2026, 10, 31)
    assert oel_eu.future_note("Limit value 1 ppm (3,25 mg/m 3 ) until 5 April 2024.", today) is None
    note = oel_eu.future_note("Limit value 0,004 mg/m 3 ( 12 ) until 11 July 2027", today)
    assert note.startswith("Transitional:") and "( 12 )" not in note


# ---------- spot checks against the downloaded official texts ----------

def _have(source_id: str, name: str) -> bool:
    return os.path.exists(oel_raw.raw_path(source_id, name))


def _vals(rows, cas):
    return {(r["kind"], r["value"], r["unit"]) for r in rows if r["cas"] == cas}


@pytest.mark.skipif(not _have("kr_moel_notice", "annex1.hwp"), reason="MOEL annex not downloaded (oel_fetch.py)")
def test_spot_kr_moel():
    rows, stats = oel_kr_moel.parse()
    assert stats["errors"] == [] and stats["entries"] > 700
    assert _vals(rows, "71-43-2") == {("TWA", 0.5, "ppm"), ("STEL", 2.5, "ppm")}
    assert _vals(rows, "108-88-3") == {("TWA", 50.0, "ppm"), ("STEL", 150.0, "ppm")}
    assert _vals(rows, "50-00-0") == {("TWA", 0.3, "ppm")}
    assert _vals(rows, "7664-41-7") == {("TWA", 25.0, "ppm"), ("STEL", 35.0, "ppm")}
    assert _vals(rows, "7664-39-3") == {("TWA", 0.5, "ppm"), ("C", 3.0, "ppm")}


@pytest.mark.skipif(not _have("us_osha_z", "1910.1000.xml"), reason="eCFR 1910.1000 not downloaded")
def test_spot_osha():
    z, _ = oel_us_osha.parse_z()
    spec, _ = oel_us_osha.parse_specific()
    rows = z + spec
    assert _vals(rows, "71-43-2") == {("TWA", 1.0, "ppm"), ("STEL", 5.0, "ppm")}           # 1910.1028
    assert _vals(rows, "108-88-3") == {("TWA", 200.0, "ppm"), ("C", 300.0, "ppm")}         # Table Z-2
    assert _vals(rows, "50-00-0") == {("TWA", 0.75, "ppm"), ("STEL", 2.0, "ppm")}          # 1910.1048
    assert _vals(rows, "7664-41-7") == {("TWA", 50.0, "ppm"), ("TWA", 35.0, "mg/m3")}      # Table Z-1
    assert _vals(rows, "7664-39-3") == {("TWA", 3.0, "ppm")}                               # Table Z-2


@pytest.mark.skipif(not _have("us_niosh_npg", "npgd0049.html.gz"), reason="NIOSH pages not downloaded")
def test_spot_niosh():
    def page(n):
        return oel_us_niosh.page_rows(oel_raw.read_file("us_niosh_npg", n).decode("utf-8"))[1]
    assert _vals(page("npgd0049.html.gz"), "71-43-2") == {("TWA", 0.1, "ppm"), ("STEL", 1.0, "ppm"), ("IDLH", 500.0, "ppm")}
    assert _vals(page("npgd0028.html.gz"), "7664-41-7") == {
        ("TWA", 25.0, "ppm"), ("TWA", 18.0, "mg/m3"), ("STEL", 35.0, "ppm"), ("STEL", 27.0, "mg/m3"), ("IDLH", 300.0, "ppm")}


@pytest.mark.skipif(not _have("eu_ioelv", "2006_15.html"), reason="EUR-Lex texts not downloaded")
def test_spot_eu():
    today = dt.date(2026, 10, 31)
    io, _ = oel_eu.parse_ioelv(today)
    bo, _ = oel_eu.parse_boelv(today)
    assert _vals(bo, "71-43-2") == {("TWA", 0.66, "mg/m3"), ("TWA", 0.2, "ppm")}
    assert _vals(io, "108-88-3") == {("TWA", 192.0, "mg/m3"), ("TWA", 50.0, "ppm"), ("STEL", 384.0, "mg/m3"), ("STEL", 100.0, "ppm")}
    assert _vals(bo, "50-00-0") == {("TWA", 0.37, "mg/m3"), ("TWA", 0.3, "ppm"), ("STEL", 0.74, "mg/m3"), ("STEL", 0.6, "ppm")}
    assert _vals(io, "7664-41-7") == {("TWA", 14.0, "mg/m3"), ("TWA", 20.0, "ppm"), ("STEL", 36.0, "mg/m3"), ("STEL", 50.0, "ppm")}
    assert _vals(io, "7664-39-3") == {("TWA", 1.5, "mg/m3"), ("TWA", 1.8, "ppm"), ("STEL", 2.5, "mg/m3"), ("STEL", 3.0, "ppm")}
    # a later list replaces an earlier one: 1,4-dichlorobenzene 2000/39/EC → (EU) 2017/164
    assert ("TWA", 2.0, "ppm") in _vals(io, "106-46-7")


# ---------- static export ----------

def test_export_file_and_summary():
    import oel as export
    sources = {"kr_moel_notice": {"name": "고시", "url": "u", "license": "l", "retrieved_at": "2026-10-31"},
               "eu_ioelv": {"name": "EU", "url": "u2", "license": "l2", "retrieved_at": "2026-10-31"},
               "acgih_tlv": {"name": "ACGIH TLV", "url": "a", "license": "link only", "retrieved_at": ""}}
    rows = [{"j": "EU", "src": "eu_ioelv", "kind": "STEL", "value": 100.0, "unit": "ppm", "note": "skin", "as_of": "2006-02-09"},
            {"j": "KR", "src": "kr_moel_notice", "kind": "STEL", "value": 150.0, "unit": "ppm", "note": "", "as_of": "2020-01-16"},
            {"j": "KR", "src": "kr_moel_notice", "kind": "TWA", "value": 50.0, "unit": "ppm", "note": "", "as_of": "2020-01-16"}]
    f = export.build_file("108-88-3", rows, sources, 92.14, "2026-10-31")
    assert [(r["j"], r["kind"]) for r in f["rows"]] == [("KR", "TWA"), ("KR", "STEL"), ("EU", "STEL")]
    assert list(f["sources"]) == ["kr_moel_notice", "eu_ioelv"] and f["mw"] == 92.14
    assert f["links"] == [{"src": "acgih_tlv", "name": "ACGIH TLV", "url": "a", "license": "link only"}]
    assert all("value" not in link for link in f["links"])
    s = export.build_summary({"108-88-3": f}, sources, "2026-10-31")
    assert s["cas"] == ["108-88-3"] and s["count"] == 1 and s["jurisdictions"] == {"KR": 1, "EU": 1}
    assert s["sources"]["kr_moel_notice"] == {"name": "고시", "cas": 1, "rows": 2}
