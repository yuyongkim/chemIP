"""URL paths of generated pages and their files under config.OUT. Defined once; templates and validators use these.

Substance pages keep the live Next URL form exactly: /chemip/cas/<CAS> with no trailing slash. On Pages that URL is
served (200, no redirect) from the file chemip/cas/<CAS>.html ("pretty URLs", same as chemip.html -> /chemip); the
slash form /chemip/cas/<CAS>/ answers 308 to it. Hub and list pages are directories (trailing slash, index.html).
"""
from __future__ import annotations

import os
import posixpath

import config

PAGE_EXT = ".html"
INDEX = "index.html"


def cas_path(cas: str, lang: str = "ko") -> str:
    return f"{config.EN_CAS_BASE if lang == 'en' else config.CAS_BASE}{cas}"


def hub_path(lang: str = "ko") -> str:
    return config.EN_CAS_BASE if lang == "en" else config.CAS_BASE


def list_slug(list_id: str) -> str:
    return list_id.lower().replace("_", "-")


def list_path(list_id: str) -> str:
    return f"{config.LIST_BASE}{list_slug(list_id)}/"


def file_for(path: str) -> str:
    """'/chemip/cas/' -> OUT/chemip/cas/index.html ; '/chemip/cas/71-43-2' -> OUT/chemip/cas/71-43-2.html ;
    '/sitemap.xml' -> OUT/sitemap.xml (a last segment with an extension is a file as-is)."""
    rel = path.lstrip("/")
    if not rel or rel.endswith("/"):
        rel += INDEX
    elif "." not in posixpath.basename(rel):
        rel += PAGE_EXT
    return os.path.join(config.OUT, *rel.split("/"))


def path_for(file: str) -> str:
    """Inverse of file_for for generated pages: the URL path Pages serves the file at."""
    rel = os.path.relpath(file, config.OUT).replace(os.sep, "/")
    if rel == INDEX or rel.endswith("/" + INDEX):
        return "/" + rel[: -len(INDEX)]
    return "/" + (rel[: -len(PAGE_EXT)] if rel.endswith(PAGE_EXT) else rel)
