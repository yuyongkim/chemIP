"""KOTRA item → ChemIP field mapping, one function per KOTRA service. Pure functions (no I/O).

Split out of kotra_adapter.py; KotraAdapter keeps its old private method names as aliases.
html_to_text / extract_labeled_value here differ from backend/api/text_utils.py (line-break and label rules)
and are kept separate so fraud-case output does not change.
"""
from __future__ import annotations

import re
from html import unescape
from typing import Any, Dict

# 무역 사기 사례 분류: (라벨, 본문에 하나라도 있으면 해당하는 낱말). 위에서부터 먼저 맞는 것.
FRAUD_CATEGORY_RULES = (
    ("비자/초청", ["비자", "초청장", "불법 체류"]),
    ("결제/송금", ["송금", "결제", "T/T", "입금"]),
    ("물류/선적", ["선적", "물류비", "운송", "배송"]),
    ("사칭/위장 바이어", ["사칭", "위장", "가짜", "악용"]),
)


def html_to_text(html_text: str) -> str:
    text = html_text or ""
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</p>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def extract_labeled_value(text: str, labels: list[str]) -> str:
    for label in labels:
        match = re.search(rf"{re.escape(label)}\s*[:：]?\s*([^\n]+)", text)
        if match:
            return match.group(1).strip()
    return ""


def infer_fraud_category(text: str) -> str:
    if not text:
        return ""
    for label, terms in FRAUD_CATEGORY_RULES:
        if any(term in text for term in terms):
            return label
    return "기타"


def map_product_news(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "newsTitl": item.get("newsTitl", "") or item.get("sj", "") or item.get("title", ""),
        "cntryNm": item.get("cntryNm", "") or item.get("natNm", ""),
        "newsWrtDt": item.get("newsWrtDt", "") or item.get("regDt", "") or item.get("writedate", ""),
        "kotraNewsUrl": item.get("kotraNewsUrl", "") or item.get("newsUrl", "") or item.get("url", ""),
        "newsBdt": item.get("newsBdt", "") or item.get("cntntSumar", "") or item.get("summary", ""),
        "cntntSumar": item.get("cntntSumar", "") or item.get("summary", ""),
        "source": item.get("source", "KOTRA"),
    }


def map_strategy(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "title": item.get("title", "") or item.get("newsTitl", ""),
        "country": item.get("country", "") or item.get("cntryNm", "") or item.get("natNm", ""),
        "date": item.get("date", "") or item.get("newsWrtDt", "") or item.get("regDt", ""),
        "url": item.get("url", "") or item.get("newsUrl", "") or item.get("kotraNewsUrl", ""),
        "summary": item.get("summary", "") or item.get("cntntSumar", "") or item.get("newsBdt", ""),
        "source": item.get("source", "KOTRA"),
    }


def map_price(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "itemName": item.get("itemName", "") or item.get("itemNm", "") or item.get("cmdltNm", ""),
        "price": item.get("price", "") or item.get("itemPrc", ""),
        "unit": item.get("unit", "") or item.get("untNm", ""),
        "country": item.get("country", "") or item.get("cntryNm", "") or item.get("natNm", ""),
        "currency": item.get("currency", "") or item.get("mnyUtNm", ""),
        "category": item.get("category", "") or item.get("ctgryNm", ""),
        "date": item.get("date", "") or item.get("regDt", ""),
        "url": item.get("url", "") or item.get("newsUrl", ""),
        "source": item.get("source", "KOTRA"),
    }


def map_fraud(item: Dict[str, Any]) -> Dict[str, Any]:
    plain = html_to_text(item.get("bdtCntnt", "") or item.get("cntntSumar", "") or item.get("content", ""))
    country = item.get("cntryNm", "") or extract_labeled_value(plain, ["발생국가", "국가"])
    period = item.get("regDt", "") or extract_labeled_value(plain, ["발생시기", "시기"])
    amount = extract_labeled_value(plain, ["피해금액", "금액"])
    source_url = item.get("kotraNewsUrl", "") or item.get("newsUrl", "") or item.get("url", "")
    return {
        "title": item.get("title", "") or item.get("newsTitl", "") or "무역 사기 사례",
        "content": item.get("bdtCntnt", "") or item.get("cntntSumar", ""),
        "plainText": plain,
        "date": period,
        "incidentPeriod": period,
        "country": country,
        "amount": amount,
        "category": item.get("ctgryNm", "") or infer_fraud_category(plain),
        "url": source_url,
        "source": item.get("source", "KOTRA"),
    }


def map_country_info(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "countryCode": item.get("isoWd2CntCd", "") or item.get("nat2CntCd", ""),
        "countryName": item.get("natnNm", "") or item.get("countryName", ""),
        "title": item.get("subject", "") or item.get("title", ""),
        "summary": item.get("overview", "") or item.get("content", ""),
        "source": "KOTRA National Info",
    }


def map_import_item(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "hsCode": item.get("hscd", "") or item.get("HSCD", ""),
        "productName": item.get("cmdltName", "") or item.get("productName", ""),
        "regulation": item.get("reglCn", "") or item.get("regulation", ""),
        "country": item.get("probeTgtNatName", "") or item.get("HQURT_NAME", ""),
        "startDate": item.get("regStrDe", "") or item.get("REGL_STR_DE", ""),
        "endDate": item.get("regEndDe", "") or item.get("REGL_END_DE", ""),
        "source": "KOTRA Import Regulation",
    }


def map_enterprise_success(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "title": item.get("titl", "") or item.get("title", ""),
        "country": item.get("natnNm", "") or item.get("country", ""),
        "summary": item.get("cn", "") or item.get("summary", ""),
        "industry": item.get("indust", "") or item.get("industry", ""),
        "company": item.get("entpNm", "") or item.get("company", ""),
        "date": item.get("regDt", "") or item.get("date", ""),
        "source": "KOTRA Enterprise Success",
    }
