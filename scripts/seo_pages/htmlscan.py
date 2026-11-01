"""One-pass HTML scanner used by the validators: structure errors, head fields, links, JSON-LD, per-section data ids."""
from __future__ import annotations

from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
DATA_KEYS = ("data-list", "data-permit", "data-rule", "data-jur")


class Scan(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.errors: list[str] = []
        self.title = ""
        self.meta: dict[str, str] = {}
        self.canonical = ""
        self.hreflang: dict[str, str] = {}
        self.hrefs: list[str] = []
        self.ld: list[str] = []
        self.h1 = 0
        self.lang = ""
        self.section = ""
        self.counts: dict[str, int] = {}
        self.data: dict[str, dict[str, list[str]]] = {}
        self.text_by_id: dict[str, str] = {}
        self._cap: str | None = None
        self._buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        if tag == "html":
            self.lang = a.get("lang", "")
        elif tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                self.meta[key] = a.get("content", "")
        elif tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href", "")
        elif tag == "link" and a.get("rel") == "alternate" and a.get("hreflang"):
            self.hreflang[a["hreflang"]] = a.get("href", "")
        elif tag == "link" and a.get("href"):
            self.hrefs.append(a["href"])
        elif tag == "a" and a.get("href"):
            self.hrefs.append(a["href"])
        elif tag == "h1":
            self.h1 += 1
        elif tag == "h2":
            self.section = a.get("id", "")
            if a.get("data-count") is not None:
                self.counts[self.section] = int(a["data-count"])
        for k in DATA_KEYS:
            if a.get(k):
                self.data.setdefault(self.section, {}).setdefault(k, []).append(a[k])
        if tag == "title" or (tag == "script" and a.get("type") == "application/ld+json") or (tag == "p" and a.get("id")):
            self._cap = "title" if tag == "title" else ("ld" if tag == "script" else f"p#{a['id']}")
            self._buf = []

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack or self.stack[-1] != tag:
            self.errors.append(f"unexpected </{tag}> (open: {self.stack[-3:]})")
            if tag in self.stack:
                while self.stack and self.stack.pop() != tag:
                    pass
            return
        self.stack.pop()
        if self._cap and ((self._cap == "title" and tag == "title") or (self._cap == "ld" and tag == "script")
                          or (self._cap.startswith("p#") and tag == "p")):
            text = "".join(self._buf)
            if self._cap == "title":
                self.title = text
            elif self._cap == "ld":
                self.ld.append(text)
            else:
                self.text_by_id[self._cap[2:]] = text
            self._cap = None

    def handle_data(self, data):
        if self._cap:
            self._buf.append(data)


def scan(text: str) -> Scan:
    s = Scan()
    s.feed(text)
    s.close()
    if s.stack:
        s.errors.append(f"unclosed: {s.stack}")
    return s
