"""텍사스 TCEQ 배출사고 연동: 배출점 종류 표 · 작은 CSV 로 만든 색인 · /api/integrations/tceq-events 라우트 · 문구 제한."""
import csv
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.integrations import sources
from backend.integrations import tceq_event_store as store
from backend.integrations.tceq_point_kinds import kind_discipline, point_kind
from backend.main import app

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import build_tceq_event_index as builder  # noqa: E402

client = TestClient(app)
BUTADIENE = "106-99-0"
ETHYLENE = "74-85-1"

INCIDENTS = [
    {"incident_number": "100", "regulated_entity_name": "PLANT A", "owner_name": "OWNER A", "county": "HARRIS",
     "event_type": "EMISSIONS EVENT", "event_start": "03/01/2017 04:00 AM", "event_end": "03/01/2017 05:00 AM",
     "duration": "1 hours, 0 minutes", "report_date": "03/05/2017", "tceq_rn": "RN1",
     "cause": "Compressor trip sent gas to the flare. " + "x" * 400},
    {"incident_number": "200", "regulated_entity_name": "PLANT B", "owner_name": "OWNER B", "county": "BRAZORIA",
     "event_type": "EMISSIONS EVENT", "event_start": "07/10/2023 10:02 PM", "event_end": "07/10/2023 11:00 PM",
     "duration": "0 hours, 58 minutes", "report_date": "07/12/2023", "tceq_rn": "RN2", "cause": "Leak at a flange."},
    {"incident_number": "300", "regulated_entity_name": "PLANT C", "owner_name": "OWNER C", "county": "HARRIS",
     "event_type": "EMISSIONS EVENT", "event_start": "01/02/2020 01:00 AM", "event_end": "", "duration": "",
     "report_date": "", "tceq_rn": "RN3", "cause": "Only a group name here."},
]
POINTS = [
    {"incident_number": "100", "point_idx": "1", "point_name": "North Flare", "epn": "FL1"},
    {"incident_number": "100", "point_idx": "2", "point_name": "Unit 22 PSVs", "epn": "PSV22"},
    {"incident_number": "200", "point_idx": "1", "point_name": "Process Fugitives", "epn": "FUG"},
    {"incident_number": "200", "point_idx": "2", "point_name": "Tank 92", "epn": "TK92"},
    {"incident_number": "300", "point_idx": "1", "point_name": "Boiler Stack", "epn": "B1"},
]
CONTAMINANTS = [
    # incident_number, point_idx, contaminant, qty, unit, limit, limit_unit, authorization
    ("100", "1", "1,3-BUTADIENE", "10.5", "POUNDS", "0.0", "", "Not specifically authorized"),
    ("100", "2", "Butadiene, 1-3", "2", "POUNDS", "0.0", "", ""),
    ("100", "1", "Ethylene (gaseous)", "40", "POUNDS", "0.0", "", ""),
    ("200", "1", "1,3-BUTADIENE", "1.25", "POUNDS", "5", "LBS/HR", "NSR 1"),
    ("200", "2", "1,3-BUTADIENE", "3", "LBS/HR", "5", "LBS/HR", "NSR 1"),     # 파운드가 아니라 합계에서 뺀다
    ("300", "1", "Butenes, All Isomers", "9", "POUNDS", "0.0", "", ""),      # 물질군 — 색인에 넣지 않는다
    ("300", "1", "Mystery stuff", "1", "POUNDS", "0.0", "", ""),             # 미연결
]


class FakeResolved:
    def __init__(self, status, cas="", group="", method="", key=""):
        self.status, self.cas, self.group, self.method, self.key = status, cas, group, method, key


def fake_resolve(name: str) -> FakeResolved:
    key = name.casefold()
    table = {"1,3-butadiene": BUTADIENE, "butadiene, 1-3": BUTADIENE, "ethylene (gaseous)": ETHYLENE}
    if key in table:
        return FakeResolved("cas", cas=table[key], method="test", key=key)
    if key.startswith("butenes"):
        return FakeResolved("group", group="butenes", method="test", key=key)
    return FakeResolved("unmapped", key=key)


def _write(path: Path, rows: list[dict]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


@pytest.fixture
def tceq_db(tmp_path, monkeypatch):
    events, points = tmp_path / "events", tmp_path / "points"
    events.mkdir()
    points.mkdir()
    _write(events / "incidents.csv", INCIDENTS)
    _write(points / "eer_points.csv", POINTS)
    cols = ("incident_number", "point_idx", "contaminant", "qty", "unit", "limit", "limit_unit", "authorization")
    _write(points / "eer_point_contaminants.csv", [dict(zip(cols, r)) for r in CONTAMINANTS])
    out = tmp_path / "tceq.db"
    report = builder.build(events_dir=events, points_dir=points, out=out, resolve=fake_resolve)
    monkeypatch.setattr(sources, "TCEQ_EVENT_CAS_INDEX_DB", out)
    return report


def test_point_kinds_are_a_data_table_with_disciplines() -> None:
    assert point_kind("Relief Gas North Main Flare") == "flare"
    assert point_kind("Unit 22 PSVs") == point_kind("Safety Valve 0363") == "relief"
    assert point_kind("Tank 92") == "tank"
    assert point_kind("VAFUG") == point_kind("Hole in Pipe") == "leak"
    assert point_kind("FL-003") == "flare"
    assert point_kind("Cooling Tower") == point_kind("") == "other"
    assert (kind_discipline("leak"), kind_discipline("tank"), kind_discipline("relief")) == ("piping", "vessel", "vessel")
    assert kind_discipline("flare") is None and kind_discipline("other") is None


def test_build_report_counts_mapping_status(tceq_db) -> None:
    assert tceq_db["events"] == 3 and tceq_db["points"] == 5
    assert tceq_db["cas_rows"] == 5 and tceq_db["cas_distinct"] == 2 and tceq_db["events_with_cas"] == 2
    assert tceq_db["rows_by_status"] == {"cas": 5, "group": 1, "ambiguous": 0, "unmapped": 1}
    assert tceq_db["years"] == [2017, 2023]


def test_store_payload_for_butadiene(tceq_db) -> None:
    body = client.get(f"/api/integrations/tceq-events/{BUTADIENE}?limit=6").json()
    assert body["available"] is True and body["total"] == 2
    assert body["years"] == [2017, 2023]
    assert body["qty_total_lbs"] == 13.75                                   # LBS/HR 줄은 더하지 않는다
    assert body["units"] == {"POUNDS": 3, "LBS/HR": 1}
    assert body["point_kinds"] == {"flare": 1, "relief": 1, "leak": 1, "tank": 1}
    assert {d["key"]: d["points"] for d in body["disciplines"]} == {"vessel": 2, "piping": 1}
    assert body["disciplines"][0]["epc_url"] == f"{sources.EPC_PUBLIC_URL}/vessel"
    assert body["counties"] == {"HARRIS": 1, "BRAZORIA": 1}
    recent = body["recent"]
    assert [e["incident_number"] for e in recent] == ["200", "100"]          # 최근 순
    assert recent[0]["date"] == "2023-07-10" and recent[0]["qty"] == 1.25 and recent[0]["unit"] == "POUNDS"
    assert recent[0]["point_kinds"] == ["leak", "tank"]
    assert recent[1]["qty"] == 12.5 and recent[1]["cause"].endswith("…") and len(recent[1]["cause"]) <= store.CAUSE_CHARS + 1
    assert recent[1]["url"] == sources.TCEQ_EVENT_URL.format(incident_number="100")
    assert client.get(f"/api/integrations/tceq-events/{BUTADIENE}?limit=1").json()["recent"][0]["incident_number"] == "200"


def test_wording_limits_and_empty_shapes(tceq_db, tmp_path, monkeypatch) -> None:
    body = client.get(f"/api/integrations/tceq-events/{ETHYLENE}").json()
    text = " ".join(body["notes"]) + body["source"]
    assert "무허가" not in text and "위반" not in text
    assert "authorization" not in str(body["recent"])                        # 허가 칸은 응답에 싣지 않는다
    none = client.get("/api/integrations/tceq-events/50-00-0").json()
    assert (none["available"], none["total"], none["recent"]) == (True, 0, [])
    assert set(none) == set(body)                                            # 빈 응답도 같은 모양
    monkeypatch.setattr(sources, "TCEQ_EVENT_CAS_INDEX_DB", tmp_path / "none.db")
    assert client.get(f"/api/integrations/tceq-events/{BUTADIENE}").json()["available"] is False
    assert client.get("/api/integrations/tceq-events/not-a-cas").status_code == 400
