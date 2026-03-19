from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json
from typing import Any


@dataclass
class GuideMeta:
    guide_no: str
    title: str
    ofanc_ymd: str
    file_download_url: str


@dataclass
class GuideDoc:
    guide_no: str
    title: str
    text: str
    char_count: int
    page_count: int
    source_file: str
    parser_engine: str
    ofanc_ymd: str


class KoshaGuideStore:
    """In-memory loader/searcher for KOSHA guide snapshot files."""

    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.guides_path = self.data_dir / "guides.json"
        self.docs_path = self.data_dir / "normalized" / "guide_documents_text.json"

        self._loaded = False
        self._metas: dict[str, GuideMeta] = {}
        self._docs: dict[str, GuideDoc] = {}
        self._load_error: str = ""

    @property
    def loaded(self) -> bool:
        return self._loaded

    @property
    def load_error(self) -> str:
        return self._load_error

    def exists(self) -> bool:
        return self.guides_path.exists() and self.docs_path.exists()

    def ensure_loaded(self) -> None:
        if self._loaded:
            return
        try:
            self._load()
            self._loaded = True
            self._load_error = ""
        except Exception as exc:  # pragma: no cover - exercised via route responses
            self._loaded = False
            self._load_error = str(exc)
            raise

    def _load(self) -> None:
        guides_raw = json.loads(self.guides_path.read_text(encoding="utf-8"))
        docs_raw = json.loads(self.docs_path.read_text(encoding="utf-8"))

        metas: dict[str, GuideMeta] = {}
        for row in guides_raw:
            if not isinstance(row, dict):
                continue
            guide_no = str(row.get("techGdlnNo", "")).strip()
            if not guide_no:
                continue
            metas[guide_no] = GuideMeta(
                guide_no=guide_no,
                title=str(row.get("techGdlnNm", "")).strip(),
                ofanc_ymd=str(row.get("techGdlnOfancYmd", "")).strip(),
                file_download_url=str(row.get("fileDownloadUrl", "")).strip(),
            )

        docs: dict[str, GuideDoc] = {}
        for row in docs_raw:
            if not isinstance(row, dict):
                continue
            guide_no = str(row.get("guide_no", "")).strip()
            if not guide_no:
                continue
            docs[guide_no] = GuideDoc(
                guide_no=guide_no,
                title=str(row.get("title", "")).strip(),
                text=str(row.get("text", "")).strip(),
                char_count=int(row.get("char_count", 0) or 0),
                page_count=int(row.get("page_count", 0) or 0),
                source_file=str(row.get("source_file", "")).strip(),
                parser_engine=str(row.get("parser_engine", "")).strip(),
                ofanc_ymd=str(row.get("ofanc_ymd", "")).strip(),
            )

        self._metas = metas
        self._docs = docs

    def stats(self) -> dict[str, Any]:
        return {
            "data_dir": str(self.data_dir),
            "ready_files": self.exists(),
            "loaded": self._loaded,
            "meta_count": len(self._metas),
            "doc_count": len(self._docs),
            "load_error": self._load_error,
        }

    def get(self, guide_no: str, include_text: bool = True) -> dict[str, Any] | None:
        self.ensure_loaded()
        key = (guide_no or "").strip()
        if not key:
            return None

        meta = self._metas.get(key)
        doc = self._docs.get(key)
        if not meta and not doc:
            return None

        title = (doc.title if doc and doc.title else "") or (meta.title if meta else "")
        ofanc_ymd = (doc.ofanc_ymd if doc and doc.ofanc_ymd else "") or (meta.ofanc_ymd if meta else "")

        payload = {
            "guide_no": key,
            "title": title,
            "ofanc_ymd": ofanc_ymd,
            "file_download_url": meta.file_download_url if meta else "",
            "char_count": doc.char_count if doc else 0,
            "page_count": doc.page_count if doc else 0,
            "source_file": doc.source_file if doc else "",
            "parser_engine": doc.parser_engine if doc else "",
        }
        if include_text:
            payload["text"] = doc.text if doc else ""
        return payload

    def search(self, query: str, limit: int, offset: int) -> tuple[list[dict[str, Any]], int]:
        self.ensure_loaded()

        q = (query or "").strip()
        if not q:
            return [], 0
        q_lower = q.lower()

        all_ids = set(self._metas.keys()) | set(self._docs.keys())
        scored: list[tuple[int, str, list[str], str]] = []

        for guide_no in all_ids:
            meta = self._metas.get(guide_no)
            doc = self._docs.get(guide_no)

            title = ""
            if doc and doc.title:
                title = doc.title
            elif meta and meta.title:
                title = meta.title

            text = doc.text if doc else ""
            fields: list[str] = []
            score = 0

            guide_no_lower = guide_no.lower()
            title_lower = title.lower()
            text_lower = text.lower()

            if q_lower == guide_no_lower:
                score += 120
                fields.append("guide_no_exact")
            elif q_lower in guide_no_lower:
                score += 80
                fields.append("guide_no")

            if q_lower in title_lower:
                score += 60
                fields.append("title")

            snippet = ""
            if q_lower in text_lower:
                score += 20
                fields.append("text")
                idx = text_lower.find(q_lower)
                start = max(0, idx - 80)
                end = min(len(text), idx + len(q) + 120)
                snippet = text[start:end].replace("\n", " ").strip()

            if score > 0:
                scored.append((score, guide_no, fields, snippet))

        scored.sort(key=lambda x: (-x[0], x[1]))
        total = len(scored)
        window = scored[offset : offset + limit]

        items: list[dict[str, Any]] = []
        for score, guide_no, fields, snippet in window:
            item = self.get(guide_no, include_text=False) or {"guide_no": guide_no}
            item.update({"score": score, "match_fields": fields, "snippet": snippet})
            items.append(item)

        return items, total

