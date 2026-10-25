"""익명 이용 집계 저장소(SQLite, 기본 data/usage.db). 하루·지표·물질별 횟수만 센다.

접속 주소·브라우저 정보·시각(초 단위) 같은 개인 식별 자료는 받지도 저장하지도 않는다.
경로는 환경변수 CHEMIP_USAGE_DB 로 바꿀 수 있다.
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from backend.config.settings import PROJECT_ROOT

DEFAULT_DB = Path(PROJECT_ROOT) / "data" / "usage.db"
KST = timezone(timedelta(hours=9))  # 집계 날짜는 한국 시각 기준

# 지표 이름 → 설명. 새 지표는 여기에 한 줄, 경로 규칙은 matcher.py 에 한 줄.
METRICS = {
    "substance_view": "물질 상세 조회",
    "trade_controls": "규제·인허가 / 수출입 조회",
}

_SCHEMA = """
CREATE TABLE IF NOT EXISTS usage_daily (
    day TEXT NOT NULL,
    metric TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, metric, subject)
);
"""


def db_path() -> Path:
    return Path(os.getenv("CHEMIP_USAGE_DB") or DEFAULT_DB)


def today_kst(now: datetime | None = None) -> str:
    return (now or datetime.now(timezone.utc)).astimezone(KST).date().isoformat()


# 표를 이미 만든 DB 경로. 요청마다 CREATE TABLE(=별도 커밋)을 돌리지 않으려고 프로세스 안에서 기억한다.
_READY: set[str] = set()


@contextmanager
def _connect():
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=2)
    try:
        # 느린 디스크에서 커밋 한 번이 수백 ms 걸려 WAL + synchronous=NORMAL 로 fsync 를 줄인다(집계용이라 충분).
        conn.execute("PRAGMA synchronous=NORMAL")
        if str(path) not in _READY:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.executescript(_SCHEMA)
            _READY.add(str(path))
        yield conn
        conn.commit()
    finally:
        conn.close()


def increment(metric: str, subject: str = "", day: str | None = None) -> None:
    """지표 하나를 1 올린다. subject 는 물질 식별자(CAS·chem_id)뿐이다."""
    if metric not in METRICS:
        raise ValueError(f"unknown metric: {metric}")
    with _connect() as conn:
        conn.execute(
            "INSERT INTO usage_daily (day, metric, subject, count) VALUES (?, ?, ?, 1) "
            "ON CONFLICT(day, metric, subject) DO UPDATE SET count = count + 1",
            (day or today_kst(), metric, subject),
        )


def summary(days: int = 30, top: int = 10, today: str | None = None) -> dict[str, Any]:
    """최근 days 일의 날짜별 횟수, 지표별 합계·서로 다른 물질 수, 많이 본 물질."""
    end = date.fromisoformat(today or today_kst())
    start = end - timedelta(days=days - 1)
    since = start.isoformat()
    with _connect() as conn:
        daily_rows = conn.execute(
            "SELECT day, metric, SUM(count) FROM usage_daily WHERE day >= ? GROUP BY day, metric", (since,)
        ).fetchall()
        metric_rows = conn.execute(
            "SELECT metric, SUM(count), COUNT(DISTINCT CASE WHEN subject != '' THEN subject END) "
            "FROM usage_daily WHERE day >= ? GROUP BY metric", (since,)
        ).fetchall()
        top_rows = conn.execute(
            "SELECT metric, subject, SUM(count) AS n FROM usage_daily WHERE day >= ? AND subject != '' "
            "GROUP BY metric, subject ORDER BY n DESC, subject", (since,)
        ).fetchall()
        first = conn.execute("SELECT MIN(day) FROM usage_daily").fetchone()[0]

    by_day: dict[str, dict[str, int]] = {}
    for day, metric, n in daily_rows:
        by_day.setdefault(day, {m: 0 for m in METRICS})[metric] = n
    daily = [
        {"day": d, **by_day.get(d, {m: 0 for m in METRICS})}
        for d in ((start + timedelta(days=i)).isoformat() for i in range(days))
    ]
    totals = {m: {"count": 0, "distinct_subjects": 0} for m in METRICS}
    for metric, n, distinct in metric_rows:
        if metric in totals:
            totals[metric] = {"count": n, "distinct_subjects": distinct}
    top_subjects: dict[str, list[dict[str, Any]]] = {m: [] for m in METRICS}
    for metric, subject, n in top_rows:
        if metric in top_subjects and len(top_subjects[metric]) < top:
            top_subjects[metric].append({"subject": subject, "count": n})
    return {
        "since": since,
        "until": end.isoformat(),
        "first_recorded_day": first,
        "metrics": dict(METRICS),
        "totals": totals,
        "daily": daily,
        "top_subjects": top_subjects,
        "privacy": "IP 주소·브라우저 정보·개인 식별 정보는 수집하지 않습니다. 날짜·지표·물질(CAS/물질 번호)별 횟수만 셉니다.",
    }
