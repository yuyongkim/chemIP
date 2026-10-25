"""law.go.kr DRF client: search a statute / 고시, download its XML, extract 별표 text.

Downloads are untrusted data. They are written under RAW_ROOT and only parsed
with xml.etree (no entity expansion of external resources in stdlib ElementTree).
"""
from __future__ import annotations

import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

from . import config


def _get(url: str) -> bytes:
    last: Exception | None = None
    for attempt in range(1, config.HTTP_RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": config.USER_AGENT})
            with urllib.request.urlopen(req, timeout=config.HTTP_TIMEOUT) as resp:
                data = resp.read(config.MAX_DOWNLOAD_BYTES + 1)
            if len(data) > config.MAX_DOWNLOAD_BYTES:
                raise ValueError(f"download exceeds cap: {url}")
            return data
        except ValueError:
            raise
        except Exception as exc:  # network: retry with backoff
            last = exc
            time.sleep(2 * attempt)
    raise RuntimeError(f"GET failed: {url}: {last}")


def download(url: str) -> bytes:
    """Public GET with retries and size cap (bytes are untrusted)."""
    return _get(url)


def _cached(path: Path, url: str, refresh: bool) -> bytes:
    if path.exists() and not refresh:
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    data = _get(url)
    path.write_bytes(data)
    return data


@dataclass
class LawDoc:
    name: str
    mst: str            # 법령일련번호 (or 행정규칙일련번호)
    promulgated: str    # YYYY-MM-DD
    effective: str      # YYYY-MM-DD
    kind: str           # 법률 / 대통령령 / 부령 / 고시
    root: ET.Element
    raw_path: Path


def _iso(d: str) -> str:
    d = (d or "").strip()
    return f"{d[:4]}-{d[4:6]}-{d[6:8]}" if len(d) == 8 and d.isdigit() else d


def search(name: str, target: str = "law", refresh: bool = False) -> list[dict]:
    """Return search hits [{name, mst, promulgated, effective, kind}] for an exact-ish name."""
    q = urllib.parse.urlencode({"OC": config.LAW_OC, "target": target, "type": "XML",
                                "query": name, "display": 100})
    safe = "".join(ch for ch in name if ch.isalnum())[:60]
    raw = _cached(config.RAW_ROOT / "search" / f"{target}_{safe}.xml",
                  f"{config.LAW_BASE}/DRF/lawSearch.do?{q}", refresh)
    root = ET.fromstring(raw)
    hits = []
    tag = "law" if target == "law" else "admrul"
    for el in root.iter(tag):
        if target == "law":
            hits.append({"name": (el.findtext("법령명한글") or "").strip(),
                         "mst": el.findtext("법령일련번호"),
                         "promulgated": _iso(el.findtext("공포일자")),
                         "effective": _iso(el.findtext("시행일자")),
                         "kind": el.findtext("법령구분명"),
                         "status": el.findtext("현행연혁코드")})
        else:
            hits.append({"name": (el.findtext("행정규칙명") or "").strip(),
                         "mst": el.findtext("행정규칙일련번호"),
                         "promulgated": _iso(el.findtext("발령일자")),
                         "effective": _iso(el.findtext("시행일자")),
                         "kind": el.findtext("행정규칙종류"),
                         "number": el.findtext("발령번호"),
                         "status": el.findtext("현행연혁구분")})
    return hits


def fetch_law(name: str, refresh: bool = False) -> LawDoc:
    """Download the current version of a statute by exact name."""
    hits = [h for h in search(name, "law", refresh) if h["name"] == name]
    if not hits:
        raise LookupError(f"law not found on law.go.kr: {name}")
    h = hits[0]
    q = urllib.parse.urlencode({"OC": config.LAW_OC, "target": "law", "type": "XML",
                                "MST": h["mst"]})
    path = config.RAW_ROOT / "law" / f"{h['mst']}.xml"
    raw = _cached(path, f"{config.LAW_BASE}/DRF/lawService.do?{q}", refresh)
    return LawDoc(name, h["mst"], h["promulgated"], h["effective"], h["kind"],
                  ET.fromstring(raw), path)


def fetch_admrul(name: str, refresh: bool = False) -> LawDoc:
    """Download the current version of an administrative rule (고시) by exact name."""
    hits = [h for h in search(name, "admrul", refresh) if h["name"] == name]
    hits = [h for h in hits if (h.get("status") or "현행") == "현행"] or hits
    if not hits:
        raise LookupError(f"admrul not found on law.go.kr: {name}")
    h = hits[0]
    q = urllib.parse.urlencode({"OC": config.LAW_OC, "target": "admrul", "type": "XML",
                                "ID": h["mst"]})
    path = config.RAW_ROOT / "admrul" / f"{h['mst']}.xml"
    raw = _cached(path, f"{config.LAW_BASE}/DRF/lawService.do?{q}", refresh)
    doc = LawDoc(name, h["mst"], h["promulgated"], h["effective"], h.get("kind") or "고시",
                 ET.fromstring(raw), path)
    doc.number = h.get("number")  # type: ignore[attr-defined]
    return doc


def annexes(doc: LawDoc) -> list[dict]:
    """List 별표 units: [{no, branch, kind, title, text}]."""
    out = []
    for unit in doc.root.iter("별표단위"):
        out.append({"no": int(unit.findtext("별표번호") or 0),
                    "branch": int(unit.findtext("별표가지번호") or 0),
                    "kind": unit.findtext("별표구분"),
                    "title": (unit.findtext("별표제목") or "").strip(),
                    "text": unit.findtext("별표내용") or ""})
    return out


def annex(doc: LawDoc, no: int, branch: int = 0) -> dict:
    for a in annexes(doc):
        if a["no"] == no and a["branch"] == branch and a["kind"] in (None, "별표"):
            return a
    raise LookupError(f"{doc.name}: 별표 {no}의{branch} not found")


def article_text(doc: LawDoc, article_no: int, branch: int = 0) -> str:
    """Full text (조문내용 + 항 + 호) of one article."""
    for unit in doc.root.iter("조문단위"):
        if unit.findtext("조문여부") != "조문":
            continue
        if int(unit.findtext("조문번호") or 0) != article_no:
            continue
        if int(unit.findtext("조문가지번호") or 0) != branch:
            continue
        return "\n".join(t.strip() for t in unit.itertext() if t.strip())
    raise LookupError(f"{doc.name}: 제{article_no}조 not found")
