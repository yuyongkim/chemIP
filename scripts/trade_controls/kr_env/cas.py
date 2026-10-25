"""CAS Registry Number normalisation and check-digit validation."""
from __future__ import annotations

import re

_CAS_RE = re.compile(r"^(\d{2,7})-(\d{2})-(\d)$")
CAS_IN_TEXT = re.compile(r"\b0*(\d{2,7})-(\d{2})-(\d)\b")


def normalize(raw: str) -> str:
    """Strip whitespace and leading zeros of the first block ("000050-00-0" -> "50-00-0")."""
    s = re.sub(r"\s+", "", raw or "")
    m = re.match(r"^0*(\d+)-(\d{2})-(\d)$", s)
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else s


def is_valid(cas: str) -> bool:
    """True when cas has CAS RN shape and a correct check digit."""
    m = _CAS_RE.match(cas or "")
    if not m:
        return False
    digits = (m.group(1) + m.group(2))[::-1]
    return sum((i + 1) * int(d) for i, d in enumerate(digits)) % 10 == int(m.group(3))
