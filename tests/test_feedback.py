"""요청 게시판(backend/feedback)과 /api/feedback 라우트 테스트. DB 는 tmp_path 에 만든다."""
import pytest
from fastapi.testclient import TestClient

from backend.feedback import guard, schema, store
from backend.main import app

client = TestClient(app)
# 운영처럼 로컬 프록시(127.0.0.1)를 거친 요청 — 이때만 CF-Connecting-IP 를 믿는다(backend/core/client_ip.py).
proxied = TestClient(app, client=("127.0.0.1", 50000))

VALID = {
    "category": "자료 오류",
    "title": "벤젠 HS 코드 확인 요청",
    "body": "벤젠 수출 탭의 HS 코드가 맞는지 확인 부탁드립니다.",
    "cas": "71-43-2",
    "company_size": "소기업",
    "contact": "someone@example.com",
}


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.setenv("CHEMIP_FEEDBACK_DB", str(tmp_path / "feedback.db"))
    monkeypatch.setenv("CHEMIP_USAGE_DB", str(tmp_path / "usage.db"))
    monkeypatch.delenv(guard.ADMIN_TOKEN_ENV, raising=False)
    guard.reset_rate_limit()
    yield
    guard.reset_rate_limit()


# ── schema ──
def test_validate_submission_accepts_valid_and_trims():
    clean, errors = schema.validate_submission({**VALID, "title": "  제목입니다  "})
    assert errors == {}
    assert clean["title"] == "제목입니다"


def test_validate_submission_optional_fields_may_be_empty():
    clean, errors = schema.validate_submission({"category": "기타", "title": "제목", "body": "내용 다섯자"})
    assert errors == {}
    assert clean["cas"] == clean["contact"] == clean["company_size"] == ""


@pytest.mark.parametrize("field,value", [
    ("category", "없는 분류"),
    ("title", "a"),
    ("title", "가" * (schema.LIMITS["title_max"] + 1)),
    ("body", "짧음"),
    ("body", "가" * (schema.LIMITS["body_max"] + 1)),
    ("cas", "71432"),
    ("company_size", "거대기업"),
    ("contact", "not-an-email"),
])
def test_validate_submission_rejects(field, value):
    _, errors = schema.validate_submission({**VALID, field: value})
    assert field in errors


def test_validate_admin_update():
    assert schema.validate_admin_update({"status": "반영"}) == ({"status": "반영"}, {})
    assert "status" in schema.validate_admin_update({"status": "끝"})[1]
    assert "_" in schema.validate_admin_update({})[1]


# ── store ──
def test_store_create_get_list_never_exposes_contact():
    created = store.create(schema.validate_submission(VALID)[0])
    assert created["status"] == schema.DEFAULT_STATUS
    assert "contact" not in created
    assert "contact" not in store.get(created["id"])
    listing = store.list_items()
    assert listing["total"] == 1 and "contact" not in listing["items"][0]


def test_store_keeps_contact_privately(tmp_path):
    import sqlite3
    store.create(schema.validate_submission(VALID)[0])
    conn = sqlite3.connect(store.db_path())
    try:
        assert conn.execute("SELECT contact FROM feedback").fetchone()[0] == VALID["contact"]
    finally:
        conn.close()


def test_store_list_filters_and_order():
    for title, category in (("첫번째 글", "기타"), ("두번째 글", "기능 요청"), ("세번째 글", "기능 요청")):
        store.create(schema.validate_submission({**VALID, "title": title, "category": category})[0])
    items = store.list_items()["items"]
    assert [i["title"] for i in items] == ["세번째 글", "두번째 글", "첫번째 글"]
    assert store.list_items(category="기능 요청")["total"] == 2
    assert store.list_items(limit=1, offset=1)["items"][0]["title"] == "두번째 글"


def test_store_update_sets_reply_time_and_delete():
    item = store.create(schema.validate_submission(VALID)[0])
    updated = store.update(item["id"], {"status": "반영", "admin_reply": "고쳤습니다."})
    assert updated["status"] == "반영" and updated["admin_reply"] == "고쳤습니다." and updated["reply_at"]
    assert store.update(9999, {"status": "반영"}) is None
    assert store.delete(item["id"]) is True
    assert store.get(item["id"]) is None


# ── routes ──
def test_meta_lists_allowed_values():
    data = client.get("/api/feedback/meta").json()
    assert data["categories"] == list(schema.CATEGORIES)
    assert data["statuses"] == list(schema.STATUSES)


def test_post_then_list_and_detail_without_contact():
    r = client.post("/api/feedback", json=VALID)
    assert r.status_code == 201
    item = r.json()
    assert "contact" not in item
    listing = client.get("/api/feedback").json()
    assert listing["total"] == 1 and "contact" not in listing["items"][0]
    detail = client.get(f"/api/feedback/{item['id']}").json()
    assert detail["title"] == VALID["title"] and "contact" not in detail
    assert client.get("/api/feedback/9999").status_code == 404


def test_post_invalid_returns_field_errors():
    r = client.post("/api/feedback", json={**VALID, "title": "", "contact": "x"})
    assert r.status_code == 400
    assert set(r.json()["errors"]) == {"title", "contact"}


def test_post_honeypot_is_silently_dropped():
    r = client.post("/api/feedback", json={**VALID, schema.HONEYPOT_FIELD: "http://spam.example"})
    assert r.status_code == 202
    assert client.get("/api/feedback").json()["total"] == 0


def test_post_rate_limit_per_ip():
    headers = {"cf-connecting-ip": "203.0.113.7"}
    for _ in range(guard.MAX_POSTS):
        assert proxied.post("/api/feedback", json=VALID, headers=headers).status_code == 201
    assert proxied.post("/api/feedback", json=VALID, headers=headers).status_code == 429
    # 다른 주소는 영향을 받지 않는다
    assert proxied.post("/api/feedback", json=VALID, headers={"cf-connecting-ip": "203.0.113.8"}).status_code == 201


def test_admin_endpoints_503_when_token_unset():
    item = client.post("/api/feedback", json=VALID).json()
    assert client.patch(f"/api/feedback/{item['id']}", json={"status": "반영"}).status_code == 503
    assert client.delete(f"/api/feedback/{item['id']}").status_code == 503


def test_admin_update_and_delete_with_token(monkeypatch):
    monkeypatch.setenv(guard.ADMIN_TOKEN_ENV, "secret-token")
    item = client.post("/api/feedback", json=VALID).json()
    url = f"/api/feedback/{item['id']}"
    assert client.patch(url, json={"status": "반영"}).status_code == 401
    assert client.patch(url, json={"status": "반영"}, headers={"x-admin-token": "wrong"}).status_code == 401
    ok = client.patch(url, json={"status": "검토 중", "admin_reply": "확인 중입니다."}, headers={"x-admin-token": "secret-token"})
    assert ok.status_code == 200
    assert ok.json()["status"] == "검토 중" and "contact" not in ok.json()
    assert client.patch(url, json={"status": "엉뚱"}, headers={"x-admin-token": "secret-token"}).status_code == 400
    assert client.delete(url, headers={"x-admin-token": "secret-token"}).status_code == 200
    assert client.get(url).status_code == 404


ADMIN = {"x-admin-token": "fixture-admin-token"}


@pytest.fixture
def admin_token(monkeypatch):
    monkeypatch.setenv(guard.ADMIN_TOKEN_ENV, ADMIN["x-admin-token"])


def test_admin_list_requires_token(admin_token):
    client.post("/api/feedback", json=VALID)
    assert client.get("/api/feedback/admin/list").status_code == 401
    assert client.get("/api/feedback/admin/list", headers={"x-admin-token": "wrong"}).status_code == 401


def test_admin_list_503_when_token_unset():
    assert client.get("/api/feedback/admin/list", headers=ADMIN).status_code == 503


def test_admin_list_includes_contact_and_status(admin_token):
    first = client.post("/api/feedback", json=VALID).json()
    client.post("/api/feedback", json={**VALID, "title": "연락처 없는 글", "contact": ""})
    client.patch(f"/api/feedback/{first['id']}", json={"status": "반영"}, headers=ADMIN)
    r = client.get("/api/feedback/admin/list", headers=ADMIN)
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-store"
    data = r.json()
    assert data["total"] == 2
    newest, oldest = data["items"]
    assert newest["title"] == "연락처 없는 글" and newest["contact"] == ""
    assert oldest["contact"] == VALID["contact"] and oldest["status"] == "반영"
    # 공개 경로는 여전히 연락처를 내보내지 않는다
    assert all("contact" not in i for i in client.get("/api/feedback").json()["items"])
    assert "contact" not in client.get(f"/api/feedback/{first['id']}").json()


def test_store_admin_list_paging():
    for title in ("첫번째 글", "두번째 글"):
        store.create(schema.validate_submission({**VALID, "title": title})[0])
    page = store.admin_list(limit=1, offset=1)
    assert page["total"] == 2 and page["items"][0]["title"] == "첫번째 글"
    assert page["items"][0]["contact"] == VALID["contact"]
