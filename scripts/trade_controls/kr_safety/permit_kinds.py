"""Permit kind codes used in permits_spec.py -> the Korean `kind` words written to kr_permits_safety.json.

The words are the vocabulary of the sibling files (kr_permits_env.json / kr_permits_product.json):
허가 · 승인 · 신고 · 제출 · 준수의무, combined with '·' as those files do ('확인·신고').
"""

KIND_KO = {
    "permit": "허가",
    "approval": "승인",
    "report": "신고",
    "report_review": "제출·심사",
    "obligation": "준수의무",
    "obligation_report": "실시·보고",
}


def kind_ko(code: str) -> str:
    """Korean kind word for a spec code; an unknown code fails the build (never written in English)."""
    try:
        return KIND_KO[code]
    except KeyError:
        raise KeyError(f"permit kind {code!r} has no Korean word in permit_kinds.KIND_KO") from None
