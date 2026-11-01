"""Copy the Worker secrets from G:/MSDS/.env into a Worker environment without printing or writing any value.

Values go to `wrangler secret bulk` on stdin as one JSON object; nothing is written to disk or logged.
Only names that exist (non-empty) in .env are sent; the report lists names only.

    python scripts/sync_secrets.py --env production
    python scripts/sync_secrets.py            # test Worker (top-level wrangler.toml env)
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import subprocess
from pathlib import Path

ENV_FILE = Path(r"G:\MSDS\.env")
WORKER_DIR = Path(__file__).resolve().parents[1]
NPM_CACHE = r"E:\dev-cache\npm"
# Secret names the Worker reads (README "Secrets"). Value comes from .env under the same name (case-insensitive).
SECRET_NAMES = (
    "CHEMIP_ADMIN_TOKEN", "ANTHROPIC_API_KEY", "KOTRA_API_KEY_DECODED", "DRUG_API_KEY_DECODED",
    "NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET", "PUBMED_API_KEY",
)


def read_env(path: Path = ENV_FILE) -> dict[str, str]:
    out = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        name, sep, value = line.partition("=")
        key = name.strip().upper()
        if sep and key in SECRET_NAMES and value.strip():
            out[key] = value.strip().strip('"').strip("'")
    return out


def wrangler_js() -> str:
    found = sorted(glob.glob(os.path.join(NPM_CACHE, "_npx", "*", "node_modules", "wrangler", "bin", "wrangler.js")))
    if not found:
        raise SystemExit("wrangler not in the npx cache; run `npx --yes wrangler --version` once first")
    return found[-1]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", default="", help="wrangler environment, e.g. production")
    a = ap.parse_args()
    secrets = read_env()
    args = ["node", wrangler_js(), "secret", "bulk"] + (["--env", a.env] if a.env else [])
    env = {**os.environ, "npm_config_cache": NPM_CACHE, "WRANGLER_SEND_METRICS": "false"}
    r = subprocess.run(args, input=json.dumps(secrets), cwd=WORKER_DIR, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", env=env)
    tail = (r.stdout + r.stderr).strip().splitlines()[-3:]
    for v in secrets.values():  # never echo a value even if wrangler did
        tail = [t.replace(v, "<redacted>") for t in tail]
    print({"env": a.env or "(test)", "sent": sorted(secrets), "missing": sorted(set(SECRET_NAMES) - set(secrets)),
           "exit": r.returncode, "wrangler": tail})


if __name__ == "__main__":
    main()
