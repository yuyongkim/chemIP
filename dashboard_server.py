import json
import logging
import os
import socket
import subprocess
from dataclasses import asdict, dataclass
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parent
DASHBOARD_HTML = ROOT / "dashboard.html"
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)


def configure_logging() -> logging.Logger:
    logger = logging.getLogger("dashboard_server")
    logger.setLevel(logging.DEBUG)
    if logger.handlers:
        return logger

    date_stamp = datetime.now().strftime("%Y-%m-%d")
    log_path = LOG_DIR / f"dashboard-{date_stamp}.log"

    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=10 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.ERROR)

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    return logger


LOGGER = configure_logging()


@dataclass
class Service:
    app_name: str
    project: str
    track: str
    track_color: str
    component: str
    host: str
    port: int
    path: str
    docs_path: str = ""


SERVICES: List[Service] = [
    Service(
        app_name="T3-ChemIP-Frontend",
        project="ChemIP Platform",
        track="Track 3 (B2B SaaS)",
        track_color="#16a34a",
        component="frontend",
        host="127.0.0.1",
        port=7000,
        path="/",
    ),
    Service(
        app_name="T3-ChemIP-Backend",
        project="ChemIP Platform",
        track="Track 3 (B2B SaaS)",
        track_color="#16a34a",
        component="backend",
        host="127.0.0.1",
        port=7010,
        path="/",
        docs_path="/docs",
    ),
    Service(
        app_name="T4-SoulsKitchen-Frontend",
        project="Soul's Kitchen",
        track="Track 4 (B2C)",
        track_color="#f97316",
        component="frontend",
        host="127.0.0.1",
        port=8002,
        path="/",
    ),
    Service(
        app_name="T4-SoulsKitchen-Backend",
        project="Soul's Kitchen",
        track="Track 4 (B2C)",
        track_color="#f97316",
        component="backend",
        host="127.0.0.1",
        port=8010,
        path="/",
        docs_path="/docs",
    ),
    Service(
        app_name="Hub-Dashboard-9000",
        project="Localhost Hub",
        track="System",
        track_color="#2563eb",
        component="dashboard",
        host="127.0.0.1",
        port=9000,
        path="/",
    ),
]

MANAGED_PORTS = {service.port for service in SERVICES}


def is_port_open(host: str, port: int, timeout: float = 0.35) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(timeout)
        return sock.connect_ex((host, port)) == 0


def get_pm2_states() -> Dict[str, str]:
    try:
        result = subprocess.run(
            ["pm2", "jlist"],
            capture_output=True,
            text=True,
            check=True,
            timeout=5,
        )
        payload = json.loads(result.stdout)
        states = {}
        for app in payload:
            name = app.get("name")
            state = app.get("pm2_env", {}).get("status", "unknown")
            if name:
                states[name] = state
        return states
    except Exception:
        return {}


def get_listening_ports() -> Dict[int, str]:
    ports: Dict[int, str] = {}
    try:
        if os.name == "nt":
            result = subprocess.run(
                ["netstat", "-ano", "-p", "tcp"],
                capture_output=True,
                text=True,
                check=True,
                timeout=5,
            )
            for line in result.stdout.splitlines():
                line = line.strip()
                if "LISTENING" not in line:
                    continue
                parts = line.split()
                if len(parts) < 5:
                    continue
                local = parts[1]
                pid = parts[-1]
                if ":" not in local:
                    continue
                port_str = local.rsplit(":", 1)[-1]
                if port_str.isdigit():
                    ports[int(port_str)] = pid
        else:
            result = subprocess.run(
                ["lsof", "-nP", "-iTCP", "-sTCP:LISTEN"],
                capture_output=True,
                text=True,
                check=True,
                timeout=5,
            )
            for line in result.stdout.splitlines()[1:]:
                parts = line.split()
                if len(parts) < 9:
                    continue
                pid = parts[1]
                name_part = parts[8]
                if ":" not in name_part:
                    continue
                port_str = name_part.rsplit(":", 1)[-1]
                if port_str.isdigit():
                    ports[int(port_str)] = pid
    except Exception:
        LOGGER.debug("Failed to read listening ports", exc_info=True)
    return ports


def build_status_payload() -> Dict[str, object]:
    pm2_states = get_pm2_states()
    listening = get_listening_ports()

    service_rows = []
    for service in SERVICES:
        port_open = is_port_open(service.host, service.port)
        pm2_state = pm2_states.get(service.app_name, "unknown")
        running = pm2_state in {"online", "launching"} or port_open
        conflict = port_open and pm2_state not in {"online", "launching", "unknown"}

        service_rows.append(
            {
                **asdict(service),
                "url": f"http://localhost:{service.port}{service.path}",
                "docs_url": f"http://localhost:{service.port}{service.docs_path}" if service.docs_path else "",
                "running": running,
                "pm2_state": pm2_state,
                "port_open": port_open,
                "conflict": conflict,
                "pid": listening.get(service.port, ""),
            }
        )

    occupied_unmanaged = []
    for port, pid in sorted(listening.items()):
        if 5000 <= port <= 9099 and port not in MANAGED_PORTS:
            occupied_unmanaged.append({"port": port, "pid": pid})

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "services": service_rows,
        "unmanaged_ports": occupied_unmanaged,
        "pm2_detected": bool(pm2_states),
    }


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload: Dict[str, object], status: int = 200) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _send_html(self, html: bytes) -> None:
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(html)))
        self.end_headers()
        self.wfile.write(html)

    def do_GET(self) -> None:  # noqa: N802
        try:
            if self.path in {"/", "/index.html"}:
                html = DASHBOARD_HTML.read_bytes()
                self._send_html(html)
                return
            if self.path == "/api/status":
                self._send_json(build_status_payload())
                return
            if self.path == "/api/health":
                self._send_json({"status": "ok"})
                return
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
        except Exception as exc:
            LOGGER.exception("Request handling failed: %s", exc)
            self._send_json({"status": "error", "message": str(exc)}, status=500)

    def log_message(self, fmt: str, *args) -> None:
        LOGGER.debug("%s - %s", self.address_string(), fmt % args)


def main() -> None:
    port = int(os.getenv("DASHBOARD_PORT", "9000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    LOGGER.info("Dashboard server listening on http://127.0.0.1:%s", port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
