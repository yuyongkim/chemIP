"""Mandatory submission verification runner.

Runs the required checks in sequence and exits non-zero on first failure.
"""

from __future__ import annotations

import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


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


def npm_run(script_name: str) -> list[str]:
    if os.name == "nt":
        return ["cmd", "/c", "npm", "run", script_name]
    return ["npm", "run", script_name]


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

    project_root = Path(__file__).resolve().parents[1]
    venv_python = project_root / ".venv" / "Scripts" / "python.exe"
    python_exe = str(venv_python if venv_python.exists() else Path(sys.executable))
    frontend_dir = project_root / "frontend"

    steps = [
        Step(
            name="Backend tests (pytest)",
            command=[python_exe, "-m", "pytest"],
            cwd=project_root,
        ),
        Step(
            name="KIPRIS live integration",
            command=[python_exe, "scripts/test_kipris_live.py"],
            cwd=project_root,
        ),
        Step(
            name="Frontend lint",
            command=npm_run("lint"),
            cwd=frontend_dir,
        ),
        Step(
            name="Frontend production build",
            command=npm_run("build"),
            cwd=frontend_dir,
        ),
    ]

    for step in steps:
        code = run_step(step)
        if code != 0:
            print(f"\n[FAIL] {step.name} (exit {code})")
            return code

    print("\n[PASS] Mandatory submission verification completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
