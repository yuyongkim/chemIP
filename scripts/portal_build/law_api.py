"""법제처 OPEN API client: polite GET (about 1 request/s, reg_http retries and timeout), JSON decode, OC masking.

Every URL, raw body and error message that leaves this module has the OC value masked (mask()), so raw files,
the manifest and the report never hold the key. Request shapes: law_config.py header. The getter is injectable
(tests pass recorded fixtures, no network).
"""
from __future__ import annotations

import json
import re
import time
import urllib.parse

import law_config as C
import reg_http

OC_PARAM_RE = re.compile(r"(OC=)[^&\"'<>\s]+")


class LawApiError(RuntimeError):
    pass


def mask(text: str, oc: str) -> str:
    out = OC_PARAM_RE.sub(r"\1***", text)
    return out.replace(oc, "***") if oc else out


def mask_bytes(data: bytes, oc: str) -> bytes:
    out = re.sub(rb"(OC=)[^&\"'<>\s]+", rb"\1***", data)
    return out.replace(oc.encode("utf-8"), b"***") if oc else out


class Client:
    def __init__(self, oc: str, getter=None, gap_s: float = C.REQUEST_GAP_S, sleep=time.sleep, clock=time.monotonic):
        self.oc, self.gap_s, self.sleep, self.clock = oc, gap_s, sleep, clock
        self.getter = getter or (lambda url, params: reg_http.get(url, params, max_bytes=C.MAX_DOWNLOAD_BYTES))
        self._last = None
        self.requests = 0

    def get_json(self, api: str, params: dict) -> tuple[dict, bytes, str]:
        """(decoded JSON, masked raw body, masked URL)."""
        full = {"OC": self.oc, **params}
        url = mask(f"{api}?{urllib.parse.urlencode(full)}", self.oc)
        if self._last is not None:
            wait = self.gap_s - (self.clock() - self._last)
            if wait > 0:
                self.sleep(wait)
        try:
            raw = self.getter(api, full)
        except Exception as exc:  # reg_http's message carries the URL: mask it
            raise LawApiError(mask(str(exc), self.oc)[:300]) from None
        finally:
            self._last = self.clock()
            self.requests += 1
        body = mask_bytes(raw, self.oc)
        try:
            data = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            text = re.sub(r"<[^>]+>|\s+", " ", body[:4000].decode("utf-8", "replace")).strip()
            raise LawApiError(f"not JSON ({len(raw)} bytes): {text[:160]}") from None
        if not isinstance(data, dict):
            raise LawApiError("unexpected JSON shape")
        return data, body, url

    # ---- the six requests (law_config.py header) ----
    def search_current(self, kind: str, name: str):
        return self.get_json(C.SEARCH_API, {"target": kind, "type": "JSON", "query": name, "display": C.PAGE_SIZE})

    def service(self, kind: str, serial: str):
        key = "MST" if kind == "law" else "ID"
        return self.get_json(C.SERVICE_API, {"target": kind, "type": "JSON", key: serial})

    def history_page(self, kind: str, name: str, page: int):
        if kind == "law":
            params = {"target": "eflaw", "type": "JSON", "query": name, "nw": "1,2,3", "display": C.PAGE_SIZE, "page": page}
        else:
            params = {"target": "admrul", "type": "JSON", "query": name, "nw": 2, "display": C.PAGE_SIZE, "page": page}
        return self.get_json(C.SEARCH_API, params)
