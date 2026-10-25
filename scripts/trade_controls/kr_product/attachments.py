"""Download a law.go.kr attachment (flDownload.do?flSeq=...) into RAW_ROOT and return text.

Used when a 고시 publishes its tables only as images in the XML and the full text only as
an HWP attachment. Files are untrusted: stored under RAW_ROOT, parsed by the stdlib HWP
reader in kr_env.hwp_text (bounded, nothing executed).
"""
from __future__ import annotations

import re
from pathlib import Path

from kr_env import hwp_text

from . import config, lawsrc


def attachment_links(doc: lawsrc.LawDoc) -> list[tuple[str, str]]:
    """[(file name, url)] from the 첨부파일 block of an admrul XML."""
    names = [(e.text or "").strip() for e in doc.root.iter("첨부파일명")]
    links = [(e.text or "").strip() for e in doc.root.iter("첨부파일링크")]
    return list(zip(names, links))


def fetch(url: str, sub: str, filename: str, refresh: bool = False) -> Path:
    if not re.match(r"^https?://(www\.)?law\.go\.kr/flDownload\.do\?flSeq=\d+$", url):
        raise ValueError(f"unexpected attachment url: {url}")
    path = config.RAW_ROOT / sub / filename
    if refresh or not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(lawsrc.download(url))
    return path


def hwp_lines(path: Path) -> list[str]:
    text = hwp_text.extract_text(path.read_bytes())
    return [ln.strip() for ln in text.splitlines() if ln.strip()]
