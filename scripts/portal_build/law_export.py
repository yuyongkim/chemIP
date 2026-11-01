"""Entry point: Korean law corpus (data/portal_facts.db law_*) → static R2 area v1/law/ (gzip bytes, .json names).

    python -B G:\\MSDS\\scripts\\portal_build\\law_export.py [--out DIR]

Writes <out>/law/ (default scripts/static_export/config.py OUT = E:\\dev-cache\\chemip-static\\out\\v1): index.json,
toc.json, lists.json, <doc id>.json per current doc, cas_<n>.json shards. The folder holds only these files (old ones are
removed first), so it is the upload staging dir:
    upload_r2_s3.py --src <out>/law --prefix v1/law --gzip-all
Report: data/portal_raw/law/export_report.json. Refuses to write when the law.go.kr OC key appears in any file.
Format: scripts/static_export/CONTRACT.md "law/". Modules: law_export_read (reads), law_export_build (assembly),
law_export_shape / law_cite / law_mentions (pure), law_export_config (values).
"""
from __future__ import annotations

import argparse
import glob
import gzip
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import law_export_build as B  # noqa: E402
import law_export_config as C  # noqa: E402
import law_export_read as R  # noqa: E402
import reg_official  # noqa: E402


def encode(obj) -> bytes:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def secret_hits(blobs: dict[str, bytes], secret: str) -> list[str]:
    """File names whose bytes contain the OC key (or an OC= query parameter). The key itself is never printed."""
    bad = []
    for name, data in blobs.items():
        if b"OC=" in data or (secret and secret.encode("utf-8") in data):
            bad.append(name)
    return bad


def write_area(out: str, blobs: dict[str, bytes]) -> int:
    os.makedirs(out, exist_ok=True)
    for old in glob.glob(os.path.join(out, "*.json")):
        os.remove(old)
    total = 0
    for name, data in blobs.items():
        packed = gzip.compress(data, 9, mtime=0)
        with open(os.path.join(out, name), "wb") as fh:
            fh.write(packed)
        total += len(packed)
    return total


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", default=C.OUT, help="v1 root (law/ is created inside)")
    args = ap.parse_args()
    t0 = time.time()
    today = time.strftime("%Y-%m-%d")
    corpus = R.load_corpus()
    lists = R.kr_lists()
    basis = R.basis_texts([x["id"] for x in lists])
    files, report = B.files(corpus, lists, basis, today)
    blobs = {name: encode(obj) for name, obj in files.items()}
    bad = secret_hits(blobs, reg_official.law_oc())
    if bad:
        print(f"refused: the OC key appears in {len(bad)} file(s), e.g. {bad[:3]}", file=sys.stderr)
        return 2
    out = os.path.join(args.out, C.AREA)
    gz_total = write_area(out, blobs)
    sizes = sorted(((len(b), n) for n, b in blobs.items()), reverse=True)
    report.update({"built_at": time.strftime("%Y-%m-%d %H:%M"), "out": out, "files": len(blobs),
                   "raw_bytes": sum(len(b) for b in blobs.values()), "gzip_bytes": gz_total,
                   "largest_raw": [[n, s] for s, n in sizes[:8]], "secret_check": "ok", "seconds": round(time.time() - t0, 1)})
    os.makedirs(os.path.dirname(C.REPORT), exist_ok=True)
    with open(C.REPORT, "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print(f"law: {len(blobs)} files, {report['raw_bytes']:,} raw / {gz_total:,} gzip bytes → {out}; "
          f"{report['lists_with_cites']} lists with citations, {report['cas_in_shards']:,} CAS in shards, "
          f"{report['cas_with_mentions']:,} with text mentions ({report['seconds']} s). Report {C.REPORT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
