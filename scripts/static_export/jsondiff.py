"""First differing path between two JSON values (None when equal)."""
from __future__ import annotations


def first_diff(a, b, path: str = ""):
    if type(a) is not type(b):
        return path or "/"
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b), key=str):
            if a.get(k) != b.get(k):
                return first_diff(a.get(k), b.get(k), f"{path}/{k}")
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return f"{path}[len {len(a)} vs {len(b)}]"
        for i, (x, y) in enumerate(zip(a, b)):
            if x != y:
                return first_diff(x, y, f"{path}[{i}]")
        return None
    return None if a == b else (path or "/")
