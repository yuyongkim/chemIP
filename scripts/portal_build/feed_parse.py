"""Incident feed: pure functions (text, dates, countries, RSS parsing, name tagging). No I/O.

Used by feed_chemeng.py / feed_fetch.py (collector) and tested in tests/test_incident_feed.py.
RSS bodies are untrusted data: they are only parsed with xml.etree (no DTD or external entities are resolved).
"""
from __future__ import annotations

import datetime as dt
import email.utils
import hashlib
import re
import urllib.parse
import xml.etree.ElementTree as ET

from cas_utils import is_cas

_WS = re.compile(r"\s+")
_TAGS = re.compile(r"<[^>]+>")
_LOST_MIDDOT = re.compile(r"(?<=[가-힣])\?(?=[가-힣])")  # NICS source text lost its "·" as "?" (same fix as incident_store)
_ISO = re.compile(r"^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$")
_KOSHA_DATE = re.compile(r"(\d{4})\s*[.\-]\s*(\d{1,2})\s*[.\-]\s*(\d{1,2})")
_HANGUL = re.compile(r"[가-힣]")
_PARTICLES = "|".join(["으로", "에서", "이", "가", "을", "를", "은", "는", "의", "에", "와", "과", "로", "도", "만"])

# eMARS `location` ends with the country for part of the records ("... - Germany"). Others give none → "".
EMARS_COUNTRIES = {
    "germany": "DE", "brd": "DE", "united kingdom": "GB", "uk": "GB", "france": "FR", "spain": "ES", "italy": "IT",
    "the netherlands": "NL", "netherlands": "NL", "belgium": "BE", "denmark": "DK", "greece": "GR", "bulgaria": "BG",
    "austria": "AT", "sweden": "SE", "finland": "FI", "norway": "NO", "portugal": "PT", "poland": "PL",
    "czech republic": "CZ", "czechia": "CZ", "slovakia": "SK", "slovenia": "SI", "croatia": "HR", "hungary": "HU",
    "romania": "RO", "ireland": "IE", "luxembourg": "LU", "cyprus": "CY", "malta": "MT", "estonia": "EE",
    "latvia": "LV", "lithuania": "LT", "switzerland": "CH",
}


def clean_text(text: str | None) -> str:
    return _LOST_MIDDOT.sub("·", _WS.sub(" ", _TAGS.sub(" ", text or "")).strip())


def truncate(text: str, n: int) -> str:
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


def iso_date(value: str | None, today: dt.date) -> str:
    """YYYY[-MM[-DD]] if plausible (1900 … today), else "" (the Chem_Eng DB has a few typos such as 2202-11-21)."""
    m = _ISO.match((value or "").strip())
    if not m:
        return ""
    y, mo, d = m.groups()
    try:
        first = dt.date(int(y), int(mo or 1), int(d or 1))
    except ValueError:
        return ""
    if first.year < 1900 or first > today:
        return ""
    return m.group(0)


def kosha_date(summary: str | None, today: dt.date) -> str:
    """KOSHA cases have no date column; the text starts with "‘2025.11.00(금) 13:16경" (day masked as 00)."""
    m = _KOSHA_DATE.search((summary or "")[:40])
    if not m:
        return ""
    y, mo, d = (int(x) for x in m.groups())
    if not 1 <= mo <= 12:
        return ""
    text = f"{y:04d}-{mo:02d}" if d == 0 else f"{y:04d}-{mo:02d}-{d:02d}"
    return iso_date(text, today)


def emars_country(location: str | None) -> str:
    tail = (location or "").split(" - ")[-1].split(",")[-1].strip().lower()
    tail = re.sub(r"\s*\(.*\)$", "", tail)
    return EMARS_COUNTRIES.get(tail, "")


def rfc822_date(value: str | None) -> str:
    """RSS pubDate → YYYY-MM-DD (UTC), "" when unreadable."""
    try:
        when = email.utils.parsedate_to_datetime((value or "").strip())
    except (TypeError, ValueError, IndexError):
        return ""
    if when is None:
        return ""
    if when.tzinfo is not None:
        when = when.astimezone(dt.timezone.utc)
    return when.date().isoformat()


def parse_rss(data: bytes) -> list[dict]:
    """RSS 2.0 <item>s → [{title, link, pub_date, description, outlet}] (text only, tags stripped)."""
    text = data.decode("utf-8-sig", errors="replace") if isinstance(data, bytes) else str(data)
    if "<!DOCTYPE" in text[:2000].upper() or "<!ENTITY" in text[:5000].upper():
        raise ValueError("RSS with a DTD is not accepted")
    root = ET.fromstring(text.lstrip("﻿").strip())
    out = []
    for item in root.iter("item"):
        def field(name: str) -> str:
            el = item.find(name)
            return (el.text or "") if el is not None else ""
        out.append({
            "title": clean_text(field("title")),
            "link": field("link").strip(),
            "pub_date": field("pubDate").strip(),
            "description": clean_text(field("description")),
            "outlet": clean_text(field("source")),
        })
    return [r for r in out if r["title"] and r["link"].startswith(("http://", "https://"))]


def https_url(url: str) -> str:
    """CSB RSS links are http://www.csb.gov/...; the site is served over https."""
    return "https://" + url[len("http://"):] if url.startswith("http://www.csb.gov/") else url


def url_slug(url: str) -> str:
    path = urllib.parse.urlparse(url).path.strip("/")
    return path.split("/")[-1] if path else ""


def stable_id(prefix: str, url: str) -> str:
    return f"{prefix}:{hashlib.sha1(url.encode('utf-8')).hexdigest()[:16]}"


def is_hangul(text: str) -> bool:
    return bool(_HANGUL.search(text or ""))


def valid_cas_list(pairs) -> tuple[list[str], list[str]]:
    """[(cas, name)] → parallel (cas list, name list), valid CAS only, first occurrence kept."""
    cas_out, names = [], []
    for cas, name in pairs:
        c = (cas or "").strip()
        if is_cas(c) and c not in cas_out:
            cas_out.append(c)
            names.append((name or "").strip())
    return cas_out, names


class NameTagger:
    """Tags a headline with the CAS of the chemical names it mentions (whole words for Latin names)."""

    def __init__(self, pairs, min_latin: int, min_hangul: int, skip: set[str]):
        self.hangul: list[tuple[re.Pattern, str, str]] = []
        self.latin: list[tuple[re.Pattern, str, str]] = []
        seen = set()
        for cas, name in pairs:
            n = (name or "").strip()
            if not is_cas(cas or "") or not n or n.lower() in skip or (n.lower(), cas) in seen:
                continue
            seen.add((n.lower(), cas))
            if is_hangul(n):
                if len(n) >= min_hangul:
                    # not inside a longer word: no Hangul before it, and after it only a particle or a non-Hangul char
                    # ("여수소방서" must not match 수소; "암모니아가" may match 암모니아)
                    self.hangul.append((re.compile(rf"(?<![가-힣]){re.escape(n)}(?:{_PARTICLES})?(?![가-힣])"), cas, n))
            elif len(n) >= min_latin:
                self.latin.append((re.compile(rf"(?<![\w-]){re.escape(n)}(?![\w-])", re.I), cas, n))

    def tag(self, title: str) -> tuple[list[str], list[str]]:
        hits = []
        for pat, cas, name in self.hangul:
            if pat.search(title):
                hits.append((cas, name))
        for pat, cas, name in self.latin:
            if pat.search(title):
                hits.append((cas, name))
        return valid_cas_list(hits)
