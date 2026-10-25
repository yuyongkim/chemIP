"""Isolated-mode launcher (python -I adds no script/cwd path, so add the package parent here).

    python -I G:\\MSDS\\scripts\\trade_controls\\kr_safety\\run.py fetch   # download law XML
    python -I G:\\MSDS\\scripts\\trade_controls\\kr_safety\\run.py build   # parse and write outputs
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding="utf-8")

from kr_safety import build_all, law_fetch  # noqa: E402

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "build"
    if cmd == "fetch":
        law_fetch.fetch_all()
    elif cmd == "build":
        sys.exit(build_all.main(sys.argv[2:]))
    else:
        sys.exit(f"unknown command: {cmd} (use fetch | build)")
