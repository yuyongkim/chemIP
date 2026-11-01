"""KOSHA MSDS section XML (terminology.db msds_details.xml_data) → {item code: text} (pure functions).

The XML is the data.go.kr KOSHA MSDS response: <item><msdsItemCode>I14</msdsItemCode><itemDetail>-11 ℃|   ※출처 : ICSC
</itemDetail>...</item>. Item texts are HTML-escaped twice ("&amp;gt; 93.3 ℃" = "> 93.3 ℃"), so they are unescaped
until stable. Item codes per section (checked over all 48,964 records, 2026-10-31):
  9  I0202 성상 · I08 pH · I10 녹는점 · I12 끓는점 · I14 인화점 · I20 폭발 범위(상한/하한) · I22 증기압 · I24 용해도
     I26 증기밀도 · I28 비중 · I30 log Kow · I32 자연발화온도 · I34 분해온도 · I36 점도 · I38 분자량
  14 N02 UN 번호 · N04 적정선적명 · N06 운송 위험 등급 · N08 용기 등급 · N10 해양오염물질 · N1202/N1204 EmS(화재/유출)
  8  H0202 국내 노출기준 · H0204 ACGIH(값 저장 금지 — 읽지 않는다)
  3  C06 CAS 번호
"""
from __future__ import annotations

import html
import re

_ITEM_RE = re.compile(r"<item>(.*?)</item>", re.S)
_CODE_RE = re.compile(r"<msdsItemCode>(.*?)</msdsItemCode>", re.S)
_DETAIL_RE = re.compile(r"<itemDetail>(.*?)</itemDetail>", re.S)


def unescape(text: str) -> str:
    prev, cur = None, text
    for _ in range(4):
        if cur == prev:
            break
        prev, cur = cur, html.unescape(cur)
    return cur


def parse_items(xml: str | None) -> dict[str, str]:
    """{item code: unescaped, stripped text} for the items that have a text. First occurrence of a code wins."""
    out: dict[str, str] = {}
    for m in _ITEM_RE.finditer(xml or ""):
        body = m.group(1)
        code = _CODE_RE.search(body)
        detail = _DETAIL_RE.search(body)
        if not code or not detail:
            continue
        key = code.group(1).strip()
        text = unescape(detail.group(1)).strip()
        if key and text and key not in out:
            out[key] = text
    return out
