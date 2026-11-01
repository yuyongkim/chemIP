"""Safety tools (services 7-8): GHS parsers, reactive classes, Annex VI reader, pair rules, the generated frontend rules file
and the static file bodies. The parity cases in tests/fixtures/safety_parse_cases.json are shared with
frontend/scripts/tests/test_safety_tools.cjs, so the Python and browser rules cannot drift apart."""
import json
import os
import sqlite3
import subprocess
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts", "portal_build"))
sys.path.insert(0, os.path.join(ROOT, "scripts", "static_export"))

import annex6  # noqa: E402
import ghs_parse  # noqa: E402
import portal_db  # noqa: E402
import reactive_class  # noqa: E402
import reactive_groups  # noqa: E402
import safety_rules  # noqa: E402

FIX = json.load(open(os.path.join(ROOT, "tests", "fixtures", "safety_parse_cases.json"), encoding="utf-8"))


# ---- parity cases (same answers as the browser) ----
@pytest.mark.parametrize("case", FIX["kosha"])
def test_kosha_parity(case):
    assert ghs_parse.kosha_classification(case["in"]) == case["out"]


@pytest.mark.parametrize("case", FIX["clp"])
def test_clp_parity(case):
    assert ghs_parse.clp_classification(case["codes"], case["h"]) == case["out"]


@pytest.mark.parametrize("case", FIX["scl"])
def test_scl_parity(case):
    assert ghs_parse.scl_column(case["in"]) == case["out"]


@pytest.mark.parametrize("case", FIX["m_factors"])
def test_m_factor_parity(case):
    assert ghs_parse.m_factors(case["hazards"], case["m"]) == case["out"]


@pytest.mark.parametrize("case", FIX["reactive"])
def test_reactive_parity(case):
    got = reactive_groups.substance_classes(hazards=case["hazards"], names=case["names"], ph=case["ph"],
                                            s14_n06=case["s14"], s15_o06=case["s15"], euh=case["euh"])
    assert [list(x) for x in got] == case["out"]


# ---- single parsers ----
def test_kosha_categories():
    assert ghs_parse.kosha_line("피부 과민성 : 구분1(1A/1B)") == "skin_sens:1"
    assert ghs_parse.kosha_line("심한 눈 손상성/눈 자극성 : 구분2B") == "eye:2"
    assert ghs_parse.kosha_line("특정표적장기 독성(1회 노출) : 구분3(마취영향)") == "stot_se:3N"
    assert ghs_parse.kosha_line("자료없음") is None
    assert ghs_parse.kosha_line("알 수 없는 분류 : 구분1") is None


def test_clp_acute_route_from_h_code():
    assert ghs_parse.clp_code("Acute Tox. 3 *", "H311") == "acute_dermal:3*"
    assert ghs_parse.clp_code("Acute Tox. 3", "") is None  # route unknown -> not guessed
    assert ghs_parse.clp_code("STOT SE 3", "H335") == "stot_se:3R"


def test_ph_and_acid_base():
    assert reactive_groups.ph_value("14 (20℃ 농도 50g/L)") == 14
    assert reactive_groups.ph_value("자료없음") is None
    assert reactive_groups.acid_or_base(["황산"], None) == ("AC", "name")
    assert reactive_groups.acid_or_base(["과산화수소"], None) is None
    assert reactive_groups.acid_or_base(["x"], 1.5) == ("AC", "ph:1.5")


def test_kr_item_keywords():
    assert reactive_groups.kr_classes("제2석유류 비수용성액체 (1000리터)") == [("4", "s15:제2석유류 비수용성액체 (1000리터)")]
    assert reactive_groups.kr_classes("해당없음(비위험물)") == []
    assert reactive_groups.kr_classes("질산염류 (300kg)")[0][0] == "1"


# ---- rules ----
def test_matrices_symmetric():
    rules = safety_rules.compat()
    for system in ("kr", "un"):
        m = rules["systems"][system]["matrix"]
        n = len(rules["systems"][system]["matrix_order"])
        assert len(m) == n and all(len(row) == n for row in m)
        assert all(m[i][j] == m[j][i] for i in range(n) for j in range(n))


def test_kr_mixing_rule_values():
    # 시행규칙 별표19 부표2: 1-6, 2-4, 2-5, 3-4, 4-5 만 혼재 가능
    rules = safety_rules.compat()["systems"]["kr"]
    ok = {(a, b) for i, a in enumerate(rules["matrix_order"]) for j, b in enumerate(rules["matrix_order"]) if i < j and rules["matrix"][i][j] == "o"}
    assert ok == {("1", "6"), ("2", "4"), ("2", "5"), ("3", "4"), ("4", "5")}


def test_pair_rule_rows():
    rows = reactive_class.pair_rule_rows()
    kr = [r for r in rows if r[0] == "kr"]
    assert len(kr) == 15  # 6 classes, unordered pairs without the diagonal
    assert all(r[3] in ("x", "c", "o") for r in rows)
    assert ("ghs", "AC", "BA", "x") in [r[:4] for r in rows]


def test_generated_frontend_rules_up_to_date():
    script = os.path.join(ROOT, "scripts", "portal_build", "gen_frontend_rules.py")
    assert subprocess.run([sys.executable, "-B", script, "--check"]).returncode == 0, "run gen_frontend_rules.py"


# ---- Annex VI table (skipped when the xlsx is not on this machine) ----
needs_xlsx = pytest.mark.skipif(not os.path.exists(annex6.ANNEX6_XLSX), reason="Annex VI xlsx not present")


@needs_xlsx
def test_annex6_entries():
    res = annex6.read_annex6()
    assert res["atp_max"] >= "ATP21" and len(res["entries"]) > 4000
    naoh = res["entries"]["1310-73-2"][0]
    assert naoh["hazards"] == ["skin:1A"]
    assert ["skin", "1B", 2.0] in naoh["scl"] and ["eye", "2", 0.5] in naoh["scl"]
    nitric = res["entries"]["7697-37-2"]
    assert len(nitric) == 2  # [C > 70 %] and [C <= 70 %]
    assert any(e["ate"].get("vapour") == 2.65 for e in nitric)


@needs_xlsx
def test_annex6_m_factors_present():
    res = annex6.read_annex6()
    with_m = [e for es in res["entries"].values() for e in es if e["m"]]
    assert len(with_m) > 300
    assert all(set(e["m"]) <= {"acute", "chronic"} for e in with_m)


# ---- static bodies from a small DB ----
def test_reactive_class_body(tmp_path):
    import safety_tools

    db = str(tmp_path / "portal.db")
    conn = portal_db.connect(db)
    portal_db.put_sources(conn, {"kosha_msds_s15": {"name": "KOSHA MSDS §15", "url": "u", "license": "l", "retrieved_at": "2026-10-31"}})
    portal_db.replace_rows(conn, "reactive_class", ["kosha_msds_s15"], ["cas", "system", "class_code", "basis", "source_id"],
                           [("7697-37-2", "kr", "6", "s15:6류 질산", "kosha_msds_s15")])
    conn.close()
    body = safety_tools.reactive_class_body(db)
    assert body["classes"] == {"7697-37-2": [["kr", "6", "s15:6류 질산", 0]]}
    assert body["source_ids"] == ["kosha_msds_s15"] and body["sources"]["kosha_msds_s15"]["license"] == "l"
    sqlite3.connect(db).close()
