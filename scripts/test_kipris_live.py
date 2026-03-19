"""Live KIPRIS integration checks for backend and optional frontend proxy.

Usage examples:
  python scripts/test_kipris_live.py
  python scripts/test_kipris_live.py --backend-url http://127.0.0.1:7010
  python scripts/test_kipris_live.py --backend-url http://127.0.0.1:7010 --frontend-url http://127.0.0.1:7000
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from dotenv import load_dotenv


def configure_output() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def configure_import_path() -> None:
    project_root = Path(__file__).resolve().parents[1]
    root_str = str(project_root)
    if root_str not in sys.path:
        sys.path.insert(0, root_str)


@dataclass
class JsonResponse:
    status_code: int
    payload: dict[str, Any] | list[Any] | None
    text: str


def http_get_json(base_url: str, path: str, params: dict[str, Any] | None) -> JsonResponse:
    url = f"{base_url.rstrip('/')}{path}"
    response = requests.get(url, params=params, timeout=40)
    text = response.text
    payload: dict[str, Any] | list[Any] | None = None
    content_type = (response.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        try:
            payload = response.json()
        except json.JSONDecodeError:
            payload = None
    return JsonResponse(status_code=response.status_code, payload=payload, text=text)


def asgi_get_json(path: str, params: dict[str, Any] | None) -> JsonResponse:
    from fastapi.testclient import TestClient
    from backend.main import app

    with TestClient(app) as client:
        response = client.get(path, params=params)
        text = response.text
        payload: dict[str, Any] | list[Any] | None = None
        content_type = (response.headers.get("content-type") or "").lower()
        if "application/json" in content_type:
            try:
                payload = response.json()
            except json.JSONDecodeError:
                payload = None
        return JsonResponse(status_code=response.status_code, payload=payload, text=text)


def ensure_dict_payload(response: JsonResponse, label: str) -> dict[str, Any]:
    if response.status_code != 200:
        detail = response.text[:250].replace("\n", " ")
        raise RuntimeError(f"{label}: HTTP {response.status_code} ({detail})")
    if not isinstance(response.payload, dict):
        detail = response.text[:250].replace("\n", " ")
        raise RuntimeError(f"{label}: non-JSON payload ({detail})")
    return response.payload


def run_backend_checks(
    query: str,
    limit: int,
    application_number: str | None,
    backend_url: str | None,
) -> tuple[str, dict[str, Any], dict[str, Any]]:
    if backend_url:
        def getter(path: str, params: dict[str, Any] | None) -> JsonResponse:
            return http_get_json(backend_url, path, params)
        mode_label = f"http ({backend_url.rstrip('/')})"
    else:
        def getter(path: str, params: dict[str, Any] | None) -> JsonResponse:
            return asgi_get_json(path, params)
        mode_label = "asgi (in-process)"

    search = getter(
        "/api/patents",
        {"q": query, "page": 1, "limit": limit},
    )
    search_data = ensure_dict_payload(search, "KIPRIS search")
    results = search_data.get("results")
    if not isinstance(results, list) or not results:
        raise RuntimeError("KIPRIS search: empty results")

    selected_application_number = application_number or (results[0].get("applicationNumber") if isinstance(results[0], dict) else None)
    if not selected_application_number:
        raise RuntimeError("KIPRIS search: missing applicationNumber in first result")

    detail = getter(f"/api/patents/kipris/{quote(str(selected_application_number), safe='')}", None)
    detail_data = ensure_dict_payload(detail, "KIPRIS detail")
    if not detail_data.get("applicationNumber"):
        raise RuntimeError("KIPRIS detail: missing applicationNumber")
    if not (detail_data.get("inventionTitle") or detail_data.get("abstract")):
        raise RuntimeError("KIPRIS detail: missing core fields (inventionTitle/abstract)")

    return mode_label, search_data, detail_data


def run_frontend_proxy_check(frontend_url: str, query: str, limit: int) -> dict[str, Any]:
    response = http_get_json(
        frontend_url,
        "/api/patents",
        {"q": query, "page": 1, "limit": limit},
    )
    data = ensure_dict_payload(response, "Frontend proxy /api/patents")
    results = data.get("results")
    if not isinstance(results, list) or not results:
        raise RuntimeError("Frontend proxy /api/patents: empty results")
    return data


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run live KIPRIS integration checks.")
    parser.add_argument("--query", default="benzene", help="Search keyword (default: benzene)")
    parser.add_argument("--limit", type=int, default=5, help="Search result limit (default: 5)")
    parser.add_argument(
        "--application-number",
        default=None,
        help="Override detail lookup application number. Defaults to first search result.",
    )
    parser.add_argument(
        "--backend-url",
        default=None,
        help="Use running backend URL (example: http://127.0.0.1:7010). Default uses in-process ASGI TestClient.",
    )
    parser.add_argument(
        "--frontend-url",
        default=None,
        help="Optional frontend URL to verify Next rewrite proxy (example: http://127.0.0.1:7000).",
    )
    return parser.parse_args()


def main() -> int:
    configure_output()
    configure_import_path()
    load_dotenv()
    args = parse_args()

    try:
        mode_label, search_data, detail_data = run_backend_checks(
            query=args.query,
            limit=args.limit,
            application_number=args.application_number,
            backend_url=args.backend_url,
        )
        print(f"[PASS] backend check mode: {mode_label}")
        print(f"       query={search_data.get('query')} total={search_data.get('total')} returned={len(search_data.get('results', []))}")
        print(f"       detail.applicationNumber={detail_data.get('applicationNumber')}")
        title = (detail_data.get("inventionTitle") or "").strip()
        if title:
            print(f"       detail.inventionTitle={title[:80]}")

        if args.frontend_url:
            proxy_data = run_frontend_proxy_check(args.frontend_url, args.query, args.limit)
            print(f"[PASS] frontend proxy check: {args.frontend_url.rstrip('/')}/api/patents")
            print(f"       proxy.total={proxy_data.get('total')} proxy.returned={len(proxy_data.get('results', []))}")

        print("[PASS] live KIPRIS integration checks completed")
        return 0
    except Exception as exc:
        print(f"[FAIL] {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
