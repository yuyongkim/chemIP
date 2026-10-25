"""버킷 계수 프록시: S3 요청을 흉내 버킷으로 그대로 넘기고 방법별 요청 수·바이트를 센다(WSL 시스템 python3, 표준 라이브러리만).
GET /__bench/stats 는 집계를, GET /__bench/reset 은 집계를 돌려주고 0 으로 되돌린다(이 둘은 넘기지 않고 세지도 않는다).

    python3 s3_count_proxy.py <listen_port> <backend_port>
"""
from __future__ import annotations

import http.client
import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CHUNK = 1 << 20
HOP_HEADERS = {"connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade", "proxy-connection"}
_LOCK = threading.Lock()
_LOCAL = threading.local()


def empty_stats() -> dict:
    return {"by_method": {}, "get_log": [], "errors": []}


STATS = empty_stats()


def record(method: str, path: str, status: int, sent: int, received: int, rng: str | None) -> None:
    with _LOCK:
        if status >= 400 and len(STATS["errors"]) < 200:
            STATS["errors"].append({"method": method, "path": path, "status": status})
        m = STATS["by_method"].setdefault(method, {"requests": 0, "response_bytes": 0, "request_bytes": 0})
        m["requests"] += 1
        m["response_bytes"] += sent
        m["request_bytes"] += received
        if method == "GET" and len(STATS["get_log"]) < 5_000:
            STATS["get_log"].append({"path": path, "range": rng, "bytes": sent})


def backend() -> http.client.HTTPConnection:
    conn = getattr(_LOCAL, "conn", None)
    if conn is None:
        conn = _LOCAL.conn = http.client.HTTPConnection("127.0.0.1", BACKEND_PORT, timeout=600)
    return conn


class Proxy(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def read_body(self) -> bytes:
        if "chunked" in self.headers.get("Transfer-Encoding", "").lower():
            parts = []
            while (size := int(self.rfile.readline().split(b";")[0].strip() or b"0", 16)) > 0:
                parts.append(self.rfile.read(size))
                self.rfile.readline()
            while self.rfile.readline() not in (b"\r\n", b"\n", b""):
                pass
            return b"".join(parts)
        return self.rfile.read(int(self.headers.get("Content-Length") or 0))

    def bench_endpoint(self) -> bool:
        global STATS
        if not self.path.startswith("/__bench/"):
            return False
        with _LOCK:
            snap = STATS
            if self.path == "/__bench/reset":
                STATS = empty_stats()
            data = json.dumps(snap).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        return True

    def forward(self) -> None:
        if self.command == "GET" and self.bench_endpoint():
            return
        body = self.read_body()
        headers = {k: v for k, v in self.headers.items() if k.lower() not in HOP_HEADERS}
        headers["Content-Length"] = str(len(body))
        try:
            conn = backend()
            conn.request(self.command, self.path, body=body, headers=headers)
            resp = conn.getresponse()
        except (http.client.HTTPException, OSError):
            _LOCAL.conn = None
            conn = backend()
            conn.request(self.command, self.path, body=body, headers=headers)
            resp = conn.getresponse()
        length = resp.getheader("Content-Length")
        data = None if (length is not None or self.command == "HEAD") else resp.read()
        self.send_response(resp.status, resp.reason)
        for k, v in resp.getheaders():
            if k.lower() not in HOP_HEADERS and k.lower() != "content-length":
                self.send_header(k, v)
        self.send_header("Content-Length", length if data is None else str(len(data)))
        self.end_headers()
        sent = 0
        if self.command == "HEAD":
            resp.read()
        elif data is not None:
            self.wfile.write(data)
            sent = len(data)
        else:
            while chunk := resp.read(CHUNK):
                self.wfile.write(chunk)
                sent += len(chunk)
        record(self.command, self.path, resp.status, sent, len(body), self.headers.get("Range"))

    do_GET = do_PUT = do_POST = do_DELETE = do_HEAD = forward


if __name__ == "__main__":
    LISTEN_PORT, BACKEND_PORT = int(sys.argv[1]), int(sys.argv[2])
    ThreadingHTTPServer(("127.0.0.1", LISTEN_PORT), Proxy).serve_forever()
