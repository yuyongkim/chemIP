"""Serve markdown documents from the docs/ directory."""

from __future__ import annotations

import os
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()

_DOCS_DIR = Path(__file__).resolve().parents[3] / "docs"
_SAFE_NAME = re.compile(r"^[\w\-\.]+\.md$")


@router.get("/list")
def list_docs():
    """Return available .md files sorted by modification time (newest first)."""
    if not _DOCS_DIR.is_dir():
        return {"docs": []}

    items = []
    for f in _DOCS_DIR.iterdir():
        if f.suffix == ".md" and f.is_file():
            stat = f.stat()
            items.append({
                "filename": f.name,
                "size": stat.st_size,
                "modified": stat.st_mtime,
            })

    items.sort(key=lambda x: x["modified"], reverse=True)
    return {"docs": items}


@router.get("/{filename}")
def get_doc(filename: str):
    """Return the raw markdown content of a single doc file."""
    if not _SAFE_NAME.match(filename):
        raise HTTPException(status_code=400, detail="Invalid filename")

    filepath = _DOCS_DIR / filename
    resolved = filepath.resolve()

    # Path traversal guard
    if not str(resolved).startswith(str(_DOCS_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="Document not found")

    content = resolved.read_text(encoding="utf-8")
    return {"filename": filename, "content": content}
