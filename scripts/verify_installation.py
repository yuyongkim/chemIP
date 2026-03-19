"""Project installation verification script for ChemIP.

Usage:
  python scripts/verify_installation.py
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable
import importlib
import os
import sys

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover
    load_dotenv = None


REQUIRED_ENV_VARS = [
    "KOSHA_SERVICE_KEY_DECODED",
    "KIPRIS_API_KEY",
    "KOTRA_API_KEY_DECODED",
    "DRUG_API_KEY_DECODED",
]

OPTIONAL_ENV_VARS = [
    "KOSHA_SERVICE_KEY_ENCODED",
    "KOTRA_API_KEY_ENCODED",
    "TOURISM_API_KEY_DECODED",
    "NAVER_CLIENT_ID",
    "NAVER_CLIENT_SECRET",
    "CORS_ORIGINS",
    "KOSHA_GUIDE_DATA_DIR",
]

REQUIRED_IMPORTS = {
    "requests": "requests",
    "urllib3": "urllib3",
    "fastapi": "fastapi",
    "pydantic": "pydantic",
    "starlette": "starlette",
    "dotenv": "python-dotenv",
    "ahocorasick": "pyahocorasick",
    "tqdm": "tqdm",
}


def check_imports() -> list[str]:
    ok = []
    for module, package in REQUIRED_IMPORTS.items():
        try:
            importlib.import_module(module)
            ok.append(f"[OK] {package}")
        except Exception as exc:
            ok.append(f"[MISSING] {package} ({module}) - {exc}")
    return ok


def check_env(path: Path) -> tuple[list[str], list[str]]:
    missing: list[str] = []
    present: list[str] = []
    for name in REQUIRED_ENV_VARS:
        if os.getenv(name):
            present.append(f"[OK] {name}")
        else:
            missing.append(name)

    optional_lines = [f"[OPTIONAL] {name}={'set' if os.getenv(name) else 'not set'}" for name in OPTIONAL_ENV_VARS]
    return missing, present + optional_lines


def check_files(project_root: Path) -> list[str]:
    outputs = []
    checks = [
        ("requirements.txt", project_root / "requirements.txt"),
        (".env", project_root / ".env"),
        (".env.example", project_root / ".env.example"),
        ("data directory", project_root / "data"),
        ("backend package", project_root / "backend"),
        ("frontend package", project_root / "frontend"),
    ]
    for name, target in checks:
        outputs.append(f"[{'OK' if target.exists() else 'MISSING'}] {name}")
    return outputs


def check_db_files(project_root: Path) -> list[str]:
    dbs = [
        ("data/terminology.db", 0.0),
        ("data/global_patent_index.db", 140),
        ("data/uspto_index.db", 1),
    ]
    lines = []
    for rel_path, size_hint_gb in dbs:
        path = project_root / rel_path
        if not path.exists():
            lines.append(f"[MISSING] {rel_path}")
            continue
        if size_hint_gb and path.stat().st_size < size_hint_gb * 1024 * 1024 * 1024 * 0.8:
            lines.append(
                f"[SIZE_WARNING] {rel_path} ({round(path.stat().st_size / 1024**3, 2)} GB)"
            )
        else:
            lines.append(f"[OK] {rel_path}")
    return lines


def check_imports_from_backend() -> str:
    project_root = Path(__file__).resolve().parents[1]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    try:
        from backend.config.settings import settings  # noqa: F401
        from backend.api.kosha_msds_adapter import KoshaMsdsAdapter  # noqa: F401
        from backend.api.kotra_adapter import KotraAdapter  # noqa: F401
        from backend.main import app  # noqa: F401
        return "[OK] backend import"
    except Exception as exc:
        return f"[ERROR] backend import failed: {exc}"


def configure_output() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def load_dotenv_if_possible(project_root: Path) -> None:
    if load_dotenv is None:
        return
    dotenv_file = project_root / ".env"
    if dotenv_file.exists():
        load_dotenv(dotenv_file)


def main() -> int:
    configure_output()
    project_root = Path(__file__).resolve().parents[1]
    load_dotenv_if_possible(project_root)

    print(f"Project root: {project_root}\n")

    print("1) Python version")
    print(f"- Python {sys.version}\n")

    print("2) Required packages")
    for line in check_imports():
        print("-", line)
    print()

    print("3) Environment variables")
    missing, env_report = check_env(Path(os.getenv("PROJECT_ROOT", project_root)))
    for line in env_report:
        print("-", line)
    if missing:
        print("\n[WARN] missing required values in .env or environment:")
        for item in missing:
            print(f" - {item}")

    print("\n4) Required files")
    for line in check_files(project_root):
        print("-", line)

    print("\n5) DB files")
    for line in check_db_files(project_root):
        print("-", line)

    print("\n6) Backend import")
    import_result = check_imports_from_backend()
    print("-", import_result)

    has_failure = bool(missing) or not import_result.startswith("[OK]")
    if has_failure:
        print("\nResult: FAIL - required items not ready")
        return 1

    print("\nResult: PASS - environment ready")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
