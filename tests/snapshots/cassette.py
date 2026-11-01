"""Record/replay of outbound HTTP for the snapshot server (requests + httpx).

record: every outbound call really happens; the response (or raised exception) is stored.
replay: no network; the stored response is returned in call order for the same request key.

The request key is a SHA-256 of method + URL + params + body, so service keys in query strings are never
written to disk. Stored response URLs have secret query parameters masked.
"""
from __future__ import annotations

import base64
import hashlib
import importlib
import json
import threading
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

_SECRET_PARAMS = {"key", "servicekey", "apikey", "api_key", "accesskey"}
_lock = threading.Lock()


def _mask_url(url: str) -> str:
    parts = urlsplit(url or "")
    if not parts.query:
        return url or ""
    pairs = [(k, "***" if k.lower() in _SECRET_PARAMS else v) for k, v in parse_qsl(parts.query, keep_blank_values=True)]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(pairs), parts.fragment))


def _canon(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (bytes, bytearray)):
        return base64.b64encode(bytes(value)).decode()
    if isinstance(value, dict):
        return json.dumps({str(k): _canon(v) for k, v in sorted(value.items(), key=lambda kv: str(kv[0]))}, ensure_ascii=False)
    if isinstance(value, (list, tuple)):
        return json.dumps([_canon(v) for v in value], ensure_ascii=False)
    return str(value)


def request_key(method: str, url: str, params=None, data=None, json_body=None) -> str:
    raw = "\n".join([method.upper(), url, _canon(params), _canon(data), _canon(json_body)])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class Cassette:
    """JSON-lines file of {"key", "entry"}; misses are appended to <file>.misses.txt as they happen."""

    def __init__(self, path: Path, mode: str):
        self.path = Path(path)
        self.mode = mode
        self.miss_path = self.path.with_suffix(".misses.txt")
        self.entries: dict[str, list[dict]] = {}
        self.cursor: dict[str, int] = {}
        if mode == "replay" and self.path.exists():
            for line in self.path.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    row = json.loads(line)
                    self.entries.setdefault(row["key"], []).append(row["entry"])
        self.miss_path.write_text("", encoding="utf-8")

    def put(self, key: str, entry: dict) -> None:
        with _lock, self.path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"key": key, "entry": entry}, ensure_ascii=False) + "\n")

    def take(self, key: str, label: str) -> dict | None:
        with _lock:
            items = self.entries.get(key)
            if not items:
                with self.miss_path.open("a", encoding="utf-8") as fh:
                    fh.write(label + "\n")
                return None
            idx = self.cursor.get(key, 0)
            self.cursor[key] = idx + 1
            return items[min(idx, len(items) - 1)]


def _exc_entry(exc: BaseException) -> dict:
    cls = type(exc)
    return {"exc": f"{cls.__module__}:{cls.__qualname__}", "msg": str(exc)}


def _raise_entry(entry: dict) -> None:
    module, _, name = entry["exc"].partition(":")
    cls = getattr(importlib.import_module(module), name)
    raise cls(entry["msg"])


def install(cassette: Cassette) -> None:
    """Patch requests.Session.request, httpx.get and httpx.post."""
    import httpx
    import requests
    from requests.structures import CaseInsensitiveDict

    real_request = requests.Session.request

    def session_request(self, method, url, params=None, data=None, headers=None, cookies=None, files=None,
                        auth=None, timeout=None, allow_redirects=True, proxies=None, hooks=None, stream=None,
                        verify=None, cert=None, json=None):
        key = request_key(method, url, params, data, json)
        label = f"{method} {_mask_url(url)}"
        if cassette.mode == "record":
            try:
                resp = real_request(self, method, url, params=params, data=data, headers=headers, cookies=cookies,
                                    files=files, auth=auth, timeout=timeout, allow_redirects=allow_redirects,
                                    proxies=proxies, hooks=hooks, stream=stream, verify=verify, cert=cert, json=json)
            except Exception as exc:
                cassette.put(key, _exc_entry(exc))
                raise
            cassette.put(key, {
                "status": resp.status_code, "reason": resp.reason, "url": _mask_url(resp.url),
                "headers": dict(resp.headers), "encoding": resp.encoding,
                "body": base64.b64encode(resp.content).decode(),
            })
            return resp
        entry = cassette.take(key, label)
        if entry is None:
            raise requests.ConnectionError(f"cassette miss: {label}")
        if "exc" in entry:
            _raise_entry(entry)
        resp = requests.Response()
        resp.status_code = entry["status"]
        resp.reason = entry["reason"]
        resp.url = entry["url"]
        resp.headers = CaseInsensitiveDict(entry["headers"])
        resp.encoding = entry["encoding"]
        resp._content = base64.b64decode(entry["body"])
        return resp

    def httpx_call(method: str, real):
        def call(url, *args, **kwargs):
            key = request_key(method, str(url), kwargs.get("params"), kwargs.get("data"), kwargs.get("json"))
            label = f"httpx {method} {url}"
            if cassette.mode == "record":
                try:
                    resp = real(url, *args, **kwargs)
                except Exception as exc:
                    cassette.put(key, _exc_entry(exc))
                    raise
                cassette.put(key, {"status": resp.status_code, "headers": dict(resp.headers),
                                   "body": base64.b64encode(resp.content).decode()})
                return resp
            entry = cassette.take(key, label)
            if entry is None:
                raise httpx.ConnectError(f"cassette miss: {label}")
            if "exc" in entry:
                _raise_entry(entry)
            headers = {k: v for k, v in entry["headers"].items() if k.lower() not in {"content-encoding", "transfer-encoding"}}
            return httpx.Response(entry["status"], headers=headers, content=base64.b64decode(entry["body"]),
                                  request=httpx.Request(method, str(url)))
        return call

    requests.Session.request = session_request
    httpx.get = httpx_call("GET", httpx.get)
    httpx.post = httpx_call("POST", httpx.post)
