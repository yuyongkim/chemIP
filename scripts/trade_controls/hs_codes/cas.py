"""CAS Registry Number normalisation and check-digit validation."""
from __future__ import annotations

import re

_CAS_RE = re.compile(r"^(\d{2,7})-(\d{2})-(\d)$")


def normalize(raw: str) -> str:
    """Strip whitespace/NBSP and leading zeros of the first block. Does not validate."""
    s = re.sub(r"[\s ]+", "", raw or "")
    m = re.match(r"^0*(\d+)-(\d{2})-(\d)$", s)
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else s


def is_valid(cas: str) -> bool:
    """True when cas has CAS RN shape and a correct check digit."""
    m = _CAS_RE.match(cas or "")
    if not m:
        return False
    digits = (m.group(1) + m.group(2))[::-1]
    total = sum((i + 1) * int(d) for i, d in enumerate(digits))
    return total % 10 == int(m.group(3))
