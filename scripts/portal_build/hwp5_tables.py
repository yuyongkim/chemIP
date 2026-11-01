"""Read the tables of an HWP 5 file (Hangul word processor, OLE compound file) with the standard library only.

Used for the MOEL notice attachment (별표 1, published only as .hwp on law.go.kr). Returns every table as rows of cell
texts, placed by the cell's own (row, col) address so merged cells keep their position.

    tables = read_tables(path)       # [[["cell", ...], ...], ...]

Format references: Microsoft [MS-CFB] (compound file), Hancom "HWP 5.0 file format" (records, BodyText/Section<n>).
"""
from __future__ import annotations

import struct
import zlib

_FREESECT = 0xFFFFFFFF
_ENDOFCHAIN = 0xFFFFFFFE

# HWP record tags (HWPTAG_BEGIN = 0x10)
_TAG_PARA_TEXT = 0x43
_TAG_CTRL_HEADER = 0x47
_TAG_LIST_HEADER = 0x48
_CTRL_TABLE = b" lbt"  # 'tbl ' stored little-endian

# PARA_TEXT control characters that occupy 8 WCHARs (extended / inline controls); the others are 1 WCHAR.
_WIDE_CTRL = {1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23}


class CompoundFile:
    """Minimal [MS-CFB] reader: enough to read named streams."""

    def __init__(self, data: bytes):
        if data[:8] != b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
            raise ValueError("not an OLE compound file")
        self.data = data
        self.sector_size = 1 << struct.unpack_from("<H", data, 0x1E)[0]
        self.mini_size = 1 << struct.unpack_from("<H", data, 0x20)[0]
        n_fat, first_dir = struct.unpack_from("<II", data, 0x2C)
        self.mini_cutoff, first_minifat, n_minifat, first_difat, n_difat = struct.unpack_from("<IIIII", data, 0x38)
        difat = list(struct.unpack_from("<109I", data, 0x4C))
        sect = first_difat
        for _ in range(n_difat):
            vals = struct.unpack_from(f"<{self.sector_size // 4}I", self._sector(sect))
            difat.extend(vals[:-1])
            sect = vals[-1]
        self.fat: list[int] = []
        for s in difat[:n_fat]:
            if s != _FREESECT:
                self.fat.extend(struct.unpack_from(f"<{self.sector_size // 4}I", self._sector(s)))
        self.entries = self._read_dir(self._chain(first_dir))
        root = self.entries[0]
        self.mini_stream = self._chain(root["start"])[: root["size"]]
        mf = self._chain(first_minifat) if n_minifat else b""
        self.minifat = list(struct.unpack_from(f"<{len(mf) // 4}I", mf)) if mf else []

    def _sector(self, n: int) -> bytes:
        off = (n + 1) * self.sector_size
        return self.data[off: off + self.sector_size]

    def _chain(self, start: int) -> bytes:
        out, s, seen = [], start, set()
        while s not in (_ENDOFCHAIN, _FREESECT) and s not in seen and s < len(self.fat):
            seen.add(s)
            out.append(self._sector(s))
            s = self.fat[s]
        return b"".join(out)

    def _mini_chain(self, start: int, size: int) -> bytes:
        out, s, seen = [], start, set()
        while s not in (_ENDOFCHAIN, _FREESECT) and s not in seen and s < len(self.minifat):
            seen.add(s)
            out.append(self.mini_stream[s * self.mini_size: (s + 1) * self.mini_size])
            s = self.minifat[s]
        return b"".join(out)[:size]

    @staticmethod
    def _read_dir(raw: bytes) -> list[dict]:
        entries = []
        for off in range(0, len(raw) - 127, 128):
            name_len = struct.unpack_from("<H", raw, off + 64)[0]
            name = raw[off: off + max(0, name_len - 2)].decode("utf-16-le", "replace")
            kind = raw[off + 66]
            left, right, child = struct.unpack_from("<III", raw, off + 68)
            start, size = struct.unpack_from("<II", raw, off + 116)
            entries.append({"name": name, "type": kind, "left": left, "right": right, "child": child,
                            "start": start, "size": size})
        return entries

    def _children(self, idx: int) -> list[int]:
        out, stack = [], [self.entries[idx]["child"]]
        while stack:
            i = stack.pop()
            if i == _FREESECT or i >= len(self.entries):
                continue
            out.append(i)
            stack += [self.entries[i]["left"], self.entries[i]["right"]]
        return out

    def find(self, path: str) -> dict | None:
        idx = 0
        for part in path.split("/"):
            idx = next((c for c in self._children(idx) if self.entries[c]["name"] == part), None)
            if idx is None:
                return None
        return self.entries[idx]

    def stream(self, path: str) -> bytes:
        e = self.find(path)
        if e is None:
            raise KeyError(path)
        if e["size"] < self.mini_cutoff:
            return self._mini_chain(e["start"], e["size"])
        return self._chain(e["start"])[: e["size"]]

    def list_streams(self, storage: str) -> list[str]:
        e = self.find(storage)
        if e is None:
            return []
        idx = self.entries.index(e)
        return sorted(self.entries[c]["name"] for c in self._children(idx))


def _records(data: bytes):
    pos = 0
    while pos + 4 <= len(data):
        h = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        tag, level, size = h & 0x3FF, (h >> 10) & 0x3FF, h >> 20
        if size == 0xFFF:
            size = struct.unpack_from("<I", data, pos)[0]
            pos += 4
        yield tag, level, data[pos: pos + size]
        pos += size


def para_text(payload: bytes) -> str:
    """PARA_TEXT payload → plain text (controls dropped, line breaks and tabs kept as space)."""
    out, i, n = [], 0, len(payload) // 2
    while i < n:
        c = struct.unpack_from("<H", payload, i * 2)[0]
        if c < 32:
            if c in (9, 10, 13, 24, 30, 31):
                out.append(" " if c != 30 else "-")
            i += 8 if c in _WIDE_CTRL else 1
            continue
        out.append(chr(c))
        i += 1
    return "".join(out)


def _section_tables(data: bytes) -> list[list[list[str]]]:
    tables, cur, tbl_level, cell = [], None, None, None
    for tag, level, payload in _records(data):
        if cur is not None and level <= tbl_level:
            tables.append(cur)
            cur, cell = None, None
        if tag == _TAG_CTRL_HEADER and payload[:4] == _CTRL_TABLE and cur is None:
            cur, tbl_level, cell = {}, level, None
            continue
        if cur is None:
            continue
        if tag == _TAG_LIST_HEADER and level == tbl_level + 1 and len(payload) >= 16:
            col, row = struct.unpack_from("<HH", payload, 8)
            cell = cur.setdefault((row, col), [])
        elif tag == _TAG_PARA_TEXT and cell is not None:
            cell.append(para_text(payload))
    if cur is not None:
        tables.append(cur)
    out = []
    for t in tables:
        if not t:
            continue
        n_rows = max(r for r, _ in t) + 1
        n_cols = max(c for _, c in t) + 1
        grid = [["" for _ in range(n_cols)] for _ in range(n_rows)]
        for (r, c), parts in t.items():
            grid[r][c] = " ".join(p.strip() for p in parts if p.strip())
        out.append(grid)
    return out


def read_tables(path: str) -> list[list[list[str]]]:
    with open(path, "rb") as fh:
        cf = CompoundFile(fh.read())
    header = cf.stream("FileHeader")
    if not header.startswith(b"HWP Document File"):
        raise ValueError("not an HWP 5 file")
    props = struct.unpack_from("<I", header, 36)[0]
    if props & 2:
        raise ValueError("encrypted HWP")
    compressed = bool(props & 1)
    tables = []
    for name in sorted(cf.list_streams("BodyText"), key=lambda s: int(s[7:]) if s[7:].isdigit() else 0):
        raw = cf.stream(f"BodyText/{name}")
        if compressed:
            raw = zlib.decompress(raw, -15)
        tables.extend(_section_tables(raw))
    return tables
