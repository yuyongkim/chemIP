"""Download the raw files for emergency exposure guidelines and probit constants into data/portal_raw/el/<source_id>/.

    python -I -B G:\\MSDS\\scripts\\portal_build\\el_fetch.py [--only epa_aegl,doe_pac_rev29,rivm_probit] [--force]

epa_aegl      the EPA values index + one page per chemical (about 270 pages)
doe_pac_rev29 Revision_29.xlsx (Internet Archive copy of the DOE URL; edms3.energy.gov is not reachable from here)
rivm_probit   the RIVM status overview + one page per substance (about 65 pages)
Resumable: files already in the manifest are kept unless --force. One request at a time with a short pause.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import el_config as C  # noqa: E402


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": C.USER_AGENT, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=C.TIMEOUT) as resp:
        data = resp.read()
    return gzip.decompress(data) if data[:2] == b"\x1f\x8b" else data


def read_manifest(sid: str) -> dict:
    path = os.path.join(C.raw_dir(sid), C.MANIFEST)
    if not os.path.exists(path):
        return {"source_id": sid, "files": {}}
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def write_manifest(sid: str, manifest: dict) -> None:
    os.makedirs(C.raw_dir(sid), exist_ok=True)
    path = os.path.join(C.raw_dir(sid), C.MANIFEST)
    with open(path + ".tmp", "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(path + ".tmp", path)


def slug(url: str) -> str:
    tail = urllib.parse.urlparse(url).path.strip("/").split("/")[-1] or "index"
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", tail)[:120]


def fetch_one(sid: str, manifest: dict, name: str, url: str, force: bool, extra: dict | None = None, log=print) -> bytes | None:
    path = os.path.join(C.raw_dir(sid), name)
    if not force and name in manifest["files"] and os.path.exists(path):
        with open(path, "rb") as fh:
            return fh.read()
    try:
        data = http_get(url)
    except Exception as e:  # noqa: BLE001 — report and continue with the next page
        log(f"{sid}: {name} FAILED {e}")
        return None
    os.makedirs(C.raw_dir(sid), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(data)
    manifest["files"][name] = {"url": url, "retrieved_at": time.strftime("%Y-%m-%d"),
                               "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), **(extra or {})}
    write_manifest(sid, manifest)
    log(f"{sid}: {name} {len(data):,} bytes")
    time.sleep(C.GAP_SECONDS)
    return data


def aegl_links(index_html: str) -> list[tuple[str, str, str]]:
    """(cas or "", page url, name) from the EPA values index table."""
    rows = re.findall(r'<td>([^<]*)</td>\s*<td><a href="([^"]+)">([^<]*)</a>', index_html)
    return [(cas.strip(), urllib.parse.urljoin(C.AEGL_BASE, href), name.strip()) for cas, href, name in rows]


def fetch_aegl(force: bool, log=print) -> dict:
    sid = "epa_aegl"
    m = read_manifest(sid)
    index = fetch_one(sid, m, "index.html", C.AEGL_INDEX, force, log=log)
    if index is None:
        return {"source_id": sid, "error": "index"}
    links = aegl_links(index.decode("utf-8", "replace"))
    n = sum(fetch_one(sid, m, f"{slug(u)}.html", u, force, {"cas": cas, "name": name}, log) is not None for cas, u, name in links)
    return {"source_id": sid, "pages": len(links), "ok": n}


def fetch_pac(force: bool, log=print) -> dict:
    sid = "doe_pac_rev29"
    m = read_manifest(sid)
    data = fetch_one(sid, m, C.PAC_FILE, C.PAC_ARCHIVE_URL, force, {"original_url": C.PAC_DOE_URL}, log)
    return {"source_id": sid, "ok": data is not None and data[:2] == b"PK"}


def rivm_links(status_html: str) -> list[tuple[str, str, str]]:
    """(name, cas text, page url) rows of the RIVM status overview table."""
    i = status_html.find("<table")
    out = []
    for row in re.findall(r"<tr.*?</tr>", status_html[i:status_html.find("</table>", i)], flags=re.S):
        cells = [re.sub(r"<[^>]+>", "", c).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.S)]
        href = re.search(r'href="([^"]+)"', row)
        if len(cells) >= 2 and href:
            out.append((cells[0], cells[1], urllib.parse.urljoin(C.RIVM_BASE, href.group(1))))
    return out


def fetch_rivm(force: bool, log=print) -> dict:
    sid = "rivm_probit"
    m = read_manifest(sid)
    status = fetch_one(sid, m, "status.html", C.RIVM_INDEX, force, log=log)
    fetch_one(sid, m, "method.html", C.RIVM_METHOD, force, log=log)
    if status is None:
        return {"source_id": sid, "error": "status"}
    links = rivm_links(status.decode("utf-8", "replace"))
    n = sum(fetch_one(sid, m, f"{slug(u)}.html", u, force, {"cas": cas, "name": name}, log) is not None for name, cas, u in links)
    return {"source_id": sid, "pages": len(links), "ok": n}


FETCHERS = {"epa_aegl": fetch_aegl, "doe_pac_rev29": fetch_pac, "rivm_probit": fetch_rivm}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    only = {s for s in args.only.split(",") if s}
    for sid, fn in FETCHERS.items():
        if not only or sid in only:
            print(fn(args.force))


if __name__ == "__main__":
    main()
