"""Download current Korean law / admin-rule XML from law.go.kr DRF (stdlib only).

Raw bytes go to RAW_ROOT/<RETRIEVED>/ and are only parsed as XML, never executed.
A manifest.json records MST/ID, promulgation and enforcement dates per law.

Run:  python -I -m kr_safety.law_fetch      (from scripts/trade_controls)
"""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from . import config


def _get(url: str, params: dict) -> bytes:
    full = url + "?" + urllib.parse.urlencode(params)
    last = None
    for attempt in range(1, config.HTTP_RETRIES + 1):
        try:
            req = urllib.request.Request(full, headers={"User-Agent": config.USER_AGENT})
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
    raise RuntimeError(f"failed after retries: {url}: {last}")


def raw_dir() -> Path:
    d = config.RAW_ROOT / config.RETRIEVED
    d.mkdir(parents=True, exist_ok=True)
    return d


def _search(target: str, name: str) -> ET.Element:
    data = _get(config.DRF_SEARCH, {"OC": config.DRF_OC, "target": target, "type": "XML",
                                    "query": name, "display": 50})
    return ET.fromstring(data)


def find_law(name: str) -> dict:
    root = _search("law", name)
    for law in root.iter("law"):
        if (law.findtext("법령명한글") or "").strip() == name and law.findtext("현행연혁코드") == "현행":
            return {"name": name, "mst": law.findtext("법령일련번호"),
                    "law_id": law.findtext("법령ID"),
                    "promulgated": law.findtext("공포일자"), "effective": law.findtext("시행일자"),
                    "promulgation_no": law.findtext("공포번호"),
                    "amend_type": law.findtext("제개정구분명")}
    raise LookupError(f"current law not found: {name}")


def find_admrul(name: str) -> dict:
    root = _search("admrul", name)
    for r in root.iter("admrul"):
        if (r.findtext("행정규칙명") or "").strip() == name and r.findtext("현행연혁구분") in ("현행", None):
            return {"name": name, "id": r.findtext("행정규칙일련번호"),
                    "promulgated": r.findtext("발령일자"), "effective": r.findtext("시행일자"),
                    "promulgation_no": r.findtext("발령번호"), "kind": r.findtext("행정규칙종류")}
    raise LookupError(f"current admin rule not found: {name}")


def fetch_all() -> dict:
    out = raw_dir()
    manifest: dict = {"retrieved": config.RETRIEVED, "laws": {}, "admruls": {}}
    for key, name in config.LAWS.items():
        meta = find_law(name)
        xml = _get(config.DRF_SERVICE, {"OC": config.DRF_OC, "target": "law",
                                        "MST": meta["mst"], "type": "XML"})
        path = out / f"{key}_{meta['mst']}.xml"
        path.write_bytes(xml)
        meta["file"] = str(path)
        manifest["laws"][key] = meta
        print(f"{key}: {name} MST={meta['mst']} 공포 {meta['promulgated']} 시행 {meta['effective']}")
    for key, name in config.ADMRULS.items():
        meta = find_admrul(name)
        xml = _get(config.DRF_SERVICE, {"OC": config.DRF_OC, "target": "admrul",
                                        "ID": meta["id"], "type": "XML"})
        path = out / f"{key}_{meta['id']}.xml"
        path.write_bytes(xml)
        meta["file"] = str(path)
        manifest["admruls"][key] = meta
        print(f"{key}: {name} ID={meta['id']} 발령 {meta['promulgated']}")
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf-8")
    return manifest


def load_manifest() -> dict:
    return json.loads((raw_dir() / "manifest.json").read_text("utf-8"))


if __name__ == "__main__":
    fetch_all()
