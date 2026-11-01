"""Shared page shell: escaping, design tokens + CSS, <head> (title, meta, canonical, OG, hreflang, JSON-LD), footer.

render.py (substance pages) and hub.py (hub / list pages) both build on this. No page content here.
"""
from __future__ import annotations

import html
import json
import os

import config

esc = html.escape

# design tokens: colours / spacing / type live only here
CSS = """
:root{--bg:#fbfbf9;--fg:#1b1d1f;--muted:#5d6268;--line:#e3e4e0;--card:#fff;--accent:#1f5fa8;--accent-ink:#fff;
--warn:#a1361b;--chip:#eef2f7;--chip-fg:#26384f;--danger-bg:#fde9e4;--gap:16px;--radius:10px;
--font:'Pretendard Variable',Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif;
--mono:ui-monospace,SFMono-Regular,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#141618;--fg:#e8e9ea;--muted:#a3a8ad;--line:#2c3034;--card:#1b1e21;
--accent:#6aa5ec;--accent-ink:#0d1520;--warn:#f08f6f;--chip:#23303e;--chip-fg:#d5e2f2;--danger-bg:#3a211b}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 var(--font);word-break:keep-all;overflow-wrap:anywhere}
a{color:var(--accent)}main{max-width:820px;margin:0 auto;padding:24px 16px 48px}
nav.crumb{font-size:.85rem;color:var(--muted)}nav.crumb a{color:var(--muted)}
h1{font-size:1.65rem;line-height:1.3;margin:10px 0 4px}h1 .en{display:block;font-size:1rem;font-weight:500;color:var(--muted)}
h2{font-size:1.15rem;margin:32px 0 8px;padding-top:16px;border-top:1px solid var(--line)}
h3{font-size:1rem;margin:16px 0 4px}
.meta{color:var(--muted);margin:0 0 12px;font-size:.92rem}.mono{font-family:var(--mono)}
.lead{font-size:1.02rem}.note{color:var(--muted);font-size:.85rem}
.cta{display:inline-block;background:var(--accent);color:var(--accent-ink);padding:11px 18px;border-radius:var(--radius);
text-decoration:none;font-weight:600;margin:8px 0}
.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:6px 0;list-style:none}
.chips li{background:var(--chip);color:var(--chip-fg);border-radius:999px;padding:2px 10px;font-size:.88rem}
.signal{display:inline-block;background:var(--danger-bg);color:var(--warn);font-weight:700;border-radius:6px;padding:0 8px}
ul.plain{padding-left:20px;margin:6px 0}ul.plain li{margin:3px 0}
.sub{color:var(--muted);font-size:.85rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px 16px;padding:0;list-style:none}
.tag{font-size:.78rem;border:1px solid var(--line);border-radius:4px;padding:0 5px;margin-left:4px;color:var(--muted);white-space:nowrap}
table{border-collapse:collapse;width:100%;font-size:.93rem}td,th{border-bottom:1px solid var(--line);padding:6px 4px;text-align:left;vertical-align:top}
footer{margin-top:40px;padding-top:12px;border-top:1px solid var(--line);font-size:.85rem;color:var(--muted)}
@media (max-width:480px){h1{font-size:1.4rem}body{font-size:15.5px}}
""".strip().replace("\n", "")


def url(path: str) -> str:
    return config.SITE + path


def jsonld(obj: dict) -> str:
    text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return '<script type="application/ld+json">' + text.replace("</", "<\\/") + "</script>"


def head(*, lang: str, locale: str, title: str, description: str, path: str, robots: str,
         ld: list[dict], alternates: dict[str, str] | None = None, og_type: str = "website") -> str:
    canonical = url(path)
    parts = [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        f"<title>{esc(title)}</title>",
        f'<meta name="description" content="{esc(description)}">',
        f'<meta name="robots" content="{robots}">',
        f'<link rel="canonical" href="{esc(canonical)}">',
    ]
    for hl, p in (alternates or {}).items():
        parts.append(f'<link rel="alternate" hreflang="{hl}" href="{esc(url(p))}">')
    parts += [
        f'<meta property="og:type" content="{og_type}">',
        f'<meta property="og:site_name" content="{config.SITE_NAME}">',
        f'<meta property="og:locale" content="{locale}">',
        f'<meta property="og:url" content="{esc(canonical)}">',
        f'<meta property="og:title" content="{esc(title)}">',
        f'<meta property="og:description" content="{esc(description)}">',
        '<meta name="twitter:card" content="summary">',
        f'<link rel="icon" href="/{os.path.basename(config.FAVICON_FILE)}" type="image/svg+xml">',
        f"<style>{CSS}</style>",
        *(jsonld(x) for x in ld),
    ]
    return "<head>" + "".join(parts) + "</head>"


def document(*, lang: str, head_html: str, body_html: str) -> str:
    return f'<!doctype html><html lang="{lang}">{head_html}<body><main>{body_html}</main></body></html>\n'


def crumbs(items: list[tuple[str, str | None]]) -> str:
    """Visible breadcrumb; last item has no link."""
    out = []
    for name, href in items:
        out.append(f'<a href="{esc(href)}">{esc(name)}</a>' if href else f"<span>{esc(name)}</span>")
    return '<nav class="crumb" aria-label="breadcrumb">' + " › ".join(out) + "</nav>"


def breadcrumb_ld(items: list[tuple[str, str]]) -> dict:
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": name, "item": url(path)} for i, (name, path) in enumerate(items)]}


def fit(candidates: list[str], limit: int) -> str:
    """First candidate within `limit` characters; else the last one cut with an ellipsis."""
    for c in candidates:
        if len(c) <= limit:
            return c
    return candidates[-1][: limit - 1].rstrip() + "…"


def fit_name(template: str, name: str, limit: int, **kw) -> str:
    """Fill `template` with `name`, shortening only the name (never the CAS / counts) to stay within `limit`."""
    text = template.format(name=name, **kw)
    if len(text) <= limit:
        return text
    room = limit - len(template.format(name="", **kw)) - 1
    return template.format(name=name[: max(room, 1)].rstrip() + "…", **kw)
