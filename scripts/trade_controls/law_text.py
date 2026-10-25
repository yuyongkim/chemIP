"""국가법령정보센터(law.go.kr) 본문을 받아 조문 단위로 잘라 준다.

lsInfoR.do(법령)·admRulInfoR.do(행정규칙)는 본문 전체를 HTML 한 장으로 돌려준다.
태그를 걷어 평문으로 만든 뒤, 본문(첫 '부 칙 <' 앞)에서 '제N조(' 로 시작하는 조문을 찾는다.
부칙 조문은 addendum(예: '법률 제15512호')으로 해당 부칙 구간을 먼저 고른 뒤 찾는다.
받은 본문은 캐시 폴더에 평문으로 저장해 재실행 시 다시 받지 않는다(--refresh 로 갱신).
"""
from __future__ import annotations

import hashlib
import html
import re
import urllib.request
from pathlib import Path

USER_AGENT = "Mozilla/5.0 (ChemIP trade_controls builder)"
TIMEOUT_SECONDS = 90

_ARTICLE_HEAD = r"(?m)^\s*제\d+조(?:의\d+)?\("
_ADDENDUM_HEAD = re.compile(r"부\s?칙\s*<")


def _html_to_text(raw: str) -> str:
    raw = re.sub(r"(?is)<(script|style).*?</\1>", "", raw)
    raw = re.sub(r"(?i)<br\s*/?>|</p>|</div>", "\n", raw)
    text = html.unescape(re.sub(r"<[^>]+>", "", raw))
    text = re.sub(r"[ \t\xa0]+", " ", text)
    return re.sub(r"\n\s*\n+", "\n", text)


def fetch_text(url: str, cache_dir: Path, refresh: bool = False) -> str:
    """URL 의 본문 평문. 캐시가 있으면 캐시를 쓴다."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / (hashlib.sha1(url.encode("utf-8")).hexdigest() + ".txt")
    if cache_file.exists() and not refresh:
        return cache_file.read_text(encoding="utf-8")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        raw = resp.read().decode("utf-8", "replace")
    text = _html_to_text(raw)
    cache_file.write_text(text, encoding="utf-8")
    return text


def fetch_bytes(url: str, cache_dir: Path, suffix: str, refresh: bool = False) -> bytes:
    """첨부파일(xlsx 등) 원본 바이트. 캐시 규칙은 fetch_text 와 같다."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / (hashlib.sha1(url.encode("utf-8")).hexdigest() + suffix)
    if cache_file.exists() and not refresh:
        return cache_file.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        data = resp.read()
    cache_file.write_bytes(data)
    return data


def _main_body(text: str) -> str:
    m = _ADDENDUM_HEAD.search(text)
    return text if m is None else text[: m.start()]


def _addendum_body(text: str, addendum: str) -> str:
    """'부 칙 <법률 제15512호' 로 시작하는 부칙 구간(다음 부칙 머리 앞까지)."""
    start = re.search(r"부\s?칙\s*<" + re.escape(addendum), text)
    if start is None:
        return ""
    rest = text[start.end():]
    nxt = _ADDENDUM_HEAD.search(rest)
    return rest if nxt is None else rest[: nxt.start()]


def extract_article(text: str, article: str, addendum: str | None = None) -> str:
    """조문 하나(머리부터 다음 조문 머리 앞까지). 못 찾으면 빈 문자열."""
    body = _addendum_body(text, addendum) if addendum else _main_body(text)
    head = re.search(r"(?m)^\s*" + re.escape(article) + r"\(", body)
    if head is None:
        return ""
    tail = body[head.end():]
    nxt = re.search(_ARTICLE_HEAD, tail)
    return body[head.start(): head.end() + (nxt.start() if nxt else len(tail))]


def squash(s: str) -> str:
    """대조용 정규화: 공백을 모두 지운다(줄바꿈 위치 차이를 무시)."""
    return re.sub(r"\s+", "", s)


def contains(article_text: str, quote: str) -> bool:
    return bool(article_text) and squash(quote) in squash(article_text)
