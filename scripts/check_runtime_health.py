#!/usr/bin/env python3
"""Runtime health checks for ChemIP managed services.

Checks both local origins and the public chemip.yule.pics domain so operators
can catch tunnel/origin drift before users do.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Callable


DEFAULT_TIMEOUT = 12.0
DEFAULT_WAIT_SECONDS = 0.0


@dataclass(frozen=True)
class Check:
    name: str
    url: str
    expected_status: int
    validator: Callable[[str], tuple[bool, str]]


def validate_json_status_ok(body: str) -> tuple[bool, str]:
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        return False, f"invalid json: {exc}"
    if payload.get("status") != "ok":
        return False, f"unexpected status={payload.get('status')!r}"
    return True, "status=ok"


def validate_ready(body: str) -> tuple[bool, str]:
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        return False, f"invalid json: {exc}"
    if payload.get("status") != "ready":
        return False, f"unexpected status={payload.get('status')!r}"
    return True, "status=ready"


def validate_chemical_search(body: str) -> tuple[bool, str]:
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        return False, f"invalid json: {exc}"
    items = payload.get("items")
    total = payload.get("total")
    if not isinstance(items, list) or not items:
        return False, "items missing or empty"
    if not isinstance(total, int) or total < 1:
        return False, f"unexpected total={total!r}"
    top = items[0]
    top_name = ""
    if isinstance(top, dict):
        top_name = str(top.get("name_en") or top.get("name") or "")
    return True, f"items={len(items)} total={total} top={top_name}"


def validate_unified_drug(body: str) -> tuple[bool, str]:
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        return False, f"invalid json: {exc}"
    if str(payload.get("query", "")).lower() != "toluene":
        return False, f"unexpected query={payload.get('query')!r}"
    if not isinstance(payload.get("openfda"), dict):
        return False, "openfda payload missing"
    total = payload["openfda"].get("total")
    if not isinstance(total, int):
        return False, f"unexpected openfda.total={total!r}"
    return True, f"openfda.total={total}"


def validate_html_contains(body: str) -> tuple[bool, str]:
    if "ChemIP" not in body:
        return False, "expected ChemIP marker missing"
    return True, "html marker found"


def build_checks(public_host: str) -> list[Check]:
    public_base = f"https://{public_host}"
    return [
        Check("local-backend-health", "http://127.0.0.1:7011/health", 200, validate_json_status_ok),
        Check("local-backend-ready", "http://127.0.0.1:7011/ready", 200, validate_ready),
        Check(
            "local-frontend-static",
            "http://127.0.0.1:7000/chemip/index.html?q=Toluene&page=1",
            200,
            validate_html_contains,
        ),
        Check(
            "local-api-chemicals",
            "http://127.0.0.1:7000/api/chemicals?q=Toluene&page=1&limit=2",
            200,
            validate_chemical_search,
        ),
        Check(
            "public-static",
            f"{public_base}/chemip/index.html?q=Toluene&page=1",
            200,
            validate_html_contains,
        ),
        Check(
            "public-api-chemicals",
            f"{public_base}/api/chemicals?q=Toluene&page=1&limit=2",
            200,
            validate_chemical_search,
        ),
        Check(
            "public-api-drugs",
            f"{public_base}/api/drugs/unified?q=Toluene&limit=3",
            200,
            validate_unified_drug,
        ),
    ]


def fetch(check: Check, timeout: float) -> tuple[bool, str]:
    req = urllib.request.Request(
        check.url,
        headers={
            "User-Agent": "ChemIP-HealthCheck/1.0",
            "Accept": "application/json, text/html;q=0.9,*/*;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status = response.getcode()
            body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return False, f"http {exc.code}: {body[:160].strip()}"
    except Exception as exc:  # noqa: BLE001
        return False, f"{type(exc).__name__}: {exc}"

    if status != check.expected_status:
        return False, f"expected {check.expected_status}, got {status}"

    valid, detail = check.validator(body)
    return valid, detail


def run_checks(checks: list[Check], timeout: float) -> tuple[bool, list[str]]:
    lines: list[str] = []
    ok = True
    for check in checks:
        passed, detail = fetch(check, timeout=timeout)
        mark = "PASS" if passed else "FAIL"
        lines.append(f"[{mark}] {check.name}: {detail}")
        ok = ok and passed
    return ok, lines


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check local/public ChemIP runtime health.")
    parser.add_argument("--public-host", default="chemip.yule.pics", help="Public host to probe.")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT, help="Per-request timeout seconds.")
    parser.add_argument(
        "--wait-seconds",
        type=float,
        default=DEFAULT_WAIT_SECONDS,
        help="Keep retrying until healthy or timeout expires.",
    )
    parser.add_argument("--interval", type=float, default=3.0, help="Retry interval seconds while waiting.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    checks = build_checks(args.public_host)
    deadline = time.monotonic() + max(0.0, args.wait_seconds)
    attempt = 0

    while True:
        attempt += 1
        ok, lines = run_checks(checks, timeout=max(1.0, args.timeout))
        stamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"=== ChemIP Runtime Health @ {stamp} (attempt {attempt}) ===")
        for line in lines:
            print(line)
        if ok:
            print("[OK] All runtime checks passed.")
            return 0
        if time.monotonic() >= deadline:
            print("[ERROR] Runtime health check failed.")
            return 1
        print(f"[INFO] Retrying in {args.interval:.1f}s ...")
        time.sleep(max(0.5, args.interval))


if __name__ == "__main__":
    sys.exit(main())
