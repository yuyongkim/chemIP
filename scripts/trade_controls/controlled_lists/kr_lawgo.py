"""law.go.kr DRF (Open API) access: find the current law/admin rule and save its XML."""
from __future__ import annotations

import os
import re
import urllib.parse
from pathlib import Path

from common import fetch, strip_cdata


def _oc(cfg: dict) -> str:
    return os.environ.get(cfg["oc_env"], cfg["oc_default"])


def find_current(cfg: dict, query: str, target: str, raw_dir: Path, offline: bool) -> dict:
    """Search law.go.kr and return {'id':..., 'name':..., 'date':..., 'number':...} for the exact title."""
    url = cfg["search_url"].format(oc=_oc(cfg), target=target, query=urllib.parse.quote(query))
    safe = re.sub(r"[^0-9A-Za-z가-힣]", "_", query)[:40]
    path = fetch(url, raw_dir / "kr_law" / f"search_{target}_{safe}.xml", offline)
    xml = strip_cdata(path.read_text(encoding="utf-8"))
    if target == "law":
        pat = (r"<법령일련번호>(\d+)</법령일련번호>.*?<법령명한글>(.*?)</법령명한글>.*?"
               r"<공포일자>(\d+)</공포일자><공포번호>(\d+)</공포번호>.*?<시행일자>(\d+)</시행일자>")
        for m in re.finditer(pat, xml, flags=re.S):
            if m.group(2).strip() == query:
                return {"id": m.group(1), "name": m.group(2).strip(), "promulgated": m.group(3),
                        "number": m.group(4), "effective": m.group(5)}
    else:
        pat = (r"<행정규칙일련번호>(\d+)</행정규칙일련번호><행정규칙명>(.*?)</행정규칙명>.*?"
               r"<발령일자>(\d+)</발령일자><발령번호>([^<]+)</발령번호>.*?<시행일자>(\d+)</시행일자>")
        for m in re.finditer(pat, xml, flags=re.S):
            if m.group(2).strip() == query:
                return {"id": m.group(1), "name": m.group(2).strip(), "promulgated": m.group(3),
                        "number": m.group(4), "effective": m.group(5)}
    raise LookupError(f"law.go.kr: exact title not found: {query}")


def download_xml(cfg: dict, meta: dict, target: str, dest: Path, offline: bool) -> Path:
    if target == "law":
        url = cfg["law_url"].format(oc=_oc(cfg), mst=meta["id"])
    else:
        url = cfg["admrul_url"].format(oc=_oc(cfg), id=meta["id"])
    return fetch(url, dest, offline)


def annex_text(xml_path: Path, title_contains: str) -> str:
    """Return the plain text (별표내용) of the annex whose title contains title_contains."""
    xml = strip_cdata(xml_path.read_text(encoding="utf-8"))
    for block in re.findall(r"<별표단위.*?</별표단위>", xml, flags=re.S):
        title = re.search(r"<별표제목>(.*?)</별표제목>", block, flags=re.S)
        if title and title_contains in title.group(1):
            body = re.search(r"<별표내용>(.*?)</별표내용>", block, flags=re.S)
            return body.group(1) if body else ""
    raise LookupError(f"annex not found: {title_contains} in {xml_path.name}")


def full_text(xml_path: Path) -> str:
    return strip_cdata(xml_path.read_text(encoding="utf-8"))
