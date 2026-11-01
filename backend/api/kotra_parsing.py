"""KOTRA / data.go.kr payload parsing: JSON or XML body → normalized dict → (items, total).

Pure functions (no I/O). Split out of kotra_adapter.py; KotraAdapter keeps its old private method names as aliases.
These differ on purpose from backend/api/text_utils.py (attributes kept as "@name", header resultCode check,
totalCnt/itemList variants), so they are not merged with it.
"""
from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from typing import Any, Dict

from backend.api.text_utils import normalize_text


def parse_json(raw: str) -> Dict[str, Any]:
    try:
        if not raw:
            return {}
        return normalize_text(json.loads(raw))
    except Exception:
        return {}


def parse_xml(raw: bytes) -> Dict[str, Any]:
    try:
        root = ET.fromstring(raw)
        return element_to_dict(root)
    except Exception:
        return {}


def element_to_dict(element: ET.Element) -> Any:
    if len(element) == 0:
        text = element.text.strip() if element.text else ""
        return normalize_text(text)
    result: Dict[str, Any] = {}
    for child in element:
        child_value = element_to_dict(child)
        if child.tag in result:
            if not isinstance(result[child.tag], list):
                result[child.tag] = [result[child.tag]]
            result[child.tag].append(child_value)
        else:
            result[child.tag] = child_value
    if element.attrib:
        result.update({f"@{k}": normalize_text(v) for k, v in element.attrib.items()})
    return result


def _body_items(body: dict) -> Any:
    if isinstance(body.get("items"), dict):
        nested = body["items"]
        if isinstance(nested, dict) and "item" in nested:
            return nested["item"]
        return []
    if "items" in body:
        return body["items"]
    if "itemList" in body:
        return body["itemList"]
    if isinstance(body.get("item"), list):
        return body["item"]
    if isinstance(body.get("item"), dict):
        return [body["item"]]
    candidate = body.get("itemList", body.get("item", body.get("items")))
    if isinstance(candidate, list):
        return candidate
    if isinstance(candidate, dict):
        return [candidate]
    return []


def _body_total(body: dict, items: Any) -> int:
    total = 0
    if isinstance(body.get("totalCount"), (int, str)):
        try:
            total = int(body.get("totalCount", 0))
        except Exception:
            total = 0
    if isinstance(body.get("totalCnt"), (int, str)):
        try:
            total = int(body.get("totalCnt", 0))
        except Exception:
            pass
    if isinstance(body.get("numOfRows"), (int, str)) and total == 0 and isinstance(body.get("pageNo"), (int, str)):
        total = len(items)
    return total


def extract_items(data: Dict[str, Any]) -> tuple[list[Any], int]:
    """(normalized items, total). A header resultCode other than "00" means no items."""
    if not isinstance(data, dict):
        return [], 0

    items: Any = []
    total = 0
    response = data.get("response", data)

    if isinstance(response, dict):
        header = response.get("header")
        if isinstance(header, dict):
            result_code = str(header.get("resultCode", ""))
            if result_code and result_code != "00":
                return [], 0
        body = response.get("body", response)
    else:
        body = data

    if isinstance(body, dict):
        items = _body_items(body)
        total = _body_total(body, items)

    if isinstance(items, dict):
        items = items.get("item", [])
    if isinstance(items, dict):
        items = [items]
    if not isinstance(items, list):
        items = []

    return [normalize_text(item) for item in items], total or len(items)
