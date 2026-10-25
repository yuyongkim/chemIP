"""Quick health check for all data.go.kr endpoints wired in this repo.
Uses KOSHA_SERVICE_KEY_DECODED from .env for all three (same data.go.kr key).
"""
import os
import sys
import time
from pathlib import Path

# Load .env manually (project doesn't use python-dotenv at startup here)
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"'))

sys.path.insert(0, str(env_path.parent))

from backend.api.kosha_msds_adapter import KoshaMsdsAdapter
from backend.api.ncis_adapter import NcisAdapter
from backend.api.kischem_adapter import KischemAdapter


def banner(s):
    print("\n" + "=" * 70)
    print(s)
    print("=" * 70)


def trunc(s, n=200):
    s = str(s)
    return s if len(s) <= n else s[:n] + " …(+%d)" % (len(s) - n)


def main():
    cas = "67-64-1"  # acetone
    name = "아세톤"

    banner(f"1) KOSHA MSDS — search('{name}')")
    t0 = time.time()
    r = KoshaMsdsAdapter().search_msds(name, num_of_rows=3)
    print(f"  elapsed {time.time()-t0:.2f}s · status={r.get('status')}")
    print("  source:", r.get("source", "—"))
    print("  body:", trunc(r.get("data") or r.get("message"), 400))

    banner(f"2) NCIS — search_by_cas('{cas}')")
    t0 = time.time()
    r = NcisAdapter().search_by_cas(cas)
    print(f"  elapsed {time.time()-t0:.2f}s · status={r.get('status')}")
    print("  body:", trunc(r, 600))

    banner(f"3) KISCHEM — search(cas_no='{cas}')")
    t0 = time.time()
    r = KischemAdapter().search(cas_no=cas, num_of_rows=3)
    print(f"  elapsed {time.time()-t0:.2f}s · status={r.get('status')}")
    print("  total:", r.get("total"))
    print("  sample item:", trunc(r.get("data", [None])[0] if r.get("data") else r.get("message"), 400))


if __name__ == "__main__":
    main()
