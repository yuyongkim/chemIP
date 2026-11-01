"""RSS 2.0 for the regulation change feed (v1/reg/changes.xml). Pure: items in, UTF-8 bytes out.

item = {title, link, date: "YYYY-MM-DD", guid, description}. Text is escaped by xml.sax.saxutils (no CDATA).
"""
from __future__ import annotations

import datetime as dt
from email.utils import format_datetime
from xml.sax.saxutils import escape


def rfc822(day: str) -> str:
    try:
        d = dt.datetime.strptime(day, "%Y-%m-%d").replace(tzinfo=dt.timezone.utc)
    except ValueError:
        d = dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc)
    return format_datetime(d)


def build_rss(channel: dict, items: list[dict]) -> bytes:
    """channel = {title, link, description, self_url, language, built: "YYYY-MM-DD"}."""
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>',
           f"<title>{escape(channel['title'])}</title>", f"<link>{escape(channel['link'])}</link>",
           f"<description>{escape(channel['description'])}</description>",
           f"<language>{escape(channel.get('language', 'ko'))}</language>",
           f"<lastBuildDate>{rfc822(channel['built'])}</lastBuildDate>",
           f'<atom:link href="{escape(channel["self_url"])}" rel="self" type="application/rss+xml"/>']
    for it in items:
        out.append("<item>"
                   f"<title>{escape(it['title'])}</title>"
                   f"<link>{escape(it['link'])}</link>"
                   f'<guid isPermaLink="false">{escape(it["guid"])}</guid>'
                   f"<pubDate>{rfc822(it['date'])}</pubDate>"
                   f"<description>{escape(it.get('description') or '')}</description>"
                   "</item>")
    out.append("</channel></rss>")
    return "\n".join(out).encode("utf-8")
