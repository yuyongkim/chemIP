"""요청 게시판의 허용 값과 길이 제한. 값은 여기서만 정의한다(화면은 /api/feedback/meta 로 읽는다).

validate_submission / validate_admin_update 는 입력 dict → (정리된 값, 오류 dict) 를 돌려주는 순수 함수다.
"""
from __future__ import annotations

import re
from typing import Any

CATEGORIES = ("기능 요청", "자료 오류", "물질 추가", "기타")
COMPANY_SIZES = ("소기업", "중기업", "중견", "대기업", "개인", "기타")
STATUSES = ("접수", "검토 중", "반영", "보류")
DEFAULT_STATUS = STATUSES[0]

LIMITS = {
    "title_min": 2,
    "title_max": 120,
    "body_min": 5,
    "body_max": 4000,
    "cas_max": 20,
    "contact_max": 200,
    "reply_max": 4000,
}

# 사람에게는 보이지 않는 입력칸 이름. 값이 들어 있으면 자동 입력(스팸)으로 보고 버린다.
HONEYPOT_FIELD = "website"

_CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")
_EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[A-Za-z]{2,}$")

ERRORS = {
    "category": "분류를 고르십시오.",
    "title": f"제목은 {LIMITS['title_min']}~{LIMITS['title_max']}자로 적어 주십시오.",
    "body": f"내용은 {LIMITS['body_min']}~{LIMITS['body_max']}자로 적어 주십시오.",
    "cas": "CAS 번호 형식이 아닙니다(예: 71-43-2).",
    "company_size": "회사 규모 값이 올바르지 않습니다.",
    "contact": "연락처는 이메일 주소 형식으로 적어 주십시오.",
    "status": "처리 상태 값이 올바르지 않습니다.",
    "admin_reply": f"답변은 {LIMITS['reply_max']}자 이하로 적어 주십시오.",
    "empty_update": "바꿀 항목(status 또는 admin_reply)이 없습니다.",
}


def public_meta() -> dict[str, Any]:
    """화면이 선택지·길이 제한을 그리는 데 쓰는 값."""
    return {
        "categories": list(CATEGORIES),
        "company_sizes": list(COMPANY_SIZES),
        "statuses": list(STATUSES),
        "limits": dict(LIMITS),
        "honeypot_field": HONEYPOT_FIELD,
    }


def _text(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    return value.strip() if isinstance(value, str) else ""


def is_honeypot_filled(payload: dict[str, Any]) -> bool:
    return bool(_text(payload, HONEYPOT_FIELD))


def validate_submission(payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str]]:
    """새 글 입력을 검사한다. 선택 칸(cas·company_size·contact)은 비어 있어도 된다."""
    clean = {
        "category": _text(payload, "category"),
        "title": _text(payload, "title"),
        "body": _text(payload, "body"),
        "cas": _text(payload, "cas"),
        "company_size": _text(payload, "company_size"),
        "contact": _text(payload, "contact"),
    }
    errors: dict[str, str] = {}
    if clean["category"] not in CATEGORIES:
        errors["category"] = ERRORS["category"]
    if not LIMITS["title_min"] <= len(clean["title"]) <= LIMITS["title_max"]:
        errors["title"] = ERRORS["title"]
    if not LIMITS["body_min"] <= len(clean["body"]) <= LIMITS["body_max"]:
        errors["body"] = ERRORS["body"]
    if clean["cas"] and (len(clean["cas"]) > LIMITS["cas_max"] or not _CAS_RE.match(clean["cas"])):
        errors["cas"] = ERRORS["cas"]
    if clean["company_size"] and clean["company_size"] not in COMPANY_SIZES:
        errors["company_size"] = ERRORS["company_size"]
    if clean["contact"] and (len(clean["contact"]) > LIMITS["contact_max"] or not _EMAIL_RE.match(clean["contact"])):
        errors["contact"] = ERRORS["contact"]
    return clean, errors


def validate_admin_update(payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str]]:
    """관리자 수정 입력을 검사한다. status·admin_reply 중 들어온 것만 돌려준다."""
    clean: dict[str, Any] = {}
    errors: dict[str, str] = {}
    if "status" in payload:
        status = _text(payload, "status")
        if status not in STATUSES:
            errors["status"] = ERRORS["status"]
        else:
            clean["status"] = status
    if "admin_reply" in payload:
        reply = _text(payload, "admin_reply")
        if len(reply) > LIMITS["reply_max"]:
            errors["admin_reply"] = ERRORS["admin_reply"]
        else:
            clean["admin_reply"] = reply
    if not clean and not errors:
        errors["_"] = ERRORS["empty_update"]
    return clean, errors
