"""GHS label maker assets: the nine pictogram SVGs, their README, and the slim H/P phrase file builder.

The builder (scripts/build_ghs_label_phrases.py) is tested on a small in-memory index; the committed
phrases.json is checked for shape only (it is rebuilt from frontend/public/data/ghs_codes.json).
"""
from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GHS_DIR = ROOT / "frontend" / "public" / "chemip" / "assets" / "ghs"
CODES = [f"GHS0{n}" for n in range(1, 10)]


def _builder():
    spec = importlib.util.spec_from_file_location("build_ghs_label_phrases", ROOT / "scripts" / "build_ghs_label_phrases.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_nine_pictograms_are_clean_svg():
    for code in CODES:
        text = (GHS_DIR / f"{code}.svg").read_text(encoding="utf-8")
        assert re.search(r"<svg[\s>]", text), code
        assert "viewBox=" in text, code
        assert not re.search(r"<script|\son[a-z]+\s*=|href=\"(?:https?:|javascript:)", text, re.I), code


def test_readme_records_source_and_license():
    text = (GHS_DIR / "README.md").read_text(encoding="utf-8")
    assert "UNECE" in text and "Public domain" in text
    for code in CODES:
        assert code in text


def test_slim_strips_deleted_and_marks_unofficial():
    index = {
        "generated": "2026-09-28",
        "sources": {"en": "PubChem", "ko": "KOSHA", "ko_chemip": "ChemIP"},
        "codes": [
            {"code": "H302", "en": "Harmful if swallowed", "ko": "삼키면 유해함", "ko_src": "kosha"},
            {"code": "P301+P312", "en": "(Deleted) IF SWALLOWED: call a POISON CENTER", "ko": "삼켰다면: …", "ko_src": "kosha"},
            {"code": "P316", "en": "Get emergency medical help immediately.", "ko": "즉시 응급 의료 도움을 받으시오.", "ko_src": "chemip"},
            {"code": "P101", "en": "If medical advice is needed, have product container or label at hand.", "ko": "", "ko_src": ""},
            {"code": "X1", "en": "not a code", "ko": "", "ko_src": ""},
        ],
    }
    out = _builder().slim(index)
    assert out["v"] == 1 and out["generated"] == "2026-09-28"
    assert out["en"]["P301+P312"] == "IF SWALLOWED: call a POISON CENTER"
    assert out["ko"]["H302"] == "삼키면 유해함"
    assert "P101" in out["en"] and "P101" not in out["ko"]
    assert out["ko_unofficial"] == ["P316"]
    assert "X1" not in out["en"]


def test_phrases_file_shape():
    data = json.loads((GHS_DIR / "phrases.json").read_text(encoding="utf-8"))
    assert data["v"] == 1
    assert data["en"]["H225"] and data["ko"]["H225"]
    assert all(not t.startswith("(Deleted)") for t in data["en"].values())
    assert set(data["ko_unofficial"]) <= set(data["ko"])
    assert all(re.fullmatch(r"[HP]\d{3}\w*(\+[HP]\d{3}\w*)*(\[\+P\d{3}\])?", c) for c in data["en"])
