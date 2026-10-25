"""요청 경로 → (지표, 물질 식별자). 어떤 API 호출을 몇 번 셀지는 이 표 한 곳에서 정한다(순수 함수)."""
from __future__ import annotations

import re

_SUBJECT_RE = re.compile(r"^[0-9A-Za-z-]{1,32}$")

# (지표, 경로 정규식). 정규식의 첫 그룹이 물질 식별자다.
ROUTES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("substance_view", re.compile(r"^/api/chemicals/([^/]+)$")),
    ("trade_controls", re.compile(r"^/api/regulations/trade-controls/([^/]+)$")),
)

# /api/chemicals/{chem_id} 와 모양이 같지만 물질 조회가 아닌 경로
_NOT_SUBJECTS = {"autocomplete"}

_BOT_RE = re.compile(r"bot|spider|crawl|slurp|headless|preview", re.IGNORECASE)


def match(method: str, path: str) -> tuple[str, str] | None:
    """세어야 할 요청이면 (지표, 식별자)를, 아니면 None 을 돌려준다."""
    if method != "GET":
        return None
    for metric, pattern in ROUTES:
        m = pattern.match(path)
        if m:
            subject = m.group(1)
            if subject in _NOT_SUBJECTS:
                return None
            return metric, subject if _SUBJECT_RE.match(subject) else ""
    return None


def is_bot(user_agent: str) -> bool:
    """검색 로봇·미리보기 요청은 이용 근거에서 뺀다(UA 는 판단에만 쓰고 저장하지 않는다)."""
    return bool(_BOT_RE.search(user_agent or ""))
