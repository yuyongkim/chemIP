"""Collect CAS -> HS code mappings into backend/data/trade_controls/hs_codes.sqlite.

Run isolated (downloaded files are untrusted data):
    python -I G:\\MSDS\\scripts\\trade_controls\\collect_hs_codes.py
"""
import os
import sys

# -I drops the script directory from sys.path; add it back explicitly (our code only).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hs_codes.pipeline import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
