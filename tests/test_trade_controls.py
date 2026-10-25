"""물질별 수출입 규제(backend/core/trade_controls)와 /api/regulations/trade-controls 라우트 테스트.

자료 파일은 tmp_path 에 만든 가짜 파일을 쓴다. 실제 backend/data/trade_controls/ 는 건드리지 않는다.
"""
import json
import os
import sqlite3

import pytest
from fastapi.testclient import TestClient

from backend.api.routes import regulations
from backend.config.settings import settings
from backend.core.trade_controls import assemble, hs_codes, lists, paths, rules, substance
from backend.main import app

client = TestClient(app)

BENZENE = "71-43-2"

KR_RULES = {
    "jurisdiction": "KR",
    "rules": [
        {"rule_id": "KR-ACC-IMPORT", "when": {"ncis_category": "사고대비물질"}, "direction": "import",
         "obligation": "사고대비물질 수입 시 확인", "who": "수입자", "when_required": "통관 전", "agency": "환경부",
         "threshold": "", "legal_basis": "화학물질관리법 제x조", "source_url": "https://law.example/kr",
         "verified_text": "원문 발췌", "customs_confirmation": True, "note": ""},
        {"rule_id": "KR-HAZ-BOTH", "when": {"ncis_category": ["인체등유해성물질", "제한물질"]}, "direction": "both",
         "obligation": "유해성 정보 제공", "legal_basis": "화학물질관리법", "source_url": "", "customs_confirmation": False},
        {"rule_id": "KR-PIC-EXPORT", "when": {"list": "ROTTERDAM_PIC"}, "direction": "export",
         "obligation": "PIC 수출 승인", "legal_basis": "화학물질관리법 제21조", "customs_confirmation": True},
        {"rule_id": "KR-CWC-EXPORT", "when": {"list": "CWC_SCHEDULES"}, "direction": "export",
         "obligation": "CWC 수출 허가", "legal_basis": "화학무기금지법"},
        {"rule_id": "KR-UNKNOWN-KEY", "when": {"hs_prefix": "2902"}, "direction": "both", "obligation": "평가 불가"},
    ],
    "unverified": [
        {"rule_id": "KR-UNV-1", "when": {"ncis_category": "사고대비물질"}, "direction": "both", "obligation": "확인 중"},
    ],
}

CWC = {
    "list_id": "CWC_SCHEDULES", "title": "화학무기협약 표", "jurisdiction": "INTL", "directions": ["export", "import"],
    "authority": "산업통상자원부", "kr_obligation": "수출입 허가", "legal_basis": "화학무기금지법", "source_url": "https://opcw.example",
    "source_version": "2024", "retrieved": "2026-10-24",
    "entries": [{"cas": BENZENE, "name": "Benzene (fixture)", "category": "Schedule 3", "detail": "가짜 항목"}],
    "family_entries": [],
}

PRECURSORS = {
    "list_id": "DRUG_PRECURSORS", "title": "마약류 원료물질", "jurisdiction": "KR", "directions": ["import"],
    "entries": [{"cas": "64-17-5", "name": "Ethanol", "category": "", "detail": ""}],
    "family_entries": [{"family": "벤젠 계열(가짜)", "cas_list": [BENZENE]}],
}


def _write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def _make_hs_db(path):
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE cas_hs(cas TEXT, hs6 TEXT, cn8 TEXT, hsk10 TEXT, description TEXT, source TEXT);
        CREATE TABLE hs6_heading(hs6 TEXT, title_en TEXT, title_ko TEXT);
        CREATE TABLE meta(key TEXT, value TEXT);
        INSERT INTO cas_hs VALUES ('71-43-2', '290220', '29022000', '2902200000', 'Benzene', 'fixture');
        INSERT INTO hs6_heading VALUES ('290220', 'Benzene', '벤젠');
        INSERT INTO meta VALUES ('ecics_version', 'fixture HS');
        INSERT INTO meta VALUES ('ecics_raw_file', 'S:\private\raw.zip');
        """
    )
    conn.commit()
    conn.close()


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    d = tmp_path / "trade_controls"
    d.mkdir()
    monkeypatch.setattr(paths, "DATA_DIR", d)
    return d


@pytest.fixture
def full_data(data_dir):
    _write_json(data_dir / "kr_rules.json", KR_RULES)
    _write_json(data_dir / "cwc_schedules.json", CWC)
    _write_json(data_dir / "drug_precursors.json", PRECURSORS)
    _make_hs_db(data_dir / "hs_codes.sqlite")
    return data_dir


@pytest.fixture
def fake_substance(monkeypatch):
    monkeypatch.setattr(assemble, "ncis_record", lambda cas: {
        "name_ko": "벤젠", "name_en": "Benzene",
        "classifications": [{"category": "사고대비물질"}, {"category": substance.base_category("인체등유해성물질 세분류")}],
    })
    monkeypatch.setattr(assemble, "intl_listings", lambda cas: {"cas_no": cas, "count": 3, "jurisdictions": {
        "VN": [{"regulation": "VN_DECREE24_APP_III", "list": "VN 부록 III", "detail": "특별 통제", "source": "VN", "name": "Benzene"}],
        "US": [{"regulation": "EPCRA_313", "list": "EPCRA 313", "detail": "", "source": "EPA", "name": "Benzene"}],
        "INTL": [{"regulation": "ROTTERDAM_PIC", "list": "로테르담 PIC", "detail": "", "source": "PIC", "name": "Benzene"}],
    }})


# ── store ─────────────────────────────────────────────

def test_missing_files_report_missing_and_empty_sections(data_dir, fake_substance) -> None:
    r = assemble.build_trade_controls(BENZENE, "import")
    assert set(r["sources_status"].values()) == {"missing"}
    assert r["kr_obligations"] == [] and r["controlled_lists"] == [] and r["hs"] == []
    assert r["destination"] is None
    assert "error" not in r


def test_list_memberships_entries_families_and_direction(full_data, fake_substance) -> None:
    found = {m["list_id"]: m for m in lists.list_memberships(BENZENE)}
    assert set(found) == {"CWC_SCHEDULES", "DRUG_PRECURSORS"}
    assert found["CWC_SCHEDULES"]["entries"][0]["category"] == "Schedule 3"
    assert found["DRUG_PRECURSORS"]["family_entries"][0]["family"] == "벤젠 계열(가짜)"

    exp = assemble.build_trade_controls(BENZENE, "export")
    assert [m["list_id"] for m in exp["controlled_lists"]] == ["CWC_SCHEDULES"]  # 원료물질 목록은 import 전용
    # 방향과 무관한 요약에는 두 목록이 모두 방향과 함께 남는다
    assert {m["list_id"]: m["directions"] for m in exp["controlled_lists_any"]}.keys() == {"CWC_SCHEDULES", "DRUG_PRECURSORS"}


def test_list_cache_follows_file_mtime(data_dir) -> None:
    f = data_dir / "cwc_schedules.json"
    _write_json(f, {**CWC, "entries": []})
    os.utime(f, ns=(1_000_000_000, 1_000_000_000))
    assert lists.list_memberships(BENZENE) == []
    _write_json(f, CWC)
    os.utime(f, ns=(2_000_000_000, 2_000_000_000))
    assert [m["list_id"] for m in lists.list_memberships(BENZENE)] == ["CWC_SCHEDULES"]


def test_invalid_json_is_reported(data_dir, fake_substance) -> None:
    (data_dir / "kr_rules.json").write_text("{not json", encoding="utf-8")
    r = assemble.build_trade_controls(BENZENE, "import")
    assert r["sources_status"]["kr_rules.json"] == "invalid"
    assert r["kr_obligations"] == []


def test_hs_lookup_joins_heading_and_meta(full_data) -> None:
    rows = hs_codes.lookup(BENZENE)
    assert rows == [{"cas": BENZENE, "hs6": "290220", "cn8": "29022000", "hsk10": "2902200000",
                     "description": "Benzene", "source": "fixture", "title_en": "Benzene", "title_ko": "벤젠"}]
    assert hs_codes.meta() == {"ecics_version": "fixture HS"}  # 내부 경로 키는 내보내지 않는다
    assert hs_codes.lookup("50-00-0") == []


def test_rules_evaluate_direction_category_list_and_unknown_keys() -> None:
    cats = {"사고대비물질", "인체등유해성물질"}
    imp = rules.evaluate(KR_RULES["rules"], categories=cats, lists={"ROTTERDAM_PIC"}, direction="import")
    assert [r["rule_id"] for r in imp] == ["KR-ACC-IMPORT", "KR-HAZ-BOTH"]
    assert imp[0]["customs_confirmation"] is True
    assert imp[0]["citation"] == {"legal_basis": "화학물질관리법 제x조", "source_url": "https://law.example/kr",
                                  "verified_text": "원문 발췌", "supporting": []}
    assert imp[0]["matched_by"] == {"ncis_category": ["사고대비물질"]}

    exp = rules.evaluate(KR_RULES["rules"], categories=cats, lists={"ROTTERDAM_PIC"}, direction="export")
    assert [r["rule_id"] for r in exp] == ["KR-HAZ-BOTH", "KR-PIC-EXPORT"]

    both = rules.evaluate([{"rule_id": "AND", "when": {"ncis_category": "사고대비물질", "list": "X"}, "direction": "both"}],
                          categories=cats, lists=set(), direction="import")
    assert both == []


def test_ncis_record_reads_terminology_db(tmp_path, monkeypatch) -> None:
    db = tmp_path / "terminology.db"
    conn = sqlite3.connect(db)
    conn.execute("CREATE TABLE ncis_substance (cas_no TEXT PRIMARY KEY, name_kor TEXT, name_eng TEXT, classifications TEXT)")
    conn.execute("INSERT INTO ncis_substance VALUES (?, ?, ?, ?)", (BENZENE, "벤젠", "Benzene ", json.dumps([
        {"sbstnClsfTypeNm": "사고대비물질", "unqNo": "5", "contInfo": "85% 이상", "excpInfo": "", "ancmntInfo": ""},
        {"sbstnClsfTypeNm": "제한물질 세분류", "unqNo": "06-5-1", "contInfo": "", "excpInfo": "", "ancmntInfo": ""},
    ], ensure_ascii=False)))
    conn.commit()
    conn.close()
    monkeypatch.setattr(settings, "TERMINOLOGY_DB_PATH", str(db))

    rec = substance.ncis_record(BENZENE)
    assert rec["name_en"] == "Benzene"
    assert [c["category"] for c in rec["classifications"]] == ["사고대비물질", "제한물질"]
    assert substance.ncis_record("50-00-0") == {}


def test_assemble_export_with_country_builds_destination(full_data, fake_substance) -> None:
    calls = []

    def kotra(country, keyword):
        calls.append((country, keyword))
        return {"status": "success", "data": [{"hsCode": "290220", "productName": "벤젠", "regulation": "수입허가"}], "total": 1}

    r = assemble.build_trade_controls(BENZENE, "export", "vn", kotra_fetch=kotra)
    assert r["country"] == "VN"
    ids = [o["rule_id"] for o in r["kr_obligations"]]
    assert ids == ["KR-HAZ-BOTH", "KR-PIC-EXPORT", "KR-CWC-EXPORT"]  # CWC 는 통제 목록 등재로 연결
    assert [x["regulation"] for x in r["destination"]["listings"]] == ["VN_DECREE24_APP_III", "ROTTERDAM_PIC"]
    assert r["destination"]["role"] == "destination_import"
    assert r["destination"]["kotra"]["items"][0]["productName"] == "벤젠"
    assert calls == [("VN", "벤젠")]
    assert r["hs"][0]["hs6"] == "290220"
    assert [u["rule_id"] for u in r["kr_unverified"]] == ["KR-UNV-1"]


def test_assemble_import_skips_kotra_and_validates_input(full_data, fake_substance) -> None:
    def boom(*_):
        raise AssertionError("수입 방향에서는 KOTRA 를 부르지 않는다")

    r = assemble.build_trade_controls(BENZENE, "import", "US", kotra_fetch=boom)
    assert r["destination"]["role"] == "origin" and r["destination"]["kotra"] is None
    assert assemble.build_trade_controls("not-a-cas", "import")["error"] == "invalid_cas"
    assert assemble.build_trade_controls(BENZENE, "transit")["error"] == "invalid_direction"


def test_kotra_failure_does_not_break_response(full_data, fake_substance) -> None:
    r = assemble.build_trade_controls(BENZENE, "export", "US", kotra_fetch=lambda c, k: {"status": "error", "message": "key missing"})
    assert r["destination"]["kotra"]["available"] is False
    assert r["destination"]["kotra"]["error"] == "key missing"
    assert r["kr_obligations"]


# ── route ─────────────────────────────────────────────

def test_route_trade_controls(full_data, fake_substance, monkeypatch) -> None:
    monkeypatch.setattr(regulations, "_kotra_import_restrictions",
                        lambda c, k: {"status": "success", "data": [], "total": 0})
    resp = client.get(f"/api/regulations/trade-controls/{BENZENE}", params={"direction": "export", "country": "US"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["cas"] == BENZENE and body["direction"] == "export" and body["country"] == "US"
    for key in ("hs", "kr_obligations", "controlled_lists", "destination", "sources_status"):
        assert key in body
    assert body["destination"]["listings"][0]["regulation"] == "EPCRA_313"
    assert body["sources_status"]["kr_rules.json"] == "present"
    assert body["sources_status"]["australia_group.json"] == "missing"


def test_route_rejects_bad_direction(data_dir, fake_substance) -> None:
    resp = client.get(f"/api/regulations/trade-controls/{BENZENE}", params={"direction": "transit"})
    assert resp.status_code == 422


# ── 국내 법령별 목록 · 인허가 (방향 무관) ────────────────

KR_AIR = {
    "list_id": "KR_CAA_HAP", "law": "대기환경보전법", "title": "특정대기유해물질", "jurisdiction": "KR",
    "legal_basis": "대기환경보전법 시행규칙 별표 2", "source_url": "https://law.example/air", "amended_on": "2025-01-01",
    "retrieved": "2026-10-24", "obligations": ["배출시설 설치허가"],
    "entries": [{"cas": BENZENE, "name_ko": "벤젠", "name_en": "Benzene", "detail": "", "match_method": "cas"}],
    "family_entries": [],
}
KR_AIR2 = {**KR_AIR, "list_id": "KR_CAA_VOC", "title": "휘발성유기화합물"}
KR_OSHA = {
    "list_id": "KR_OSHA_SPECIAL_HEALTH", "law": "산업안전보건법", "title": "특수건강진단 대상 유해인자",
    "entries": [], "family_entries": [{"family": "방향족 탄화수소", "cas_list": [BENZENE]}],
}
PERMITS_ENV = {"permits": [
    {"trigger": {"list_id": "KR_CAA_HAP", "condition": "배출시설 설치 시"}, "permit": "대기배출시설 설치허가",
     "authority": "시·도", "legal_basis": "대기환경보전법 제23조", "source_url": "https://law.example/23", "verified_text": "발췌"},
    {"trigger": [{"list_id": "NOT_LISTED"}, {"ncis_category": "사고대비물질 세분류"}], "obligation": "위해관리계획서 제출",
     "authority": "환경부", "legal_basis": "화학물질관리법 제41조"},
    {"trigger": {"list_id": "NOT_LISTED"}, "permit": "해당 없음"},
]}


def test_kr_lists_folder_loaded_generically_and_grouped_by_law(data_dir, fake_substance) -> None:
    folder = data_dir / "kr_lists"
    folder.mkdir()
    _write_json(folder / "air_hap.json", KR_AIR)
    _write_json(folder / "air_voc.json", KR_AIR2)
    _write_json(folder / "osha_health.json", KR_OSHA)
    (folder / "broken.json").write_text("[", encoding="utf-8")

    r = assemble.build_trade_controls(BENZENE, "import")
    laws = {g["law"]: [m["list_id"] for m in g["lists"]] for g in r["kr_law_lists"]}
    assert laws == {"대기환경보전법": ["KR_CAA_HAP", "KR_CAA_VOC"], "산업안전보건법": ["KR_OSHA_SPECIAL_HEALTH"]}
    assert r["sources_status"]["kr_lists/"] == "present"
    assert r["sources_status"]["kr_lists/broken.json"] == "invalid"
    assert "KR_CAA_HAP" in r["substance"]["list_codes"]
    # 수출 방향에서도 똑같이 나온다
    assert assemble.build_trade_controls(BENZENE, "export")["kr_law_lists"] == r["kr_law_lists"]


def test_permits_match_by_list_or_category(data_dir, fake_substance) -> None:
    (data_dir / "kr_lists").mkdir()
    _write_json(data_dir / "kr_lists" / "air.json", KR_AIR)
    _write_json(data_dir / "kr_permits_env.json", PERMITS_ENV)
    _write_json(data_dir / "kr_permits_safety.json", [])

    r = assemble.build_trade_controls(BENZENE, "export")
    got = [(p.get("permit") or p.get("obligation")) for p in r["kr_permits"]]
    assert got == ["대기배출시설 설치허가", "위해관리계획서 제출"]
    first = r["kr_permits"][0]
    assert first["matched_by"] == [{"list_id": ["KR_CAA_HAP"], "condition": "배출시설 설치 시"}]
    assert first["citation"]["legal_basis"] == "대기환경보전법 제23조"
    assert r["kr_permits"][1]["matched_by"] == [{"ncis_category": ["사고대비물질"]}]
    assert r["sources_status"]["kr_permits_env.json"] == "present"
    assert r["sources_status"]["kr_permits_safety.json"] == "present"


def test_permit_file_with_unknown_shape_is_invalid(data_dir, fake_substance) -> None:
    _write_json(data_dir / "kr_permits_env.json", {"something": 1})
    r = assemble.build_trade_controls(BENZENE, "import")
    assert r["sources_status"]["kr_permits_env.json"] == "invalid"
    assert r["kr_permits"] == []


def test_rules_any_substance_any_of_and_inactive() -> None:
    cats = {"사고대비물질"}
    sample = [
        {"rule_id": "ALL", "when": {"any_substance": True}, "direction": "import",
         "supporting_citations": [{"article": "시행규칙 제2조", "source_url": "https://law.example/2"}]},
        {"rule_id": "OR", "when": {"any_of": [{"list": "ROTTERDAM_PIC"}, {"ncis_category": "사고대비물질"}]}, "direction": "both"},
        {"rule_id": "OR-MISS", "when": {"any_of": [{"list": "MONTREAL_ODS"}]}, "direction": "both"},
        {"rule_id": "OFF", "when": {"any_substance": True}, "direction": "both", "active": False},
    ]
    got = rules.evaluate(sample, categories=cats, lists={"ROTTERDAM_PIC"}, direction="import")
    assert [r["rule_id"] for r in got] == ["ALL", "OR"]
    assert got[0]["citation"]["supporting"][0]["article"] == "시행규칙 제2조"
    assert got[1]["matched_by"] == {"list": ["ROTTERDAM_PIC"], "ncis_category": ["사고대비물질"]}


def test_permit_trigger_accepts_list_ids_key() -> None:
    from backend.core.trade_controls.permits import evaluate
    items = [{"trigger": {"list_ids": ["KR_CLEAN_AIR_SPECIFIC_HAP"], "condition": "기준농도 이상"}, "permit": "대기배출시설 설치허가"}]
    out = evaluate(items, lists={"KR_CLEAN_AIR_SPECIFIC_HAP"}, categories=set())
    assert len(out) == 1 and out[0]["matched_by"][0]["list_id"] == ["KR_CLEAN_AIR_SPECIFIC_HAP"]


# ── 상대국 법령별 목록 (intl_lists/) ─────────────────────

EU_SVHC = {
    "list_id": "EU_REACH_SVHC_CANDIDATE", "jurisdiction": "EU", "law": "REACH", "title": "SVHC 후보물질",
    "directions": ["import"], "obligation_for_kr_exporter": "0.1% 초과 시 정보 전달", "legal_basis": "REACH Art. 33",
    "source_url": "https://echa.example", "source_version": "2026", "retrieved": "2026-10-24", "license": "ECHA",
    "entries": [{"cas": BENZENE, "name": "Benzene (fixture)", "detail": "가짜"}], "family_entries": [],
}
EU_PIC = {**EU_SVHC, "list_id": "EU_PIC_ANNEX_I_PART1", "title": "EU PIC 수출통보", "directions": ["export"]}
CN_HAZ = {**EU_SVHC, "list_id": "CN_HAZCHEM_CATALOG", "jurisdiction": "CN", "title": "危险化学品目录", "directions": ["import", "export"]}
US_INV = {**EU_SVHC, "list_id": "US_TSCA_INVENTORY", "jurisdiction": "US", "title": "TSCA Inventory",
          "absence_note": "미등재: PMN 필요", "entries": [{"cas": "64-17-5", "name": "Ethanol", "detail": "ACTIVE"}]}


@pytest.fixture
def intl_dir(data_dir):
    folder = data_dir / "intl_lists"
    folder.mkdir()
    for name, data in (("eu_svhc.json", EU_SVHC), ("eu_pic.json", EU_PIC), ("cn_haz.json", CN_HAZ), ("us_inv.json", US_INV)):
        _write_json(folder / name, data)
    return folder


def test_intl_lists_follow_country_and_counterpart_direction(intl_dir, fake_substance) -> None:
    # 한국 수출 → 상대국 '수입' 목록
    r = assemble.build_trade_controls(BENZENE, "export", "EU")
    assert [m["list_id"] for m in r["destination"]["intl_lists"]] == ["EU_REACH_SVHC_CANDIDATE"]
    m = r["destination"]["intl_lists"][0]
    assert m["obligation_for_kr_exporter"] == "0.1% 초과 시 정보 전달" and m["entries"][0]["detail"] == "가짜"
    assert "_by_cas" not in m
    # 한국 수입 → 상대국 '수출' 목록
    r = assemble.build_trade_controls(BENZENE, "import", "EU")
    assert [m["list_id"] for m in r["destination"]["intl_lists"]] == ["EU_PIC_ANNEX_I_PART1"]
    # 블록 회원국은 블록 목록도 본다(NL -> EU)
    assert [m["list_id"] for m in assemble.build_trade_controls(BENZENE, "export", "NL")["destination"]["intl_lists"]] == ["EU_REACH_SVHC_CANDIDATE"]
    # 양방향 목록
    assert [m["list_id"] for m in assemble.build_trade_controls(BENZENE, "import", "CN")["destination"]["intl_lists"]] == ["CN_HAZCHEM_CATALOG"]
    assert r["intl_lists"] == []  # 상대국을 고르면 전체 목록은 비운다
    assert r["sources_status"]["intl_lists/"] == "present"


def test_intl_lists_without_country_show_all_jurisdictions(intl_dir, fake_substance) -> None:
    r = assemble.build_trade_controls(BENZENE, "export")
    assert r["destination"] is None
    assert [m["list_id"] for m in r["intl_lists"]] == ["CN_HAZCHEM_CATALOG", "EU_REACH_SVHC_CANDIDATE"]
    assert not any(m.get("absent") for m in r["intl_lists"])  # 미등재 안내는 상대국을 골랐을 때만


def test_intl_absence_note_when_not_listed(intl_dir, fake_substance) -> None:
    r = assemble.build_trade_controls(BENZENE, "export", "US")
    (m,) = r["destination"]["intl_lists"]
    assert m["list_id"] == "US_TSCA_INVENTORY" and m["absent"] is True and m["absence_note"] == "미등재: PMN 필요"
    r = assemble.build_trade_controls("64-17-5", "export", "US")
    (m,) = r["destination"]["intl_lists"]
    assert not m.get("absent") and m["entries"][0]["detail"] == "ACTIVE"


def test_intl_lists_broken_file_is_invalid_and_index_follows_mtime(intl_dir, fake_substance) -> None:
    (intl_dir / "broken.json").write_text("{", encoding="utf-8")
    r = assemble.build_trade_controls(BENZENE, "export", "EU")
    assert r["sources_status"]["intl_lists/broken.json"] == "invalid"
    path = intl_dir / "eu_svhc.json"
    _write_json(path, {**EU_SVHC, "entries": []})
    os.utime(path, ns=(path.stat().st_atime_ns, path.stat().st_mtime_ns + 10_000_000))
    assert assemble.build_trade_controls(BENZENE, "export", "EU")["destination"]["intl_lists"] == []


def test_catalog_counts_only_real_lists(data_dir) -> None:
    from backend.core.trade_controls.catalog import catalog
    folder = data_dir / "kr_lists"
    folder.mkdir(exist_ok=True)
    (folder / "_index.json").write_text(json.dumps({"lists": []}), encoding="utf-8")
    (folder / "KR_X_unverified.json").write_text(json.dumps({"list_id": "KR_X_unverified", "entries": []}), encoding="utf-8")
    (folder / "KR_REAL.json").write_text(json.dumps({"list_id": "KR_REAL", "law": "대기환경보전법", "entries": []}), encoding="utf-8")
    result = catalog()
    assert result["kr_lists"] == 1 and result["kr_laws"] == 1
