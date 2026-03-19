"""Create next revision file for submission report and update revision history.

Usage:
  python scripts/create_submission_revision.py --note "문구 보완"
  python scripts/create_submission_revision.py --source docs/SUBMISSION_REPORT.md --note "rev 추가"
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path


REVISION_PATTERN = re.compile(r"^SUBMISSION_REPORT_rev(\d+)_(\d{4}-\d{2}-\d{2})\.md$")


def configure_output() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def next_revision_number(revision_dir: Path) -> int:
    max_rev = -1
    for path in revision_dir.glob("SUBMISSION_REPORT_rev*_*.md"):
        match = REVISION_PATTERN.match(path.name)
        if not match:
            continue
        number = int(match.group(1))
        if number > max_rev:
            max_rev = number
    return max_rev + 1


def append_history_row(history_path: Path, row: str) -> None:
    if not history_path.exists():
        history_path.write_text(
            "# SUBMISSION_REPORT Revision History\n\n"
            "## 이력\n\n"
            "| Revision | Date | File | Change Summary |\n"
            "| --- | --- | --- | --- |\n"
            f"{row}\n",
            encoding="utf-8",
        )
        return

    text = history_path.read_text(encoding="utf-8", errors="replace")
    marker = "\n## 다음 리비전 생성 규칙"
    if marker in text:
        text = text.replace(marker, f"{row}\n{marker}", 1)
    else:
        if not text.endswith("\n"):
            text += "\n"
        text += f"{row}\n"
    history_path.write_text(text, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create next submission report revision.")
    parser.add_argument(
        "--source",
        default="docs/SUBMISSION_REPORT.md",
        help="Source markdown to snapshot (default: docs/SUBMISSION_REPORT.md)",
    )
    parser.add_argument(
        "--revision-dir",
        default="docs/submission_reports",
        help="Revision directory (default: docs/submission_reports)",
    )
    parser.add_argument(
        "--history",
        default="docs/submission_reports/REVISION_HISTORY.md",
        help="Revision history markdown path",
    )
    parser.add_argument(
        "--note",
        default="내용 업데이트",
        help="Short change summary for history table",
    )
    parser.add_argument(
        "--date",
        default=date.today().isoformat(),
        help="Revision date YYYY-MM-DD (default: today)",
    )
    return parser.parse_args()


def main() -> int:
    configure_output()
    args = parse_args()

    source = Path(args.source)
    revision_dir = Path(args.revision_dir)
    history_path = Path(args.history)

    if not source.exists():
        print(f"[FAIL] source file not found: {source}")
        return 1

    revision_dir.mkdir(parents=True, exist_ok=True)
    rev_no = next_revision_number(revision_dir)
    revision_name = f"SUBMISSION_REPORT_rev{rev_no}_{args.date}.md"
    target = revision_dir / revision_name

    target.write_text(source.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")

    safe_note = args.note.replace("|", "/").strip()
    row = f"| rev{rev_no} | {args.date} | `{target.as_posix()}` | {safe_note} |"
    append_history_row(history_path, row)

    print(f"[PASS] revision created: {target}")
    print(f"[PASS] history updated: {history_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
