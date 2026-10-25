"""Shared build context: downloaded law XML (cached), version metadata, name index."""
from __future__ import annotations

from functools import cached_property

from . import law_fetch, law_xml, list_model
from .name_match import NameIndex


class Ctx:
    def __init__(self) -> None:
        self.manifest = law_fetch.load_manifest()
        self._roots: dict = {}

    def law(self, key: str):
        if key not in self._roots:
            meta = self.manifest["laws"].get(key) or self.manifest["admruls"][key]
            self._roots[key] = law_xml.load(meta["file"])
        return self._roots[key]

    def meta(self, key: str) -> dict:
        return self.manifest["laws"].get(key) or self.manifest["admruls"][key]

    def url(self, key: str) -> str:
        if key in self.manifest["laws"]:
            return list_model.law_url(self.meta(key)["mst"])
        return list_model.admrul_url(self.meta(key)["id"])

    def version(self, key: str) -> dict:
        m = self.meta(key)
        return {"instrument": m["name"], "promulgated": list_model.ymd(m["promulgated"]),
                "effective": list_model.ymd(m["effective"]),
                "promulgation_no": m.get("promulgation_no"),
                "law_go_kr_id": m.get("mst") or m.get("id")}

    def annex(self, key: str, no: int, branch: int = 0) -> dict:
        return law_xml.annex(self.law(key), no, branch)

    def article(self, key: str, no: int, branch: int = 0) -> str:
        return law_xml.article_text(self.law(key), no, branch)

    @cached_property
    def names(self) -> NameIndex:
        from . import law_names           # local import: law_names reads annexes through this ctx
        idx = NameIndex()
        idx.add_law_pairs(law_names.pairs(self))
        return idx
