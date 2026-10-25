"""Quote article text from downloaded law / 고시 XML and assemble permit items.

Permit items follow the shape of kr_permits_env.json (permit_id, name, law, kind,
trigger{list_ids, condition}, authority, legal_basis, source_url, verified_text,
verified_sources). verified_text is always text read from the downloaded XML.
"""
from __future__ import annotations

import re

from kr_env import config as env_config

from . import lawsrc


def _admrul_article(doc: lawsrc.LawDoc, no: int, branch: int = 0) -> str:
    head = f"제{no}조" + (f"의{branch}" if branch else "")
    for el in doc.root.iter("조문내용"):
        t = (el.text or "").strip()
        if re.match(rf"^{head}(?![0-9]|의[0-9])", t):
            return t
    raise LookupError(f"{doc.name}: {head} not found")


def article(doc: lawsrc.LawDoc, no: int, branch: int = 0, admrul: bool = False,
            contains: str | None = None, max_len: int = 900) -> str:
    """Article text (whole, or only the lines containing `contains`)."""
    text = _admrul_article(doc, no, branch) if admrul else lawsrc.article_text(doc, no, branch)
    if contains:
        parts = [p.strip() for p in text.split("\n") if contains in p]
        if not parts:
            raise LookupError(f"{doc.name} 제{no}조: '{contains}' not in text")
        text = " ".join(parts)
        no = None
    return clean(text, no, branch)[:max_len]


def clean(text: str, no: int | None = None, branch: int = 0) -> str:
    """Drop the DRF metadata before '제N조(' and the doubled 항/호 numbers ('① ①', '1. 1.')."""
    text = re.sub(r"\s+", " ", text).strip()
    if no is not None:
        head = f"제{no}조" + (f"의{branch}" if branch else "")
        i = text.find(head + "(")
        if i > 0:
            text = text[i:]
    text = re.sub(r"([①-⑳])\s*(?:(?:개정|신설|전문개정)\s*[0-9.,\s]+?)?\s*\1", r"\1", text)
    text = re.sub(r"(?<![0-9])([0-9]{1,2}\.)\s+\1(?=\s)", r"\1", text)
    text = re.sub(r"(?<![가-힣])([가-하]\.)\s+\1(?=\s)", r"\1", text)
    return text


def source(doc: lawsrc.LawDoc, label: str, text: str, admrul: bool = False) -> dict:
    url = env_config.admrul_page_url(doc.name) if admrul else env_config.law_page_url(doc.name)
    return {"source": doc.name, "article": label, "text": text, "source_url": url,
            "law_mst": doc.mst, "promulgated": doc.promulgated, "effective": doc.effective}


def permit(permit_id: str, name: str, law: str, kind: str, list_ids: list[str], condition: str,
           authority: str, legal_basis: str, sources: list[dict]) -> dict:
    return {
        "permit_id": permit_id, "name": name, "law": law, "kind": kind,
        "trigger": {"list_ids": list_ids, "condition": condition},
        "authority": authority, "legal_basis": legal_basis,
        "source_url": sources[0]["source_url"] if sources else None,
        "verified_text": [f"[{s['source']} {s['article']}] {s['text']}" for s in sources],
        "verified_sources": sources,
    }
