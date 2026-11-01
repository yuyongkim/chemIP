"""Live sitemap vs static sitemap: every URL Search Console knows today must exist, unchanged, in the static site.

Fetches config.LIVE_SITEMAP_URL once (read-only GET, bot UA). For each live URL: present in the static sitemap,
page file exists, page is indexable and its canonical is that same URL. Extra static URLs are reported, not failed.
"""
from __future__ import annotations

import os
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

import config
import htmlscan
import urls

NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
EXTERNAL_OK = {config.APP_PATH}  # the SPA itself is deployed by the Pages assemble job, not by this generator


def locs(xml_bytes: bytes) -> list[str]:
    root = ET.fromstring(xml_bytes)
    return [u.findtext("s:loc", namespaces=NS).strip() for u in root.findall("s:url", NS)]


def fetch_live() -> bytes:
    req = urllib.request.Request(config.LIVE_SITEMAP_URL, headers={"User-Agent": config.API_USER_AGENT})
    with urllib.request.urlopen(req, timeout=config.API_TIMEOUT) as r:
        return r.read()


def page_problem(url: str) -> str:
    """'' if the static page for this live URL exists, is indexable and canonicalises to the same URL."""
    path = urlsplit(url).path
    if path in EXTERNAL_OK:
        return ""
    file = urls.file_for(path)
    if not os.path.isfile(file):
        return "no file"
    with open(file, encoding="utf-8") as fh:
        s = htmlscan.scan(fh.read())
    if "noindex" in s.meta.get("robots", ""):
        return "noindex"
    if s.canonical != url:
        return f"canonical {s.canonical}"
    return ""


def run() -> dict:
    live = locs(fetch_live())
    with open(os.path.join(config.OUT, "sitemap.xml"), "rb") as fh:
        static = locs(fh.read())
    live_set, static_set = set(live), set(static)
    missing = sorted(live_set - static_set)
    extra = sorted(static_set - live_set)
    bad = {u: p for u in sorted(live_set) if (p := page_problem(u))}
    return {
        "live_urls": len(live), "static_urls": len(static), "live_duplicates": len(live) - len(live_set),
        "missing_in_static": len(missing), "extra_in_static": len(extra),
        "live_url_page_problems": len(bad),
        "missing_examples": missing[:20], "extra_examples": extra[:20], "page_problem_examples": dict(list(bad.items())[:20]),
    }
