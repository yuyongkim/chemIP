"""sitemap.xml (indexable pages only, real lastmod from data retrieval dates, no changefreq/priority) and robots.txt.

Entries may carry hreflang alternates (xhtml:link, Google's sitemap form): the SPA's Korean/English pair (?lang=en) and the
glossary term pages (glossary_terms.py). spa_entries() builds those; build.py adds them after the static pages.
"""
from __future__ import annotations

from xml.sax.saxutils import escape, quoteattr

import config
import glossary_terms
import layout

ROBOTS = """User-agent: *
Allow: /
Disallow: /api/

Sitemap: {site}/sitemap.xml
"""

XHTML_NS = "http://www.w3.org/1999/xhtml"


def sitemap_xml(entries: list[tuple]) -> str:
    """entries: (path, lastmod 'YYYY-MM-DD' or '') or (path, lastmod, {hreflang: path}). Paths may carry a query."""
    rows, with_alt = [], False
    for entry in entries:
        path, lastmod = entry[0], entry[1]
        alts = entry[2] if len(entry) > 2 else None
        lm = f"<lastmod>{lastmod}</lastmod>" if lastmod else ""
        links = ""
        if alts:
            with_alt = True
            links = "".join(f'<xhtml:link rel="alternate" hreflang={quoteattr(hl)} href={quoteattr(layout.url(p))}/>'
                            for hl, p in alts.items())
        rows.append(f"<url><loc>{escape(layout.url(path))}</loc>{lm}{links}</url>")
    ns = f' xmlns:xhtml="{XHTML_NS}"' if with_alt else ""
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"{ns}>\n' + "\n".join(rows) + "\n</urlset>\n")


def lang_alternates(query_for) -> dict[str, str]:
    """{hreflang: path} for every SPA language plus x-default. query_for(lang) -> query string ('' or '?…'). Pure."""
    alts = {lang: config.APP_PATH + query_for(lang) for lang in config.APP_LANG_QUERY}
    alts["x-default"] = alts[config.APP_X_DEFAULT]
    return alts


def spa_entries(terms: list[str] | None = None) -> list[tuple]:
    """The SPA home in each language, then the glossary hub and one URL per term in each language (all with alternates)."""
    home = lang_alternates(lambda lang: config.APP_LANG_QUERY[lang])
    out = [(home[lang], "", home) for lang in config.APP_LANG_QUERY]
    if terms is None:
        terms = glossary_terms.term_keys() if config.GLOSSARY_IN_SITEMAP else []
    if terms:
        for term in [""] + list(terms):  # "" = the glossary hub ?view=glossary
            alts = lang_alternates(lambda lang, t=term: glossary_terms.glossary_query(t, lang))
            out += [(alts[lang], "", alts) for lang in config.APP_LANG_QUERY]
    return out


def robots_txt() -> str:
    return ROBOTS.format(site=config.SITE)
