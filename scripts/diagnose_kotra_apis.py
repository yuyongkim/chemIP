"""KOTRA/Tourism API connectivity diagnostics."""

from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import requests

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.config.settings import settings  # noqa: E402
from backend.api.kotra_adapter import KotraAdapter  # noqa: E402


@dataclass
class Probe:
    name: str
    url: str
    params: Dict[str, str]
    tag: str


def get_probes() -> List[Probe]:
    return [
        Probe(
            "overseas_market_news",
            getattr(
                settings,
                "KOTRA_MARKET_NEWS_URL",
                "https://apis.data.go.kr/B410001/kotra_overseasMarketNews/ovseaMrktNews/ovseaMrktNews",
            ),
            {"search2": "test", "numOfRows": "5", "pageNo": "1", "search1": "KR"},
            "market_news",
        ),
        Probe(
            "national_information",
            getattr(
                settings,
                "KOTRA_NATIONAL_INFO_URL",
                "https://apis.data.go.kr/B410001/kotra_nationalInformation/natnInfo/natnInfo",
            ),
            {"isoWd2CntCd": "KR", "numOfRows": "5", "pageNo": "1"},
            "national_info",
        ),
        Probe(
            "import_restriction_items",
            getattr(
                settings,
                "KOTRA_IMPORT_RESTRICTION_URL",
                "https://apis.data.go.kr/B410001/DS00000128/getDS00000128",
            ),
            {"numOfRows": "5", "pageNo": "1", "search1": "test"},
            "import_restriction",
        ),
        Probe(
            "enterprise_success_cases",
            getattr(
                settings,
                "KOTRA_ENTERPRISE_SUCCESS_URL",
                "https://apis.data.go.kr/B410001/compSucsCase/compSucsCase",
            ),
            {"search1": "test", "numOfRows": "5", "pageNo": "1"},
            "enterprise_success",
        ),
        Probe(
            "tourism_english",
            getattr(
                settings,
                "TOURISM_ENGLISH_URL",
                "https://apis.data.go.kr/B551011/EngService2/searchFestival2",
            ),
            {"numOfRows": "5", "pageNo": "1", "MobileOS": "ETC", "MobileApp": "ChemIP", "eventStartDate": "20250101", "_type": "json"},
            "tourism_english",
        ),
    ]


def _safe_get(url: str, params: Dict[str, str], key: str, timeout: int, verify_tls: bool) -> requests.Response:
    request_params = dict(params)
    request_params["serviceKey"] = key
    if "type" not in request_params and "_type" not in request_params:
        request_params["type"] = "json"
    return requests.get(url, params=request_params, timeout=timeout, verify=verify_tls)


def run_probe(probe: Probe, key: str, timeout: int, verify_tls: bool) -> None:
    print(f"[RUN] {probe.tag}: {probe.name}")
    succeeded = False
    for attempt in range(1, 4):
        try:
            start = time.time()
            response = _safe_get(probe.url, probe.params, key, timeout=timeout, verify_tls=verify_tls)
            elapsed = round((time.time() - start) * 1000, 1)
            status_line = f"status={response.status_code} latency={elapsed}ms"
            if response.status_code == 200:
                print(f" - OK: {status_line}")
                text = response.text[:260].replace("\n", " ")
                print(f" - payload: {text[:200]}")
                succeeded = True
                break

            if response.status_code >= 500 and attempt < 3:
                print(f" - WARN: {status_line} (retry {attempt}/3)")
                time.sleep(0.5 * attempt)
                continue

            print(f" - FAIL: {status_line}")
            print(f" - body: {response.text[:240]}")
            break
        except requests.exceptions.Timeout:
            if attempt < 3:
                print(f" - TIMEOUT (attempt {attempt}/3) -> retry")
                time.sleep(0.5 * attempt)
                continue
            print(f" - TIMEOUT (>{timeout}s)")
        except requests.exceptions.RequestException as exc:
            print(f" - REQUEST_ERROR: {exc}")
            break
        except Exception as exc:  # pragma: no cover
            print(f" - ERROR: {exc}")
            break
    return succeeded


def run_all(service_key: Optional[str], timeout: int, verify_tls: bool) -> bool:
    adapter = KotraAdapter()
    key = service_key or adapter.kotra_key
    if not key:
        print("[ERROR] Missing service key. Set KOTRA_API_KEY_DECODED or pass --service-key.")
        return False

    probes = get_probes()
    success_count = 0
    for probe in probes:
        if run_probe(probe, key, timeout=timeout, verify_tls=verify_tls):
            success_count += 1
        time.sleep(0.2)

    print(f"\n[SUMMARY] tested {len(probes)} probes; check lines above for detailed status.")
    return success_count == len(probes)


def main() -> int:
    parser = argparse.ArgumentParser(description="Probe KOTRA and tourism API endpoints.")
    parser.add_argument("--service-key", default=os.getenv("KOTRA_API_KEY_DECODED"), help="Override API key for testing.")
    parser.add_argument("--timeout", type=int, default=12, help="Request timeout seconds.")
    parser.add_argument("--insecure", action="store_true", help="Set for legacy TLS environments.")
    args = parser.parse_args()

    verify_tls = not args.insecure
    return 0 if run_all(args.service_key, timeout=args.timeout, verify_tls=verify_tls) else 1


if __name__ == "__main__":
    raise SystemExit(main())
