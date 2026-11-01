"""Text normalization and parsing utilities extracted from kotra_adapter.py.

Provides reusable functions for XML/JSON response parsing, HTML-to-text
conversion, and UTF-8 encoding repair used across API adapters.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from html import unescape
from typing import Any, Dict


def coalesce(*values):
    """Return the first non-empty value."""
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and value.strip() == "":
            continue
        return value
    return ""


def normalize_text(obj):
    """Recursively normalize text: repair UTF-8 and unescape HTML entities."""
    if isinstance(obj, str):
        text = obj.strip()
        if not text:
            return ""
        try:
            repaired = text.encode("latin1").decode("utf-8")
            if re.search(r"[가-힣]", repaired) and not re.search(r"[가-힣]", text):
                return repaired
        except Exception:
            pass
        return unescape(text)
    if isinstance(obj, list):
        return [normalize_text(item) for item in obj]
    if isinstance(obj, dict):
        return {key: normalize_text(value) for key, value in obj.items()}
    return obj


def parse_json_response(raw: str) -> Dict[str, Any]:
    """Parse a JSON string, returning empty dict on failure."""
    import json
    try:
        return json.loads(raw)
    except Exception:
        return {}


def parse_xml_response(raw: bytes) -> Dict[str, Any]:
    """Parse XML bytes into a nested dict."""
    try:
        root = ET.fromstring(raw)
        return element_to_dict(root)
    except Exception:
        return {}


def element_to_dict(element: ET.Element) -> Any:
    """Recursively convert an XML Element to a Python dict."""
    children = list(element)
    if not children:
        return (element.text or "").strip()
    result: Dict[str, Any] = {}
    for child in children:
        tag = child.tag
        value = element_to_dict(child)
        if tag in result:
            existing = result[tag]
            if isinstance(existing, list):
                existing.append(value)
            else:
                result[tag] = [existing, value]
        else:
            result[tag] = value
    return result


def html_to_text(html_text: str) -> str:
    """Strip HTML tags and convert to plain text."""
    if not html_text:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", html_text, flags=re.IGNORECASE)
    text = re.sub(r"<p\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_labeled_value(text: str, labels: list[str]) -> str:
    """Extract value after a label like 'Name: value' from text."""
    for label in labels:
        pattern = rf"{re.escape(label)}\s*[:：]\s*(.+?)(?:\n|$)"
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    return ""


def extract_items(data: Dict[str, Any]) -> tuple[list[Any], int]:
    """Extract item list and total count from various API response structures.

    Handles nested structures like body.items.item, response.body.items, etc.
    Returns (items_list, total_count).
    """
    total = 0

    # Try standard paths
    for path in [
        lambda d: d.get("response", {}).get("body", {}),
        lambda d: d.get("body", {}),
        lambda d: d,
    ]:
        body = path(data)
        if not isinstance(body, dict):
            continue

        total = int(body.get("totalCount", 0) or body.get("numOfRows", 0) or 0)

        items_raw = body.get("items", body.get("item", []))
        if isinstance(items_raw, dict):
            inner = items_raw.get("item", [])
            if isinstance(inner, list):
                return inner, total or len(inner)
            if isinstance(inner, dict):
                return [inner], total or 1
            # items_raw itself is the single item
            return [items_raw], total or 1
        if isinstance(items_raw, list):
            return items_raw, total or len(items_raw)

    return [], total
