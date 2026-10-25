"""요청 게시판 라우트 (/api/feedback).

공개: GET /meta, GET "", GET /{id}, POST "" (검증·허니팟·주소별 횟수 제한).
관리자: GET /admin/list(연락처 포함 전체 목록), PATCH /{id}, DELETE /{id} — 헤더 X-Admin-Token 이 CHEMIP_ADMIN_TOKEN 과 같아야 한다.
CHEMIP_ADMIN_TOKEN 이 없으면 관리자 경로는 503 이다. 연락처는 /admin/list 응답에만 담고 로그에 남기지 않는다.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Query, Request
from fastapi.responses import JSONResponse

from backend.feedback import guard, schema, store

router = APIRouter()


def _error(status: int, code: str, message: str, errors: dict[str, str] | None = None) -> JSONResponse:
    content: dict[str, Any] = {"code": code, "message": message}
    if errors:
        content["errors"] = errors
    return JSONResponse(status_code=status, content=content)


def _admin_denied(request: Request) -> JSONResponse | None:
    if not guard.admin_token_configured():
        return _error(503, "ADMIN_DISABLED", "관리자 기능이 설정되지 않았습니다.")
    if not guard.is_admin(request):
        return _error(401, "ADMIN_UNAUTHORIZED", "관리자 토큰이 맞지 않습니다.")
    return None


@router.get("/meta")
def get_meta():
    return schema.public_meta()


@router.get("/admin/list")
def admin_list_feedback(
    request: Request,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    denied = _admin_denied(request)
    if denied:
        return denied
    # 연락처가 담긴 응답이므로 브라우저·프록시가 저장하지 않게 한다.
    return JSONResponse(content=store.admin_list(limit=limit, offset=offset), headers={"Cache-Control": "no-store"})


@router.get("")
def list_feedback(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    category: str = Query("", max_length=20),
    status: str = Query("", max_length=20),
    cas: str = Query("", max_length=20),
):
    return store.list_items(limit=limit, offset=offset, category=category.strip(), status=status.strip(), cas=cas.strip())


@router.get("/{item_id}")
def get_feedback(item_id: int):
    item = store.get(item_id)
    if item is None:
        return _error(404, "NOT_FOUND", "글을 찾을 수 없습니다.")
    return item


@router.post("")
def create_feedback(request: Request, payload: dict[str, Any] = Body(...)):
    if schema.is_honeypot_filled(payload):
        # 자동 입력으로 보고 저장하지 않는다. 봇이 재시도하지 않도록 성공처럼 답한다.
        return JSONResponse(status_code=202, content={"accepted": True})
    clean, errors = schema.validate_submission(payload)
    if errors:
        return _error(400, "INVALID_INPUT", "입력값을 확인해 주십시오.", errors)
    if not guard.allow_post(request):
        return _error(429, "TOO_MANY_POSTS", "잠시 후 다시 등록해 주십시오.")
    return JSONResponse(status_code=201, content=store.create(clean))


@router.patch("/{item_id}")
def admin_update_feedback(item_id: int, request: Request, payload: dict[str, Any] = Body(...)):
    denied = _admin_denied(request)
    if denied:
        return denied
    clean, errors = schema.validate_admin_update(payload)
    if errors:
        return _error(400, "INVALID_INPUT", "입력값을 확인해 주십시오.", errors)
    item = store.update(item_id, clean)
    if item is None:
        return _error(404, "NOT_FOUND", "글을 찾을 수 없습니다.")
    return item


@router.delete("/{item_id}")
def admin_delete_feedback(item_id: int, request: Request):
    denied = _admin_denied(request)
    if denied:
        return denied
    if not store.delete(item_id):
        return _error(404, "NOT_FOUND", "글을 찾을 수 없습니다.")
    return {"deleted": item_id}
