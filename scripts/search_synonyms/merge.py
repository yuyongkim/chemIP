"""Collect (cas, name, code) into per-CAS name maps: one entry per normalized name, strongest tier wins; on a tie a
non-PubChem source wins over a PubChem-derived one (so a stored PubChem code means no other source has the name).
Blocklisted (cas, name, source) triples are dropped. A PubChem-derived name that is already a registry-tier name
of a different CAS is dropped too (PubChem computes IUPAC "methane" for elemental carbon CID 5462310)."""
from __future__ import annotations

from spec import TIER_ORDER
from backend.core.chemical_aliases import normalize_alias


class NameCollector:
    def __init__(self, sources: dict[str, dict], known_cas: set[str], blocklist: list[dict]):
        self.sources = sources
        self.known = known_cas
        self.blocked = {(b["cas"], normalize_alias(b["name"]), code) for b in blocklist for code in b["sources"]}
        self.by_cas: dict[str, dict[str, list]] = {}
        self._by_norm: dict[str, dict[str, dict]] = {}  # norm -> {cas: that CAS's name map}
        self.dropped = 0
        self.pubchem_collisions = 0

    def _rank(self, code: str) -> tuple[int, int]:
        s = self.sources[code]
        return TIER_ORDER.index(s["tier"]), 1 if s.get("derived_from") == "pubchem" else 0

    def _registry_elsewhere(self, norm: str, cas: str) -> bool:
        return any(other != cas and self.sources[names[norm][1]]["tier"] == TIER_ORDER[0]
                   for other, names in self._by_norm.get(norm, {}).items() if norm in names)

    def prune_pubchem_collisions(self) -> None:
        """Run after every add: drop stored PubChem-derived names that another CAS holds at registry tier."""
        for cas, names in self.by_cas.items():
            for norm in [n for n, (_, code) in names.items() if self._rank(code)[1]]:
                if self._registry_elsewhere(norm, cas):
                    del names[norm]
                    self.pubchem_collisions += 1

    def add(self, cas: str, name: str, code: str) -> None:
        if cas not in self.known:
            return
        norm = normalize_alias(name)
        if (cas, norm, code) in self.blocked:
            self.dropped += 1
            return
        names = self.by_cas.setdefault(cas, {})
        old = names.get(norm)
        if old is None or self._rank(code) < self._rank(old[1]):
            names[norm] = [name, code]
            self._by_norm.setdefault(norm, {})[cas] = names

    def count(self) -> int:
        return sum(len(v) for v in self.by_cas.values())
