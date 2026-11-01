"""PRTR 취급 사업장 지도(포털 서비스 13): 주소 → 시도·시군구, 지역 집계, 정적 파일 내보내기, PC 라우트 /api/prtr."""
import gzip
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.api.routes import prtr_map as route
from backend.core import prtr_map
from backend.core.prtr_regions import SIDO, parse_address, region_table, sido_iso
from backend.main import app

ROOT = Path(__file__).resolve().parents[1]
client = TestClient(app)

SCHEMA = """
CREATE TABLE materials (year INTEGER, material_id TEXT, cas_no TEXT, cas_key TEXT, name_ko TEXT, name_en TEXT,
  company_count INTEGER, air_release_kg REAL, water_release_kg REAL, soil_release_kg REAL, total_release_kg REAL,
  self_landfill_kg REAL, wastewater_transfer_kg REAL, waste_transfer_kg REAL, total_transfer_kg REAL);
CREATE TABLE facility_releases (year INTEGER, material_id TEXT, row_index INTEGER, cas_no TEXT, cas_key TEXT,
  chemical_name TEXT, company_name TEXT, address TEXT, air_release_kg REAL, water_release_kg REAL, soil_release_kg REAL,
  total_release_kg REAL, self_landfill_kg REAL, wastewater_transfer_kg REAL, waste_transfer_kg REAL, total_transfer_kg REAL);
"""
FACILITIES = [  # (material_id, row, company, address, release, landfill, transfer)
    ("147", 1, "A공장", "경기도 화성시 우정읍 1", 100.0, 0.0, 50.0),
    ("147", 2, "B공장", "경기 안산시 단원구 2", 5.0, 0.0, 0.0),
    ("147", 3, "C공장", "울산광역시 남구 3", 300.0, 10.0, 0.0),
    ("147", 4, "D공장", "세종특별자치시 연서면 4", 0.0, 0.0, 1.0),
    ("147", 5, "E공장", "알 수 없는 주소", 1.0, 0.0, 0.0),
    ("2", 1, "F공장", "전라북도 군산시 5", 7.0, 0.0, 0.0),
]


@pytest.fixture()
def prtr_db(tmp_path):
    path = tmp_path / "prtr.sqlite"
    conn = sqlite3.connect(path)
    conn.executescript(SCHEMA)
    conn.executemany("INSERT INTO materials (year, material_id, cas_no, cas_key, name_ko, name_en, company_count) VALUES (?,?,?,?,?,?,?)", [
        (2024, "147", "000108-88-3", "108883", "톨루엔", "Toluene", 6),
        (2024, "2", "000071-43-2", "71432", "벤젠", "Benzene", 1),
        (2024, "375", "NA-(주8)", "8", "묶음 물질", "", 1),
        (2024, "9", "000050-00-0", "50000", "포름알데히드", "Formaldehyde", 3),  # no facility rows
    ])
    conn.executemany(
        "INSERT INTO facility_releases (year, material_id, row_index, cas_no, cas_key, chemical_name, company_name, address,"
        " total_release_kg, self_landfill_kg, total_transfer_kg) VALUES (2024,?,?,'','','',?,?,?,?,?)", FACILITIES)
    conn.commit()
    conn.close()
    return path


def test_region_table_has_17_iso_regions():
    table = region_table()
    assert len(table) == 17 and len({r["iso"] for r in table}) == 17
    assert all(r["iso"].startswith("KR-") and r["ko"] and r["en"] for r in table)


@pytest.mark.parametrize("address,expected", [
    ("경기도 수원시 장안구 정자동 1", ("KR-41", "수원시")),
    ("경기 화성시 우정읍", ("KR-41", "화성시")),
    ("부산광역시 강서구 녹산산업중로 333", ("KR-26", "강서구")),
    ("서울특별시 강서구 1", ("KR-11", "강서구")),
    ("강원도 원주시 1", ("KR-42", "원주시")),
    ("강원특별자치도 원주시 1", ("KR-42", "원주시")),
    ("전라북도 군산시 1", ("KR-45", "군산시")),
    ("전북특별자치도 완주군 1", ("KR-45", "완주군")),
    ("세종특별자치시 연서면 1", ("KR-50", "")),
    ("울산 울주군 온산읍", ("KR-31", "울주군")),
    ("광주광역시 광산구 1", ("KR-29", "광산구")),
    ("충청남도 서산시 대산읍", ("KR-44", "서산시")),
    ("충남 당진시 1", ("KR-44", "당진시")),
    ("경기도 테스트로 1", ("KR-41", "")),
    ("", ("", "")),
    ("미국 텍사스", ("", "")),
])
def test_parse_address(address, expected):
    assert parse_address(address) == expected


def test_every_alias_maps_back():
    for iso, ko, _en, aliases in SIDO:
        assert sido_iso(ko) == iso and all(sido_iso(a) == iso for a in aliases)


@pytest.mark.parametrize("raw,dashed", [("000108-88-3", "108-88-3"), ("001310-73-2", "1310-73-2"), ("71-43-2", "71-43-2"),
                                        ("NA-(주8)", ""), ("", "")])
def test_dashed_cas(raw, dashed):
    assert prtr_map.dashed_cas(raw) == dashed


def test_build_all_aggregates_by_region(prtr_db):
    conn = prtr_map.connect_ro(prtr_db)
    index, bodies = prtr_map.build_all(conn, exported_at="2026-10-31")
    conn.close()
    assert sorted(bodies) == ["108-88-3", "71-43-2"]  # no CAS and no facility rows are left out
    assert [r[0] for r in index["substances"]] == ["108-88-3", "71-43-2"] and index["cols"] == prtr_map.INDEX_COLS
    assert len(index["regions"]) == 17 and index["source"]["url"].startswith("https://www.data.go.kr/")
    t = bodies["108-88-3"]
    assert t["totals"] == {"facilities": 5, "release_kg": 406.0, "transfer_kg": 51.0, "reported_total_kg": 467.0}
    assert t["unparsed"] == 1 and t["reported_facilities"] == 6 and t["year"] == 2024
    regions = {r["iso"]: r for r in t["regions"]}
    assert regions["KR-41"]["facilities"] == 2 and regions["KR-41"]["reported_total_kg"] == 155.0
    assert regions["KR-31"]["reported_total_kg"] == 310.0  # release + self landfill + transfer
    assert sum(r["facilities"] for r in t["regions"]) + t["unparsed"] == t["totals"]["facilities"]
    assert [r["iso"] for r in t["regions"]] == ["KR-31", "KR-50", "KR-41"]  # SIDO order
    assert {(s["iso"], s["name"]) for s in t["sigungu"]} == {("KR-41", "화성시"), ("KR-41", "안산시"), ("KR-31", "남구")}
    names = [f[0] for f in t["facilities"]]
    assert names == ["C공장", "A공장", "B공장", "E공장", "D공장"]  # tie on total → larger release first and t["facility_cols"][0] == "name"
    assert bodies["71-43-2"]["regions"][0]["iso"] == "KR-45"


def test_build_one_matches_build_all(prtr_db):
    conn = prtr_map.connect_ro(prtr_db)
    _index, bodies = prtr_map.build_all(conn, exported_at="x")
    assert prtr_map.build_one(conn, "108-88-3", exported_at="x") == bodies["108-88-3"]
    assert prtr_map.build_one(conn, "50-00-0", exported_at="x") is None
    conn.close()


def test_export_writes_gzip_files(prtr_db, tmp_path):
    # In a child process: the exporter's db.py patches TerminologyDB to read-only for the whole process,
    # which must not leak into the other tests. Reports go to tmp_path, not the real reports folder.
    out = tmp_path / "out"
    code = (
        "import json, sys; sys.path.insert(0, sys.argv[1]); import config; config.REPORTS = sys.argv[4]; import prtr; "
        "print(json.dumps(prtr.export_prtr(log=lambda m: None, root=sys.argv[2], source_db=sys.argv[3])))"
    )
    run = subprocess.run(
        [sys.executable, "-I", "-B", "-c", code, str(ROOT / "scripts" / "static_export"), str(out), str(prtr_db), str(tmp_path / "reports")],
        capture_output=True, text=True, encoding="utf-8", timeout=120,
    )
    assert run.returncode == 0, run.stderr[-2000:]
    report = json.loads(run.stdout.strip().splitlines()[-1])
    assert report["substances"] == 2 and report["facility_rows"] == 6 and report["regions"] == 4
    files = sorted(p.name for p in out.iterdir())
    assert files == ["108-88-3.json", "71-43-2.json", "index.json"]
    body = json.loads(gzip.decompress((out / "108-88-3.json").read_bytes()))
    assert body["cas"] == "108-88-3" and body["v"] == prtr_map.FORMAT


def test_route_serves_same_bodies(prtr_db, monkeypatch):
    monkeypatch.setattr(route, "PRTR_DB", prtr_db)
    route._built.cache_clear()
    idx = client.get("/api/prtr/index")
    assert idx.status_code == 200 and [r[0] for r in idx.json()["substances"]] == ["108-88-3", "71-43-2"]
    one = client.get("/api/prtr/108-88-3")
    assert one.status_code == 200 and one.json()["totals"]["facilities"] == 5
    assert client.get("/api/prtr/50-00-0").status_code == 404
    assert client.get("/api/prtr/not-a-cas").status_code == 400
    route._built.cache_clear()


def test_wording_makes_no_risk_judgement():
    text = (ROOT / "frontend" / "public" / "chemip" / "prtr_map_labels_en.jsx").read_text(encoding="utf-8")
    labels = " ".join(line for line in text.lower().splitlines() if not line.lstrip().startswith("//"))
    for word in ("polluter", "violat", "dangerous", "unsafe", "worst"):
        assert word not in labels
