"""CAS Registry Number validation and extraction from free text."""
import re

CAS_FORMAT = re.compile(r"^(\d{2,7})-(\d{2})-(\d)$")
CAS_IN_TEXT = re.compile(r"(?<![\d-])(\d{2,7}-\d{2}-\d)(?![\d-])")


def is_valid_cas(value):
    """True when value is NNNNNNN-NN-N with a correct check digit."""
    m = CAS_FORMAT.match((value or "").strip())
    if not m:
        return False
    digits = (m.group(1) + m.group(2))[::-1]
    checksum = sum((i + 1) * int(d) for i, d in enumerate(digits)) % 10
    return checksum == int(m.group(3))


def find_cas(text):
    """Valid CAS numbers appearing in text, in order of appearance (with start offsets)."""
    return [(m.group(1), m.start()) for m in CAS_IN_TEXT.finditer(text or "") if is_valid_cas(m.group(1))]
