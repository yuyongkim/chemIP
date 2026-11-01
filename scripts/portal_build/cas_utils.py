"""CAS registry number checks (pure functions)."""
from __future__ import annotations

import re

CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")
_LOOSE_RE = re.compile(r"^(\d{2,7})-(\d{1,3})-(\d{1,2})$")


def cas_checksum_ok(cas: str) -> bool:
    digits = cas.replace("-", "")
    body, check = digits[:-1], int(digits[-1])
    return sum(int(d) * (i + 1) for i, d in enumerate(reversed(body))) % 10 == check


def is_cas(value: str | None) -> bool:
    """Shape of a CAS number (what the static files use as a key). The check digit is not required."""
    return bool(value) and bool(CAS_RE.match(value))


def repair_cas(value: str | None) -> str | None:
    """A CAS as written, or a repaired one, or None.

    Repairs only the spreadsheet damage seen in KOSHA MSDS section 3 ("6973-09-07": the check digit got a leading
    zero, or the middle part lost one), and only when the repaired number passes the check-digit test.
    """
    s = (value or "").strip().replace(" ", "")
    if is_cas(s):
        return s
    m = _LOOSE_RE.match(s)
    if not m:
        return None
    first, mid, last = m.groups()
    mid = mid[-2:].rjust(2, "0") if len(mid) != 2 else mid
    last = str(int(last))
    if len(last) != 1:
        return None
    fixed = f"{first}-{mid}-{last}"
    return fixed if is_cas(fixed) and cas_checksum_ok(fixed) else None
