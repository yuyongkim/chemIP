"""Build the slim H/P phrase file the GHS label maker reads in the browser.

Input   frontend/public/data/ghs_codes.json   (made by scripts/build_ghs_code_index.py — the one source of
                                               GHS code text: PubChem UN GHS Rev.11 English + KOSHA MSDS §2 Korean)
Output  frontend/public/chemip/assets/ghs/phrases.json
        {"v": 1, "generated", "sources", "en": {code: text}, "ko": {code: text}, "ko_unofficial": [code, ...]}

Only what a label needs is kept (code -> text in each language). "(Deleted) " is stripped from the English text
because old MSDSs still print those codes. Korean texts whose source is "chemip" (codes the Korean notice does not
carry yet) are listed in ko_unofficial so the screen can mark them.

    python scripts/build_ghs_label_phrases.py [--src PATH] [--out PATH]
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "frontend" / "public" / "data" / "ghs_codes.json"
OUT = ROOT / "frontend" / "public" / "chemip" / "assets" / "ghs" / "phrases.json"
DELETED_RE = re.compile(r"^\(Deleted\)\s*")


def slim(index: dict) -> dict:
    en: dict[str, str] = {}
    ko: dict[str, str] = {}
    unofficial: list[str] = []
    for e in index.get("codes", []):
        code = str(e.get("code") or "").strip()
        if not code or code[0] not in "HP":
            continue
        text_en = DELETED_RE.sub("", str(e.get("en") or "")).strip()
        text_ko = str(e.get("ko") or "").strip()
        if text_en:
            en[code] = text_en
        if text_ko:
            ko[code] = text_ko
            if e.get("ko_src") == "chemip":
                unofficial.append(code)
    sources = index.get("sources") or {}
    return {
        "v": 1,
        "generated": index.get("generated", ""),
        "sources": {"en": sources.get("en", ""), "ko": sources.get("ko", ""), "ko_chemip": sources.get("ko_chemip", "")},
        "en": en,
        "ko": ko,
        "ko_unofficial": sorted(unofficial),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--src", type=Path, default=SRC)
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()
    data = slim(json.loads(args.src.read_text(encoding="utf-8")))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(data['en'])} en / {len(data['ko'])} ko ({len(data['ko_unofficial'])} unofficial) -> {args.out}")


if __name__ == "__main__":
    main()
