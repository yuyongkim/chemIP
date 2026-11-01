"""Glossary term keys for the sitemap section `/chemip?view=glossary&term=<key>`, read from the SPA's own data files.

Data-driven: the term list is never copied here. The glossary screen (frontend/public/chemip/glossary_*.jsx) builds its
entries from three sources (glossary_core.jsx glBuildEntries), and this module reads the same three, read-only:
  1. abbreviations  data.jsx GLOSSARY_KO keys, lower-cased like glAbbrKey ("K-REACH" -> "k_reach")
  2. calculator terms  term_glossary.jsx TERM_GLOSSARY_KO keys
  3. category files  glossary_registry.jsx GLOSSARY_CATS -> glossary_<k>.jsx GLOSSARY_<K>_KO keys
The section is empty until the glossary screen is registered in app.jsx (APP_SCREENS key "glossary"), so the sitemap never
lists URLs that would open the home screen. New terms or categories are picked up on the next build with no change here.
The object-key parser expects the files' layout: one entry per line starting at two-space indent ("  key: {").
"""
from __future__ import annotations

import os
import re

import config

_KEY = re.compile(r"^  ([A-Za-z0-9_]+)\s*:\s*\{", re.M)
_CAT = re.compile(r'\{\s*k:\s*"([a-z0-9_]+)"\s*,\s*ko:\s*(GLOSSARY_[A-Z0-9_]+_KO)\b')


def object_keys(text: str, const_name: str) -> list[str]:
    """Top-level keys of `const <const_name> = { ... };` (entries at two-space indent). Pure."""
    m = re.search(rf"^const {re.escape(const_name)}\s*=\s*\{{\s*$", text, re.M)
    if not m:
        return []
    end = text.find("\n};", m.end())
    body = text[m.end(): end if end >= 0 else len(text)]
    return _KEY.findall(body)


def abbr_key(k: str) -> str:
    """glossary_core.jsx glAbbrKey. Pure."""
    return re.sub(r"[^a-z0-9]+", "_", k.lower())


def registry_cats(text: str) -> list[tuple[str, str]]:
    """glossary_registry.jsx -> [(category key, KO const name)]. Pure."""
    return _CAT.findall(text)


def view_registered(app_text: str, view: str) -> bool:
    """True if app.jsx APP_SCREENS has a screen with this key. Pure."""
    return re.search(rf'\{{\s*k:\s*"{re.escape(view)}"', app_text) is not None


def _read(name: str) -> str:
    path = os.path.join(config.CHEMIP_UI, name)
    if not os.path.isfile(path):
        return ""
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def term_keys() -> list[str]:
    """Every glossary term key in screen order (abbreviations, calculator terms, categories), first one wins; [] when the
    glossary screen is not registered."""
    if not view_registered(_read("app.jsx"), config.GLOSSARY_VIEW):
        return []
    keys = [abbr_key(k) for k in object_keys(_read("data.jsx"), "GLOSSARY_KO")]
    keys += object_keys(_read("term_glossary.jsx"), "TERM_GLOSSARY_KO")
    for cat, const in registry_cats(_read("glossary_registry.jsx")):
        keys += object_keys(_read(f"glossary_{cat}.jsx"), const)
    seen: set[str] = set()
    return [k for k in keys if not (k in seen or seen.add(k))]


def glossary_query(term: str = "", lang: str = "ko") -> str:
    """'?view=glossary&term=<key>' (+ '&lang=en'), the SPA link (glossary_link.jsx glossaryHref + lang.jsx). Pure."""
    q = f"?view={config.GLOSSARY_VIEW}" + (f"&term={term}" if term else "")
    return q + ("&lang=en" if lang == "en" else "")
