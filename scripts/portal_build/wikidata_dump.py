"""Download Wikidata (CC0) identifiers for a list of CAS numbers into a local dump file, resumable.

    python -B G:\\MSDS\\scripts\\portal_build\\wikidata_dump.py            # CAS list = identifiers.cas_universe()

One SPARQL query per batch of CAS (VALUES), asking for the item (Q id), EC (P232), UN (P695), InChIKey (P235) and the
Korean / English labels. Each answered batch is appended as one JSON line {"batch": n, "cas": [...], "rows": [...]}
to DUMP_FILE; a rerun asks only the CAS that no line of the file holds yet.
identifiers.py reads only the dump file, never the network.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import portal_db  # noqa: E402

ENDPOINT = "https://query.wikidata.org/sparql"
USER_AGENT = "ChemIP-portal-build/1 (https://chemip.yule.pics; batch CAS lookup)"
DUMP_DIR = os.path.join(portal_db.PROJECT, "data", "wikidata")
DUMP_FILE = os.path.join(DUMP_DIR, "wikidata_cas_identifiers.jsonl")
BATCH = 250
GAP_SECONDS = 1.0
RETRIES = 6

QUERY = """SELECT ?cas ?item ?ec ?un ?ik ?ko ?en WHERE {
  VALUES ?cas { %s }
  ?item wdt:P231 ?cas .
  OPTIONAL { ?item wdt:P232 ?ec }
  OPTIONAL { ?item wdt:P695 ?un }
  OPTIONAL { ?item wdt:P235 ?ik }
  OPTIONAL { ?item rdfs:label ?ko FILTER(LANG(?ko) = "ko") }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
}"""
FIELDS = ("cas", "item", "ec", "un", "ik", "ko", "en")


def batches(cas_list: list[str], size: int = BATCH) -> list[list[str]]:
    cas_list = sorted(set(cas_list))
    return [cas_list[i:i + size] for i in range(0, len(cas_list), size)]


def done_cas(path: str = DUMP_FILE) -> tuple[set[str], int]:
    """(CAS already asked, next batch number) from the dump file."""
    asked, last = set(), -1
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                if line.strip():
                    rec = json.loads(line)
                    asked.update(rec["cas"])
                    last = max(last, rec["batch"])
    return asked, last + 1


def query_batch(cas: list[str]) -> list[dict]:
    values = " ".join(json.dumps(c) for c in cas)
    body = urllib.parse.urlencode({"query": QUERY % values, "format": "json"}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json",
                                                                "Content-Type": "application/x-www-form-urlencoded"})
    wait = 5.0
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                data = json.load(r)
            out = []
            for b in data["results"]["bindings"]:
                row = {k: b[k]["value"] for k in FIELDS if k in b}
                if "item" in row:
                    row["item"] = row["item"].rsplit("/", 1)[-1]
                out.append(row)
            return out
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or attempt == RETRIES - 1:
                raise
            wait = float(e.headers.get("Retry-After") or wait)
        except (urllib.error.URLError, TimeoutError):
            if attempt == RETRIES - 1:
                raise
        time.sleep(wait)
        wait = min(wait * 2, 120)
    return []


def dump(cas_list: list[str], path: str = DUMP_FILE, log=print, max_batches: int = 0) -> dict:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    asked, next_no = done_cas(path)
    todo = batches([c for c in cas_list if c not in asked])
    if max_batches:
        todo = todo[:max_batches]
    log(f"wikidata: {len(asked)} CAS already in {path}; {len(todo)} batches of {BATCH} to ask")
    rows = 0
    for i, cas in enumerate(todo):
        got = query_batch(cas)
        rows += len(got)
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps({"batch": next_no + i, "cas": cas, "rows": got}, ensure_ascii=False) + "\n")
        if i % 20 == 0:
            log(f"wikidata: batch {i + 1}/{len(todo)}, rows so far {rows}")
        time.sleep(GAP_SECONDS)
    return {"asked_before": len(asked), "batches": len(todo), "new_rows": rows, "file": path}


def read_dump(path: str = DUMP_FILE) -> list[dict]:
    out = []
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                if line.strip():
                    out.extend(json.loads(line)["rows"])
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--batches", type=int, default=0, help="only the first N batches (smoke test; same batches as a full run)")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    from identifiers import cas_universe

    print(dump(sorted(cas_universe()), log=lambda m: print(m, flush=True), max_batches=a.batches))


if __name__ == "__main__":
    main()
