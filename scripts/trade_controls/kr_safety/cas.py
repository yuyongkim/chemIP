"""CAS Registry Number extraction, normalisation and check-digit validation."""
from __future__ import annotations

import re

_CAS_RE = re.compile(r"^(\d{2,7})-(\d{2})-(\d)$")
# CAS inside running text; whitespace is removed before searching so that
# numbers wrapped across lines ("101-68\n-8") are recovered.
_CAS_IN_TEXT = re.compile(r"(?<![\d-])(\d{2,7}-\d{2}-\d)(?![\d-])")


def normalize(raw: str) -> str:
    s = re.sub(r"\s+", "", raw or "")
    m = re.match(r"^0*(\d+)-(\d{2})-(\d)$", s)
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else s


def is_valid(cas: str) -> bool:
    m = _CAS_RE.match(cas or "")
    if not m:
        return False
    digits = (m.group(1) + m.group(2))[::-1]
    return sum((i + 1) * int(d) for i, d in enumerate(digits)) % 10 == int(m.group(3))


def find_all(text: str) -> list[str]:
    """All CAS-shaped tokens in text (order kept, duplicates dropped)."""
    out: list[str] = []
    for c in _CAS_IN_TEXT.findall(re.sub(r"\s+", "", text or "")):
        c = normalize(c)
        if c not in out:
            out.append(c)
    return out
