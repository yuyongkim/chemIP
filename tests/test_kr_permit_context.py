"""한국 통합허가 사례 연동: 이름 매핑 규칙 · 작은 CSV 로 만든 DB · /api/integrations/kr-permit-context 라우트."""
import csv
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.integrations import kr_permit_context_store as store
from backend.main import app

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import build_kr_permit_context as builder  # noqa: E402
from kr_permit_context_mapping import NameResolver, split_name  # noqa: E402

client = TestClient(app)

LIMITS = [
    # outlet, substance, unit, permit_limit, o2_ref_pct, post_id, decision_no
    ("#A-1", "벤젠", "ppm", "6", "", "10", "0001-01"),
    ("#A-2", "벤젠(C6H6)", "ppm", "4", "", "10", "0001-01"),
    ("#A-1", "벤젠 (‘24.1.1~)", "mg/S㎥", "10", "", "11", ""),
    ("#B-1", "벤젠", "ppm", "10", "", "20", "0002-01"),
    ("#B-1", "크롬화합물(Cr로서)", "㎎/S㎥", "0.4", "", "20", "0002-01"),
    ("#B-1", "황산화물(SO2로서)", "ppm", "20", "12", "20", "0002-01"),
    ("#B-1", "에틸렌", "ppm", "50", "", "20", "0002-01"),          # 'TCE' 이름 조각 — 물질로 세지 않는다
    ("#B-1", "벤젠", "mg/S㎡", "5", "", "20", "0002-01"),          # 단위 불명 — 분포에서 뺀다
    ("#B-1", "새물질X", "ppm", "1", "", "20", "0002-01"),          # 어디에도 없음 — unmapped
]
PERMITS = [
    {"post_id": "10", "is_primary": "True", "post_type": "통합허가", "industry": "유기", "site_name": "가 사업장", "decision_no": "0001-01",
     "permit_date": "2021-05-01", "post_date": "2021-06-01"},
    {"post_id": "11", "is_primary": "True", "post_type": "변경허가", "industry": "유기", "site_name": "가 사업장", "decision_no": "0001-02",
     "permit_date": "2023-02-01", "post_date": "2023-03-01"},
    {"post_id": "20", "is_primary": "True", "post_type": "통합허가", "industry": "발전", "site_name": "나 사업장", "decision_no": "0002-01",
     "permit_date": "", "post_date": "2024-01-10"},
]
DURATIONS = [
    {"post_type": "통합허가", "n": "724", "median": "46.0", "p25": "24.0", "p75": "74.0", "mean": "59.5", "metric": "days_start_to_permit", "grouping": "post_type"},
    {"post_type": "통합허가", "n": "81", "median": "50.0", "p25": "33.0", "p75": "81.0", "mean": "64.6", "metric": "days_start_to_permit",
     "grouping": "post_type+industry", "industry": "유기"},
    {"post_type": "통합허가", "n": "3", "median": "20.0", "p25": "10.0", "p75": "30.0", "mean": "20.0", "metric": "days_start_to_permit",
     "grouping": "post_type+industry", "industry": "도축"},
    {"post_type": "통합허가", "n": "724", "median": "40.0", "p25": "20.0", "p75": "70.0", "mean": "50.0", "metric": "days_receipt_to_permit", "grouping": "post_type"},
]
CLEANSYS = [
    {"examin_year": "2024", "fact_code": "0", "fact_manage_nm": "소계", "hcl_dscamt": "30", "nh3_dscamt": "0"},
    {"examin_year": "2024", "fact_code": "A1", "fact_manage_nm": "가", "hcl_dscamt": "10", "nh3_dscamt": "0"},
    {"examin_year": "2024", "fact_code": "B1", "fact_manage_nm": "나", "hcl_dscamt": "20", "nh3_dscamt": ""},
]


def _write(path: Path, rows: list[dict]) -> None:
    cols = sorted({k for r in rows for k in r})
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)


@pytest.fixture
def context_db(tmp_path, monkeypatch):
    src = tmp_path / "kr"
    src.mkdir()
    _write(src / "kr_permit_limits.csv", [dict(zip(("outlet", "substance", "unit", "permit_limit", "o2_ref_pct", "post_id", "decision_no"), r)) for r in LIMITS])
    _write(src / "kr_permits.csv", PERMITS)
    _write(src / "ieps_posts.csv", [{"post_id": p["post_id"], "post_type": p["post_type"], "site_name": p["site_name"], "post_date": p["post_date"]} for p in PERMITS])
    _write(src / "kr_duration_summary.csv", DURATIONS)
    _write(src / "cleansys_annual.csv", CLEANSYS)
    out = tmp_path / "kr_permit_context.db"
    resolver = NameResolver(terminology_db=tmp_path / "missing.db")
    report = builder.build(src=src, out=out, resolver=resolver)
    monkeypatch.setattr(store, "KR_PERMIT_CONTEXT_DB", out)
    return report


def test_split_name_strips_qualifiers_but_keeps_meaningful_parens() -> None:
    assert split_name("크롬화합물(Cr로서)")[0] == "크롬화합물"
    assert split_name("황산화물(SO₂)")[0] == "황산화물"
    assert split_name("탄화수소(‘26.1.1~)")[0] == "탄화수소"
    assert split_name("아세트알데히드주3)")[0] == "아세트알데히드"
    assert split_name("니켈 및 그 화합물")[0] == "니켈및그화합물"
    assert split_name("미세먼지(PM-10)")[0] == "미세먼지(PM-10)"
    assert split_name("크롬화합물(Cr6+)")[0] == "크롬화합물(Cr6+)"


def test_resolver_uses_reviewed_table_and_never_guesses(tmp_path) -> None:
    r = NameResolver(terminology_db=tmp_path / "missing.db")
    assert (r.resolve("벤젠(Benzene)").status, r.resolve("벤젠(Benzene)").cas) == ("cas", "71-43-2")
    assert r.resolve("폼알데하이드").cas == "50-00-0"
    assert (r.resolve("크롬").status, r.resolve("크롬").group) == ("group", "크롬 및 그 화합물")
    assert r.resolve("에틸렌").status == "fragment"
    assert r.resolve("(SO2로서)").status == "fragment"
    assert r.resolve("새물질X").status == "unmapped"
    assert r.unit("㎎/S㎥") == r.unit("mg/Sm³") == "mg/Sm3"
    assert r.unit("mg/S㎡") == ""


def test_build_coverage_and_route_payload(context_db) -> None:
    assert context_db["dropped"] == {"unit_unclear": 1}
    assert context_db["unmapped"] == ["새물질X"]
    assert context_db["names_by_status"]["fragment"] == 1

    body = client.get("/api/integrations/kr-permit-context/71-43-2").json()
    assert body["available"] is True
    benzene = body["entries"][0]
    assert benzene["relation"] == "direct" and benzene["label"] == "벤젠"
    assert benzene["n_sites"] == 2 and benzene["n_rows"] == 4
    assert benzene["primary"]["unit"] == "ppm" and benzene["primary"]["median"] == 6.0
    assert {d["unit"] for d in benzene["distributions"]} == {"ppm", "mg/Sm3"}      # 단위는 섞지 않는다
    assert benzene["latest_year"] == "2023"                                      # 허가일 없는 게시물은 연도에서 뺀다
    assert benzene["samples"][0]["url"] == "https://ieps.nier.go.kr/web/board/7/20/?pMENUMST_ID=176"
    assert body["durations"]["overall"][0]["median"] == 46.0
    reliable = {d["industry"]: d["reliable"] for d in body["durations"]["by_industry"]}
    assert reliable == {"유기": True, "도축": False}
    assert body["attribution"]["ieps_board_url"].startswith("https://ieps.nier.go.kr")


def test_groups_link_by_family_and_related_and_emissions_skip_subtotal(context_db) -> None:
    chromium = client.get("/api/integrations/kr-permit-context/7440-47-3").json()
    assert [(e["label"], e["relation"]) for e in chromium["entries"]] == [("크롬 및 그 화합물", "family_parent")]
    so2 = client.get("/api/integrations/kr-permit-context/7446-09-5").json()
    assert so2["entries"][0]["relation"] == "related" and so2["entries"][0]["primary"]["o2_ref"] == "12"
    hcl = client.get("/api/integrations/kr-permit-context/7647-01-0").json()
    assert hcl["entries"] == []
    assert hcl["emissions"][0]["label"] == "염화수소(HCl)"
    assert hcl["emissions"][0]["years"] == [{"year": "2024", "n_sites": 2, "total_kg": 30.0}]


def test_missing_db_and_bad_cas(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(store, "KR_PERMIT_CONTEXT_DB", tmp_path / "none.db")
    assert client.get("/api/integrations/kr-permit-context/71-43-2").json()["available"] is False
    assert client.get("/api/integrations/kr-permit-context/not-a-cas").status_code == 400
