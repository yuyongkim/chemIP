"""Incident feed: live RSS sources → feed items. CSB news RSS (public domain) and Google News RSS search
(press headlines: title, link, date and outlet only — no article text).

fetch_* functions do the network call; rss_to_* functions are pure (tested with saved bodies).
"""
from __future__ import annotations

import time
import urllib.parse
import urllib.request

import feed_config as C
from feed_parse import NameTagger, https_url, is_hangul, parse_rss, rfc822_date, stable_id, truncate, url_slug


def http_get(url: str) -> bytes:
    last: Exception | None = None
    for attempt in range(1, C.HTTP_RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": C.USER_AGENT, "Accept": "application/rss+xml, application/xml, */*"})
            with urllib.request.urlopen(req, timeout=C.HTTP_TIMEOUT) as resp:
                data = resp.read(C.MAX_DOWNLOAD_BYTES + 1)
            if len(data) > C.MAX_DOWNLOAD_BYTES:
                raise ValueError(f"download exceeds cap: {url[:120]}")
            return data
        except ValueError:
            raise
        except Exception as exc:  # network / HTTP error: retry
            last = exc
            time.sleep(2 * attempt)
    raise RuntimeError(f"GET failed: {url[:160]}: {str(last)[:200]}")


def _base(source_id: str, rid: str, date: str, title: str, url: str, fetched_at: str) -> dict:
    return {"id": f"{source_id}:{rid}", "date": date, "title": title, "url": url, "source_id": source_id,
            "cas": [], "chem_names": [], "equipment": [], "discipline": [], "country": "", "summary": "",
            "lang": "", "fetched_at": fetched_at}


def rss_to_csb(data: bytes, fetched_at: str, tagger: NameTagger | None = None) -> list[dict]:
    """CSB "All News" RSS → items (country US, summary = the item's short description)."""
    out = []
    for r in parse_rss(data):
        url = https_url(r["link"])
        it = _base("csb_rss", url_slug(url) or stable_id("x", url).split(":")[1], rfc822_date(r["pub_date"]),
                   r["title"], url, fetched_at)
        it.update(country="US", lang="en", summary=truncate(r["description"], C.SUMMARY_CHARS))
        if tagger:
            it["cas"], it["chem_names"] = tagger.tag(r["title"])
        out.append(it)
    return out


def rss_to_press(data: bytes, fetched_at: str, tagger: NameTagger | None = None) -> list[dict]:
    """Google News RSS → items with title, link, date only (summary stays empty: title and link only)."""
    out = []
    for r in parse_rss(data):
        it = _base("press_gnews", stable_id("x", r["link"]).split(":")[1], rfc822_date(r["pub_date"]),
                   r["title"], r["link"], fetched_at)
        it["lang"] = "ko" if is_hangul(r["title"]) else "en"
        if tagger:
            it["cas"], it["chem_names"] = tagger.tag(r["title"])
        out.append(it)
    return out


def press_url(query: dict) -> str:
    return f"{C.PRESS_RSS_URL}?{urllib.parse.urlencode(query)}"


def fetch_csb(fetched_at: str, tagger=None, get=http_get) -> list[dict]:
    return rss_to_csb(get(C.CSB_RSS_URL), fetched_at, tagger)


def fetch_press(fetched_at: str, tagger=None, get=http_get) -> tuple[list[dict], list[str]]:
    """All press queries; a failed query is reported and skipped. Same link from two queries → one item."""
    items: dict[str, dict] = {}
    errors = []
    for q in C.PRESS_QUERIES:
        try:
            for it in rss_to_press(get(press_url(q)), fetched_at, tagger):
                items.setdefault(it["id"], it)
        except Exception as exc:  # one query failing must not drop the others
            errors.append(f"{q['q']}: {str(exc)[:160]}")
    return list(items.values()), errors
