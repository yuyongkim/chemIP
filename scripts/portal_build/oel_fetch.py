"""Download the OEL sources that plain HTTP can reach (method "http" in oel_sources.json) into data/portal_raw/oel/.

    python -I -B G:\\MSDS\\scripts\\portal_build\\oel_fetch.py [--only kr_moel_notice,us_osha_z] [--force]

Sources behind bot challenges (CDC NIOSH, EUR-Lex) are fetched by oel_fetch_browser.cjs instead. Files already in the
manifest are kept unless --force (resumable). One request at a time with a short pause.
"""
from __future__ import annotations

import argparse
import gzip
import os
import sys
import time
import urllib.request

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import oel_raw  # noqa: E402

USER_AGENT = "Mozilla/5.0 (compatible; ChemIP-portal-build/1; +https://chemip.yule.pics)"
GAP_SECONDS = 1.0
TIMEOUT = 90


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        data = resp.read()
        if resp.headers.get("Content-Encoding") == "gzip" or data[:2] == b"\x1f\x8b":
            data = gzip.decompress(data)
    return data


def planned_files(src: dict) -> list[tuple[str, str]]:
    files = [(f["file"], f["url"]) for f in src.get("files", []) if f.get("url")]
    secs = src.get("files_from_sections")
    if secs:
        files += [(f"{s}.xml", secs["url"].format(section=s)) for s in secs["sections"]]
    return files


def fetch_source(src: dict, force: bool, log=print) -> dict:
    sid = src["source_id"]
    manifest = oel_raw.read_manifest(sid)
    got, kept = 0, 0
    for name, url in planned_files(src):
        if not force and name in manifest["files"] and os.path.exists(oel_raw.raw_path(sid, name)):
            kept += 1
            continue
        data = http_get(url)
        oel_raw.save_file(sid, name, data, url, manifest)
        oel_raw.write_manifest(sid, manifest)
        got += 1
        log(f"{sid}: {name} {len(data):,} bytes")
        time.sleep(GAP_SECONDS)
    return {"source_id": sid, "fetched": got, "kept": kept}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    only = {s for s in args.only.split(",") if s}
    for src in oel_raw.registry()["sources"]:
        if src.get("method") != "http" or (only and src["source_id"] not in only):
            continue
        print(fetch_source(src, args.force))


if __name__ == "__main__":
    main()
