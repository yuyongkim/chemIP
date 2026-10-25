"""버킷 흉내: HTTP Range 요청을 받는 로컬 파일 서버. 요청 수와 보낸 바이트를 세어 버킷 GET 과금량을 잰다."""
from __future__ import annotations

import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

STATS = {"requests": 0, "bytes": 0}
_LOCK = threading.Lock()


class RangeHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _count(self, n: int) -> None:
        with _LOCK:
            STATS["requests"] += 1
            STATS["bytes"] += n

    def do_HEAD(self):
        path = Path(self.translate_path(self.path))
        self.send_response(200)
        self.send_header("Content-Length", str(path.stat().st_size))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        self._count(0)

    def do_GET(self):
        path = Path(self.translate_path(self.path))
        size = path.stat().st_size
        start, end = 0, size - 1
        rng = self.headers.get("Range")
        if rng and rng.startswith("bytes="):
            a, _, b = rng[6:].partition("-")
            start, end = int(a or 0), min(int(b) if b else size - 1, size - 1)
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        n = end - start + 1
        self.send_header("Content-Length", str(n))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        with open(path, "rb") as fh:
            fh.seek(start)
            self.wfile.write(fh.read(n))
        self._count(n)


def serve(root: Path, port: int = 0) -> tuple[ThreadingHTTPServer, int]:
    handler = lambda *a, **kw: RangeHandler(*a, directory=os.fspath(root), **kw)  # noqa: E731
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def reset() -> dict:
    with _LOCK:
        snap = dict(STATS)
        STATS.update(requests=0, bytes=0)
    return snap
