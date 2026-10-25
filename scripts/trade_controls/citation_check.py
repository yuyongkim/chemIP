"""규칙 원천의 인용문(verified_text)이 실제 조문에 들어 있는지 대조한다.

인용 한 건 = {"law": 법령키, "article": "제20조", "verified_text": "...", ["addendum": "법률 제15512호"]}.
법령 본문은 law_text 로 받아 조문을 자르고, 공백을 무시한 부분 문자열 포함 여부로 판정한다.
세관장확인 대조(annex_check / annex_absent)는 별표 xlsx 표(customs_annex)로 한다.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from . import law_text
from .customs_annex import AnnexTable

MAX_QUOTE_CHARS = 300


@dataclass(frozen=True)
class CheckResult:
    ok: bool
    reason: str
    source_url: str


def article_url(law: dict, article: str, addendum: str | None) -> str:
    """사람이 여는 조문 링크. 부칙·행정규칙은 법령 첫 화면으로 둔다."""
    if addendum or law.get("article_links") is False:
        return law["public_url"]
    return f"{law['public_url']}/{article}"


def check_citation(cit: dict, laws: dict, cache_dir: Path, refresh: bool) -> CheckResult:
    law = laws.get(cit.get("law", ""))
    if law is None:
        return CheckResult(False, f"unknown law key {cit.get('law')}", "")
    url = article_url(law, cit["article"], cit.get("addendum"))
    quote = cit.get("verified_text", "")
    if not quote or len(quote) > MAX_QUOTE_CHARS:
        return CheckResult(False, f"verified_text 길이 {len(quote)}자(1~{MAX_QUOTE_CHARS}자 필요)", url)
    try:
        body = law_text.fetch_text(law["fetch_url"], cache_dir, refresh)
    except Exception as exc:  # 네트워크 실패는 '미검증'으로 분류한다
        return CheckResult(False, f"fetch failed: {exc}", url)
    article = law_text.extract_article(body, cit["article"], cit.get("addendum"))
    if not article:
        return CheckResult(False, f"{law['name']} {cit['article']} 조문을 찾지 못함", url)
    if not law_text.contains(article, quote):
        return CheckResult(False, f"{law['name']} {cit['article']} 본문에 인용문이 없음", url)
    return CheckResult(True, "ok", url)


def check_annex(customs: dict, annexes: dict[str, AnnexTable]) -> tuple[bool, str]:
    """세관장확인 근거를 별표 xlsx 와 대조. 대조 항목이 없으면 통과로 본다."""
    if "annex_check" in customs:
        spec = customs["annex_check"]
        table = annexes.get(spec["annex"])
        rows = table.texts_by_law.get(spec["law"], []) if table else []
        if not rows:
            return False, f"{spec['annex']} 에 '{spec['law']}' 행이 없음"
        if not any(law_text.contains(r, spec["verified_text"]) for r in rows):
            return False, f"{spec['annex']} '{spec['law']}' 행에 인용문이 없음"
        return True, f"{spec['annex']} '{spec['law']}' {len(rows)}행 중 인용문 확인"
    if "annex_absent" in customs:
        spec = customs["annex_absent"]
        table = annexes.get(spec["annex"])
        if table is None or table.row_count == 0:
            return False, f"{spec['annex']} 표를 읽지 못함"
        if table.texts_by_law.get(spec["law"]):
            return False, f"{spec['annex']} 에 '{spec['law']}' 행이 있음(세관장확인 대상일 수 있음)"
        return True, f"{spec['annex']} {table.row_count}행 중 '{spec['law']}' 없음 확인"
    return True, "대조 항목 없음"
