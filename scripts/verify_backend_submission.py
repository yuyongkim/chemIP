"""Backend-only submission verification runner.

Runs backend smoke tests first and then optional live KIPRIS checks.
Frontend build/lint checks are intentionally excluded because this
verification target is for the backend review repository only.
"""

from __future__ import annotations

import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def configure_output() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


@dataclass
class Step:
    name: str
    command: list[str]
    cwd: Path


def run_step(step: Step) -> int:
    print(f"\n===== {step.name} =====")
    print(f"[cmd] {' '.join(step.command)}")
    print(f"[cwd] {step.cwd}")

    process = subprocess.Popen(
        step.command,
        cwd=str(step.cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    assert process.stdout is not None
    for line in process.stdout:
        print(line.rstrip())

    return process.wait()


def main() -> int:
    configure_output()
    load_dotenv()

    project_root = Path(__file__).resolve().parents[1]
    if os.name == "nt":
        venv_python = project_root / ".venv" / "Scripts" / "python.exe"
    else:
        venv_python = project_root / ".venv" / "bin" / "python"

    python_exe = str(venv_python if venv_python.exists() else Path(sys.executable))

    steps = [
        Step(
            name="Backend smoke tests",
            command=[python_exe, "-m", "pytest", "tests/test_api_smoke.py", "-q"],
            cwd=project_root,
        ),
    ]

    if os.getenv("KIPRIS_API_KEY", "").strip():
        steps.append(
            Step(
                name="Optional live KIPRIS integration",
                command=[python_exe, "scripts/test_kipris_live.py"],
                cwd=project_root,
            )
        )
    else:
        print("[SKIP] Optional live KIPRIS integration (KIPRIS_API_KEY not configured)")

    for step in steps:
        code = run_step(step)
        if code != 0:
            print(f"\n[FAIL] {step.name} (exit {code})")
            return code

    print("\n[PASS] Backend submission verification completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
