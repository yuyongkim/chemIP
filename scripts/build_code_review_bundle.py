from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "dist" / "chemIP"


FILES_TO_COPY = [
    ".env.example",
    ".gitignore",
    "requirements.txt",
    "CONTRIBUTING.md",
    "docs/PAPER_GITHUB_RELEASE_SCOPE.md",
    "start_all.bat",
    "start_all.sh",
    "submit_check.bat",
    "submit_check.sh",
    "ecosystem.config.js",
    "pytest.ini",
]

DIRS_TO_COPY = [
    "backend",
    "frontend",
    "tests",
]

SCRIPT_FILES_TO_COPY = [
    "build_uspto_index.py",
    "build_global_index.py",
    "test_kipris_live.py",
    "verify_submission.py",
]

MIT_LICENSE = """MIT License

Copyright (c) 2026 ChemIP contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""


def copy_file(relative_path: str, *, target_name: str | None = None) -> None:
    source = ROOT / relative_path
    if not source.exists():
        return

    destination = OUT_DIR / (target_name or relative_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def copy_directory(relative_path: str) -> None:
    source = ROOT / relative_path
    destination = OUT_DIR / relative_path
    if not source.exists():
        return
    shutil.copytree(
        source,
        destination,
        ignore=shutil.ignore_patterns(
            "__pycache__",
            "*.pyc",
            ".pytest_cache",
            "node_modules",
            ".next",
            "out",
            "build",
        ),
    )


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Prefer English as the GitHub landing README; keep Korean as a sidecar doc.
    copy_file("README.en.md", target_name="README.md")
    copy_file("README.md", target_name="README.ko.md")

    for relative_path in FILES_TO_COPY:
        copy_file(relative_path)

    for relative_path in DIRS_TO_COPY:
        copy_directory(relative_path)

    scripts_dir = OUT_DIR / "scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)
    for script_name in SCRIPT_FILES_TO_COPY:
        copy_file(f"scripts/{script_name}")

    (OUT_DIR / "LICENSE").write_text(MIT_LICENSE, encoding="utf-8")

    print(f"Bundle created at: {OUT_DIR}")


if __name__ == "__main__":
    main()
