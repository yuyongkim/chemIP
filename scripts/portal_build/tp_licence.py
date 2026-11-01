"""Licence gate for the temperature-dependent property records (R2 §3 "practical rule").

A record may be shipped only when its `src` is a source of tp_sources.json with allow=true. Anything else — an unknown id,
a red or amber id of the `blocked` list — is refused, and the build fails rather than shipping it.
"""
from __future__ import annotations


class LicenceError(RuntimeError):
    pass


def allowed_sources(registry: dict) -> dict[str, dict]:
    return {s["source_id"]: s for s in registry["sources"] if s.get("allow") is True}


def check(records: list[dict], registry: dict) -> None:
    """Raise LicenceError naming every record source that is not on the allow list."""
    ok = allowed_sources(registry)
    blocked = set(registry.get("blocked", {}).get("red", [])) | set(registry.get("blocked", {}).get("amber_not_shipped", []))
    bad = sorted({r.get("src", "") for r in records if r.get("src") not in ok})
    if bad:
        named = [f"{b} (blocked)" if b in blocked else f"{b} (not on the allow list)" for b in bad]
        raise LicenceError("refused sources: " + ", ".join(named))


def check_file(tp_file: dict, registry: dict) -> None:
    """One assembled per-CAS object: every constant and curve, and every listed source, must be allowed."""
    check(tp_file.get("const", []) + tp_file.get("curves", []), registry)
    check([{"src": s} for s in tp_file.get("sources", {})], registry)
