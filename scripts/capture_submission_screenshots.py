"""Capture submission screenshots for key product pages.

This script starts backend/frontend locally and captures screenshots using
Playwright CLI into docs/screenshots/.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen
from urllib.error import URLError, HTTPError


def configure_output() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def npm_command(*args: str) -> list[str]:
    if os.name == "nt":
        return ["cmd", "/c", "npm", *args]
    return ["npm", *args]


def wait_for_url(url: str, timeout_seconds: int = 90) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urlopen(url, timeout=2) as response:
                status = getattr(response, "status", 200)
                if 200 <= status < 400:
                    return True
        except (URLError, HTTPError, TimeoutError):
            pass
        time.sleep(0.5)
    return False


def run_cmd(command: list[str], cwd: Path) -> None:
    print(f"[cmd] {' '.join(command)}")
    result = subprocess.run(
        command,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        output = (result.stdout or "") + (result.stderr or "")
        raise RuntimeError(output.strip() or f"Command failed: {' '.join(command)}")


def capture(output_path: Path, url: str, root: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    command = npm_command(
        "exec",
        "playwright",
        "--",
        "screenshot",
        "--browser",
        "chromium",
        "--wait-for-timeout",
        "7000",
        "--viewport-size",
        "1440,2200",
        url,
        str(output_path),
    )
    run_cmd(command, root)
    print(f"[ok] {output_path}")


def ensure_playwright_browser(root: Path) -> None:
    command = npm_command("exec", "playwright", "--", "install", "chromium")
    run_cmd(command, root)
    print("[ok] Playwright chromium installed")


def main() -> int:
    configure_output()

    root = Path(__file__).resolve().parents[1]
    python_exe = root / ".venv" / "Scripts" / "python.exe"
    if not python_exe.exists():
        python_exe = Path(sys.executable)

    backend_cmd = [
        str(python_exe),
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "7010",
    ]
    frontend_cmd = npm_command("run", "dev")

    backend = subprocess.Popen(
        backend_cmd,
        cwd=str(root),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    frontend = subprocess.Popen(
        frontend_cmd,
        cwd=str(root / "frontend"),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
    )

    try:
        if not wait_for_url("http://127.0.0.1:7010/docs", timeout_seconds=60):
            raise RuntimeError("Backend did not start on http://127.0.0.1:7010")
        if not wait_for_url("http://127.0.0.1:7000", timeout_seconds=90):
            raise RuntimeError("Frontend did not start on http://127.0.0.1:7000")

        ensure_playwright_browser(root)

        targets = [
            (
                root / "docs" / "screenshots" / "01_home_search.png",
                "http://127.0.0.1:7000/?q=benzene",
            ),
            (
                root / "docs" / "screenshots" / "02_chemical_detail_msds.png",
                "http://127.0.0.1:7000/chemical/001008",
            ),
            (
                root / "docs" / "screenshots" / "03_patents_search.png",
                "http://127.0.0.1:7000/patents?q=benzene",
            ),
            (
                root / "docs" / "screenshots" / "04_trade_search.png",
                "http://127.0.0.1:7000/trade?q=benzene",
            ),
            (
                root / "docs" / "screenshots" / "05_drugs_search.png",
                "http://127.0.0.1:7000/drugs?q=%EC%95%84%EC%8A%A4%ED%94%BC%EB%A6%B0",
            ),
            (
                root / "docs" / "screenshots" / "06_api_docs.png",
                "http://127.0.0.1:7010/docs",
            ),
        ]

        for output_path, url in targets:
            capture(output_path, url, root)

        print("[PASS] Screenshot capture completed")
        return 0
    except Exception as exc:
        print(f"[FAIL] {exc}")
        return 1
    finally:
        frontend.terminate()
        backend.terminate()
        for process in (frontend, backend):
            try:
                process.wait(timeout=10)
            except Exception:
                process.kill()


if __name__ == "__main__":
    raise SystemExit(main())
