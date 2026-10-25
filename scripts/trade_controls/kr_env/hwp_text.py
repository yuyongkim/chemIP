"""Plain-text extraction from HWP 5.x files (OLE2 compound documents), stdlib only.

Used for 고시 whose tables law.go.kr serves only as images (e.g. 휘발성유기화합물
지정 고시). Returns one line per paragraph (table cells become their own lines).
The file is untrusted: sizes are bounded and nothing is executed.
"""
from __future__ import annotations

import struct
import zlib

_FREESECT, _ENDOFCHAIN = 0xFFFFFFFF, 0xFFFFFFFE
_MAX_STREAM = 64 * 1024 * 1024


class _Ole:
    def __init__(self, data: bytes) -> None:
        if data[:8] != bytes.fromhex("d0cf11e0a1b11ae1"):
            raise ValueError("not an OLE2 file")
        self.d = data
        hdr = data[:512]
        self.ss = 1 << struct.unpack_from("<H", hdr, 30)[0]
        self.mss = 1 << struct.unpack_from("<H", hdr, 32)[0]
        n_fat = struct.unpack_from("<I", hdr, 44)[0]
        dir_start = struct.unpack_from("<I", hdr, 48)[0]
        self.mini_cutoff = struct.unpack_from("<I", hdr, 56)[0]
        minifat_start = struct.unpack_from("<I", hdr, 60)[0]
        difat_start = struct.unpack_from("<I", hdr, 68)[0]
        difat = list(struct.unpack_from("<109I", hdr, 76))
        sect = difat_start
        while sect not in (_FREESECT, _ENDOFCHAIN) and len(difat) < 1_000_000:
            blk = self._sector(sect)
            vals = struct.unpack(f"<{self.ss // 4}I", blk)
            difat.extend(vals[:-1])
            sect = vals[-1]
        self.fat: list[int] = []
        for s in difat[:n_fat]:
            if s in (_FREESECT, _ENDOFCHAIN):
                continue
            self.fat.extend(struct.unpack(f"<{self.ss // 4}I", self._sector(s)))
        dir_bytes = self._chain(dir_start)
        self.entries = []
        for i in range(0, len(dir_bytes), 128):
            e = dir_bytes[i:i + 128]
            nlen = struct.unpack_from("<H", e, 64)[0]
            name = e[:max(0, nlen - 2)].decode("utf-16-le", "replace")
            etype = e[66]
            start = struct.unpack_from("<I", e, 116)[0]
            size = struct.unpack_from("<I", e, 120)[0]
            left, right, child = struct.unpack_from("<III", e, 68)
            self.entries.append({"name": name, "type": etype, "start": start, "size": size,
                                 "left": left, "right": right, "child": child})
        root = self.entries[0]
        self.ministream = self._chain(root["start"])[:root["size"]] if root["size"] else b""
        self.minifat = []
        if minifat_start not in (_FREESECT, _ENDOFCHAIN):
            mf = self._chain(minifat_start)
            self.minifat = list(struct.unpack(f"<{len(mf) // 4}I", mf))

    def _sector(self, n: int) -> bytes:
        off = (n + 1) * self.ss
        return self.d[off:off + self.ss]

    def _chain(self, start: int) -> bytes:
        out, s, guard = [], start, 0
        while s not in (_FREESECT, _ENDOFCHAIN) and s < len(self.fat):
            out.append(self._sector(s))
            s = self.fat[s]
            guard += 1
            if guard * self.ss > _MAX_STREAM:
                raise ValueError("OLE chain too long")
        return b"".join(out)

    def _minichain(self, start: int) -> bytes:
        out, s, guard = [], start, 0
        while s not in (_FREESECT, _ENDOFCHAIN) and s < len(self.minifat):
            off = s * self.mss
            out.append(self.ministream[off:off + self.mss])
            s = self.minifat[s]
            guard += 1
            if guard > 1_000_000:
                raise ValueError("mini chain too long")
        return b"".join(out)

    def _path_index(self) -> dict[str, int]:
        paths: dict[str, int] = {}

        def walk(idx: int, prefix: str, depth: int = 0) -> None:
            if idx >= len(self.entries) or idx == _FREESECT or depth > 64:
                return
            e = self.entries[idx]
            walk(e["left"], prefix, depth + 1)
            walk(e["right"], prefix, depth + 1)
            path = f"{prefix}/{e['name']}" if prefix else e["name"]
            paths[path] = idx
            if e["type"] == 1:  # storage
                walk(e["child"], path, depth + 1)

        walk(self.entries[0]["child"], "")
        return paths

    def read(self, path: str) -> bytes:
        idx = self._path_index()[path]
        e = self.entries[idx]
        if e["size"] < self.mini_cutoff:
            return self._minichain(e["start"])[:e["size"]]
        return self._chain(e["start"])[:e["size"]]

    def list(self) -> list[str]:
        return sorted(self._path_index())


_PARA_TEXT = 0x10 + 51
_SINGLE = {0, 10, 13} | set(range(24, 32))


def _para_text(buf: bytes) -> str:
    out, i, n = [], 0, len(buf) // 2
    while i < n:
        ch = struct.unpack_from("<H", buf, i * 2)[0]
        if ch >= 32:
            out.append(chr(ch))
            i += 1
        elif ch in _SINGLE:
            if ch in (10, 13):
                out.append("\n")
            elif ch in (24, 30, 31):
                out.append(" ")
            i += 1
        else:
            i += 8  # inline / extended control occupies 8 wchars
    return "".join(out)


def extract_text(data: bytes) -> str:
    ole = _Ole(data)
    header = ole.read("FileHeader")
    if not header.startswith(b"HWP Document File"):
        raise ValueError("not an HWP 5 document")
    compressed = bool(struct.unpack_from("<I", header, 36)[0] & 1)
    sections = sorted((p for p in ole.list() if p.startswith("BodyText/Section")),
                      key=lambda p: int(p.rsplit("Section", 1)[1]))
    lines: list[str] = []
    for sec in sections:
        raw = ole.read(sec)
        if compressed:
            dec = zlib.decompressobj(-15)
            raw = dec.decompress(raw, _MAX_STREAM)
        pos = 0
        while pos + 4 <= len(raw):
            h = struct.unpack_from("<I", raw, pos)[0]
            pos += 4
            tag, size = h & 0x3FF, (h >> 20) & 0xFFF
            if size == 0xFFF:
                size = struct.unpack_from("<I", raw, pos)[0]
                pos += 4
            if tag == _PARA_TEXT:
                lines.append(_para_text(raw[pos:pos + size]).strip())
            pos += size
    return "\n".join(lines)
