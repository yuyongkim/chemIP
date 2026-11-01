"""Find every Korean law / 행정규칙 ChemIP links to, and keep law_set.json in step with it.

    python -I -B G:\\MSDS\\scripts\\portal_build\\law_refs.py            # print names found that law_set.json lacks
    python -I -B G:\\MSDS\\scripts\\portal_build\\law_refs.py --write    # add them to law_set.json (origin "referenced")

A reference is a link https://www.law.go.kr/<법령|행정규칙>/<name>[/...] (URL-encoded or not) in the files of
law_config.SCAN_GLOBS. Names in links have their spaces removed; law_set.json keeps the official spelling and matching
is space- and middle-dot-insensitive (norm_name). Pure parts (refs_in_text, norm_name, merge) are tested.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
import urllib.parse

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import law_config as C  # noqa: E402
from law_parse import norm_name  # noqa: E402

LINK_RE = re.compile(r"law\.go\.kr/(?:LSW/)?((?:%[0-9A-Fa-f]{2})+|법령|행정규칙)/((?:%[0-9A-Fa-f]{2}|[^\s\"'`<>()/\]\\,?#&])+)")
KIND = {"법령": "law", "행정규칙": "admrul"}

def refs_in_text(text: str) -> set[tuple[str, str]]:
    """{(kind, name)} for each law.go.kr name link in text."""
    out = set()
    for m in LINK_RE.finditer(text):
        kind = KIND.get(urllib.parse.unquote(m.group(1)))
        name = urllib.parse.unquote(m.group(2)).strip()
        if kind and name:
            out.add((kind, name))
    return out


def scan(project: str = C.PROJECT) -> dict[tuple[str, str], dict]:
    """{(kind, norm name): {"name", "files": [...], "list_ids": [...]}} over the scanned files."""
    found: dict[tuple[str, str], dict] = {}
    skip = [os.path.join(project, d) for d in C.SCAN_SKIP_DIRS]
    for pattern in C.SCAN_GLOBS:
        for path in glob.glob(os.path.join(project, *pattern.split("/")), recursive=True):
            if (not os.path.isfile(path) or not path.endswith(C.SCAN_EXTS) or any(path.startswith(s) for s in skip)
                    or os.path.getsize(path) > C.SCAN_MAX_BYTES):
                continue
            try:
                with open(path, encoding="utf-8", errors="ignore") as fh:
                    text = fh.read()
            except OSError:
                continue
            rel = os.path.relpath(path, project).replace(os.sep, "/")
            list_id = _list_id(path, text) if os.path.dirname(path).endswith(C.KR_LISTS_DIR) else None
            for kind, name in refs_in_text(text):
                e = found.setdefault((kind, norm_name(name)), {"name": name, "files": [], "list_ids": []})
                if rel not in e["files"]:
                    e["files"].append(rel)
                if list_id and list_id not in e["list_ids"]:
                    e["list_ids"].append(list_id)
    return found


def _list_id(path: str, text: str) -> str | None:
    try:
        return json.loads(text).get("list_id")
    except (ValueError, AttributeError):
        return None


def load_set(path: str = C.LAW_SET) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def merge(law_set: dict, found: dict) -> tuple[dict, list[dict]]:
    """Add found names missing from law_set (origin "referenced"); refresh refs/list_ids of the ones present."""
    by_key = {(e["kind"], norm_name(e["name"])): e for e in law_set["laws"]}
    added = []
    for key in sorted(found):
        f = found[key]
        e = by_key.get(key)
        if e is None:
            e = {"name": f["name"], "kind": key[0], "origin": ["referenced"]}
            law_set["laws"].append(e)
            by_key[key] = e
            added.append(e)
        elif "referenced" not in e["origin"]:
            e["origin"].append("referenced")
        e["refs"] = sorted(f["files"])
        if f["list_ids"]:
            e["list_ids"] = sorted(set(e.get("list_ids", [])) | set(f["list_ids"]))
    return law_set, added


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="add missing names to law_set.json")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    found = scan()
    law_set, added = merge(load_set(), found)
    print(json.dumps({"found": len(found), "missing_from_set": [f"{e['kind']}:{e['name']}" for e in added]},
                     ensure_ascii=False, indent=1))
    if a.write:
        with open(C.LAW_SET + ".tmp", "w", encoding="utf-8") as fh:
            json.dump(law_set, fh, ensure_ascii=False, indent=1)
        os.replace(C.LAW_SET + ".tmp", C.LAW_SET)


if __name__ == "__main__":
    main()
