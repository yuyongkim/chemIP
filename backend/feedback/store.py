"""요청 게시판 저장소(SQLite, 기본 data/feedback.db). 읽기·쓰기만 맡고 검증은 schema.py 가 한다.

연락처(contact)는 저장만 하고 공개 조회(public_view)에서는 빼며, 로그에 남기지 않는다.
관리자 조회(admin_list)만 연락처를 포함한 전체 칸(admin_view)을 돌려준다.
경로는 환경변수 CHEMIP_FEEDBACK_DB 로 바꿀 수 있다(테스트는 tmp 경로를 쓴다).
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.config.settings import PROJECT_ROOT
from backend.feedback.schema import DEFAULT_STATUS

DEFAULT_DB = Path(PROJECT_ROOT) / "data" / "feedback.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    cas TEXT NOT NULL DEFAULT '',
    company_size TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    admin_reply TEXT NOT NULL DEFAULT '',
    reply_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
"""

_PUBLIC_FIELDS = ("id", "created_at", "category", "title", "body", "cas", "company_size", "status", "admin_reply", "reply_at")
_ADMIN_FIELDS = (*_PUBLIC_FIELDS, "contact")


def db_path() -> Path:
    return Path(os.getenv("CHEMIP_FEEDBACK_DB") or DEFAULT_DB)


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@contextmanager
def _connect():
    """연결을 열고, 끝나면 커밋하고 닫는다(Windows 에서 파일 잠금이 남지 않게)."""
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(_SCHEMA)
        yield conn
        conn.commit()
    finally:
        conn.close()


def public_view(row: sqlite3.Row | dict[str, Any] | None) -> dict[str, Any] | None:
    """공개용 한 건. contact 는 넣지 않는다."""
    if row is None:
        return None
    return {k: row[k] for k in _PUBLIC_FIELDS}


def admin_view(row: sqlite3.Row | dict[str, Any] | None) -> dict[str, Any] | None:
    """관리자용 한 건(연락처 포함). 관리자 토큰을 확인한 경로에서만 쓴다."""
    if row is None:
        return None
    return {k: row[k] for k in _ADMIN_FIELDS}


def create(entry: dict[str, Any]) -> dict[str, Any]:
    """검증을 마친 입력 한 건을 저장하고 공개용 형태로 돌려준다."""
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO feedback (created_at, category, title, body, cas, company_size, contact, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (_now(), entry["category"], entry["title"], entry["body"], entry.get("cas", ""),
             entry.get("company_size", ""), entry.get("contact", ""), DEFAULT_STATUS),
        )
        row = conn.execute("SELECT * FROM feedback WHERE id = ?", (cur.lastrowid,)).fetchone()
    return public_view(row)


def get(item_id: int) -> dict[str, Any] | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM feedback WHERE id = ?", (item_id,)).fetchone()
    return public_view(row)


def list_items(*, limit: int = 20, offset: int = 0, category: str = "", status: str = "", cas: str = "") -> dict[str, Any]:
    """최신 글부터. 분류·상태·CAS 로 거를 수 있다."""
    where, params = [], []
    for column, value in (("category", category), ("status", status), ("cas", cas)):
        if value:
            where.append(f"{column} = ?")
            params.append(value)
    clause = f" WHERE {' AND '.join(where)}" if where else ""
    with _connect() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM feedback{clause}", params).fetchone()[0]
        rows = conn.execute(
            f"SELECT * FROM feedback{clause} ORDER BY id DESC LIMIT ? OFFSET ?", [*params, limit, offset]
        ).fetchall()
    return {"total": total, "limit": limit, "offset": offset, "items": [public_view(r) for r in rows]}


def admin_list(*, limit: int = 200, offset: int = 0) -> dict[str, Any]:
    """관리자용 전체 목록(최신 글부터, 연락처 포함)."""
    with _connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]
        rows = conn.execute("SELECT * FROM feedback ORDER BY id DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
    return {"total": total, "limit": limit, "offset": offset, "items": [admin_view(r) for r in rows]}


def update(item_id: int, changes: dict[str, Any]) -> dict[str, Any] | None:
    """관리자 수정(status·admin_reply). 답변을 바꾸면 reply_at 을 새로 찍는다."""
    sets, params = [], []
    if "status" in changes:
        sets.append("status = ?")
        params.append(changes["status"])
    if "admin_reply" in changes:
        sets += ["admin_reply = ?", "reply_at = ?"]
        params += [changes["admin_reply"], _now() if changes["admin_reply"] else ""]
    if not sets:
        return get(item_id)
    with _connect() as conn:
        cur = conn.execute(f"UPDATE feedback SET {', '.join(sets)} WHERE id = ?", [*params, item_id])
        if cur.rowcount == 0:
            return None
    return get(item_id)


def delete(item_id: int) -> bool:
    with _connect() as conn:
        return conn.execute("DELETE FROM feedback WHERE id = ?", (item_id,)).rowcount > 0
