"""Reference implementation of the CLIENT-SIDE search over the static index (v1/search/).

It reads ONLY the static files (no database), the way a browser would fetch them, and reproduces
TerminologyDB.search_chemicals: alias exact hits -> FTS5 sub-searches, candidate FTS searches, score merge.
FTS5 semantics reproduced: unicode61 tokenization (index tokens copied from the live index),
query  '"<q>"* OR <q>*'  (phrase-prefix OR AND-of-barewords with last-prefix), syntax-error fallback to
exact phrase, bm25(k1=1.2, b=0.75) summed over all query phrases, ORDER BY KOSHA first, rank, rowid.

The pure string helpers (clean/normalize/candidates) are imported from backend.core.chemical_aliases;
a browser build would port those ~120 lines to JS 1:1.
"""
from __future__ import annotations

import gzip
import json
import math
import os
import re
import unicodedata

import config
from search_keys import fnv1a32, query_key

from backend.core.chemical_aliases import (  # noqa: E402
    build_search_candidates, clean_alias_value, extract_alias_candidates, normalize_alias, pick_canonical_chem_id,
)

K1, B = 1.2, 0.75
SEARCH_DIR = config.SEARCH_DIR


def _fold(ch: str) -> str:
    if ord(ch) < 0x2000:  # unicode61 remove_diacritics=1 (Latin); never decompose Hangul
        ch = "".join(c for c in unicodedata.normalize("NFD", ch) if unicodedata.category(c) != "Mn") or ch
    return ch.lower()


def tokenize(text: str) -> list[str]:
    """unicode61: token chars are categories L*, N*, Co; everything else separates."""
    out, cur = [], []
    for ch in text:
        cat = unicodedata.category(ch)
        if cat[0] in "LN" or cat == "Co":
            cur.append(_fold(ch))
        elif cur:
            out.append("".join(cur))
            cur = []
    if cur:
        out.append("".join(cur))
    return out


_BAREWORD_OK = re.compile(r"^[A-Za-z0-9_\x1a\u0080-\U0010ffff]+$")


class StaticIndex:
    def __init__(self, root: str = SEARCH_DIR):
        self.root = root
        self.fetched: dict[str, int] = {}  # rel path -> gzip bytes (what a browser would download once)
        self._cache: dict[str, object] = {}
        self.manifest = self._get("manifest.json")
        self.shard_keys = self.manifest["shards"]
        self.avgdl = self.manifest["n_token"] / self.manifest["n_row"]
        self._postings: dict[str, dict[int, list[int]]] = {}
        self._prefix: dict[str, dict[int, list[int]]] = {}

    # ---------- file access (one fetch per file, then cached like a browser) ----------
    def _get(self, rel: str):
        if rel not in self._cache:
            path = os.path.join(self.root, rel)
            if not os.path.exists(path):
                self._cache[rel] = None
                return None
            with open(path, "rb") as fh:
                data = fh.read()
            self.fetched[rel] = len(gzip.compress(data, 6))
            self._cache[rel] = json.loads(data)
        return self._cache[rel]

    @property
    def docmeta(self):  # lazy: the precomputed path never needs it
        return self._get("docmeta.json")

    def reset_counters(self):
        self.fetched = {}

    def _shards_for(self, prefix: str, exact: bool) -> list[str]:
        files = []
        for key, nums in self.shard_keys.items():
            if prefix.startswith(key) or (not exact and key.startswith(prefix)):
                files += [f"t/{n}.json" for n in nums]
        return files

    def _decode(self, flat: list[int]) -> dict[int, list[int]]:
        out, i, d = {}, 0, 0
        while i < len(flat):
            d += flat[i]
            n = flat[i + 1]
            out[d] = flat[i + 2: i + 2 + n]
            i += 2 + n
        return out

    def postings(self, token: str, prefix: bool) -> dict[int, list[int]]:
        key = (token, prefix)
        cache = self._prefix if prefix else self._postings
        if token in cache:
            return cache[token]
        merged: dict[int, list[int]] = {}
        for rel in self._shards_for(token, exact=not prefix):
            shard = self._get(rel) or {}
            for t, flat in shard.items():
                if (t.startswith(token) if prefix else t == token):
                    for d, ps in self._decode(flat).items():
                        merged.setdefault(d, []).extend(ps)
        cache[token] = merged
        return merged

    def doc(self, doc_id: int):
        bucket = self._get(f"d/{doc_id // self.manifest['bucket']}.json") or {}
        return bucket.get(str(doc_id))

    # ---------- FTS5 emulation ----------
    def _phrase_hits(self, toks: list[str], prefix_last: bool) -> dict[int, int]:
        """doc -> number of phrase instances."""
        if not toks:
            return {}
        lists = [self.postings(t, prefix_last and i == len(toks) - 1) for i, t in enumerate(toks)]
        docs = set(lists[0])
        for l in lists[1:]:
            docs &= set(l)
        hits = {}
        for d in docs:
            sets = [set(l[d]) for l in lists]
            n = sum(1 for p in lists[0][d] if all((p + 4 * k) in sets[k] for k in range(1, len(toks))))
            if n:
                hits[d] = n
        return hits

    def fts(self, query: str, limit: int) -> list[int]:
        safe = re.sub(r'["\'\(\)\*\+\-\^~]', " ", query)
        safe = re.sub(r"\s+", " ", safe).strip()
        if not safe:
            return []
        words = safe.split(" ")
        syntax_ok = all(_BAREWORD_OK.match(w) for w in words) and not any(w in ("AND", "OR", "NOT", "NEAR") for w in words)
        phrases: list[dict[int, int]] = []
        p0 = self._phrase_hits(tokenize(safe), prefix_last=syntax_ok)
        phrases.append(p0)
        matched = set(p0)
        if syntax_ok:
            and_sets = None
            for i, w in enumerate(words):
                toks = tokenize(w)
                if not toks:  # a bareword with no token chars (e.g. '·') is dropped by FTS5
                    continue
                h = self._phrase_hits(toks, prefix_last=(i == len(words) - 1))
                phrases.append(h)
                and_sets = set(h) if and_sets is None else and_sets & set(h)
            matched |= and_sets or set()
        n_row = self.manifest["n_row"]
        idfs = []
        for h in phrases:
            idf = math.log((n_row - len(h) + 0.5) / (len(h) + 0.5))
            idfs.append(idf if idf > 0 else 1e-6)
        scored = []
        for d in matched:
            meta = self.docmeta[d] if d < len(self.docmeta) else 0
            dl = meta // 2
            s = 0.0
            for h, idf in zip(phrases, idfs):
                f = h.get(d, 0)
                if f:
                    s += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * dl / self.avgdl))
            scored.append((0 if meta & 1 else 1, -s, d))
        scored.sort()
        return [d for _, _, d in scored[:limit]]

    # ---------- backend search_chemicals emulation ----------
    def _serialize(self, doc_id: int) -> dict:
        name, cas, desc, name_en, source = self.doc(doc_id)
        chem_id = desc.split(":", 1)[1] if desc.startswith("KOSHA_ID:") else None
        return {
            "id": doc_id, "name": name or None, "cas_no": cas or None,
            "chem_id": chem_id if chem_id else (cas if cas else None),
            "name_en": name_en or None, "source": source or None, "has_msds": source == "KOSHA",
        }

    def alias_matches(self, query: str, limit: int) -> list[dict]:
        types = self.manifest["alias_types"]
        rows: dict[str, dict] = {}
        for cand in build_search_candidates(query):
            norm = normalize_alias(cand)
            if not norm:
                continue
            shard = (self._get(f"a/{fnv1a32(norm) % self.manifest['alias_buckets']}.json") or {}).get("a", {})
            for alias, tcode, conf, ref in (shard.get(norm) or [])[: max(1, limit)]:
                if isinstance(ref, int):
                    name, cas, desc, name_en, source = self.doc(ref)
                    canon = pick_canonical_chem_id(row_id=ref, description=desc, cas_no=cas, source=source)
                else:
                    canon, name, name_en, cas, source = ref
                item = rows.get(canon)
                if item is None or float(conf or 0) > float(item["confidence"]):
                    rows[canon] = {
                        "canonical_id": canon, "alias": alias, "alias_type": types[tcode] if isinstance(tcode, int) else tcode,
                        "name": name or "", "name_en": name_en or "", "cas_no": cas or "", "source": source or "",
                        "confidence": float(conf or 0),
                    }
        return list(rows.values())

    def search_chemicals(self, query: str, limit: int = 10, offset: int = 0) -> dict:
        candidates = build_search_candidates(query)
        if not candidates:
            return {"items": [], "total": 0}
        nq = normalize_alias(query)
        alias_hits = self.alias_matches(query, limit=max(6, limit * 2))
        merged: dict[int, dict] = {}

        def merge(item, base, matched=""):
            key = int(item["id"])
            score = base
            if (item.get("cas_no") or "").strip() == clean_alias_value(query):
                score += 260
            if normalize_alias(item.get("name")) == nq or normalize_alias(item.get("name_en")) == nq:
                score += 180
            if item.get("source") == "KOSHA":
                score += 40
            ex = merged.get(key)
            if ex is None or score > ex["_score"]:
                merged[key] = {**item, "_score": score, "_matched_alias": matched}

        for index, hit in enumerate(alias_hits):
            terms = extract_alias_candidates(hit.get("alias"), hit.get("name"), hit.get("name_en"), hit.get("cas_no"))
            for term in terms[:4]:
                for d in self.fts(term, max(8, limit * 3)):
                    item = self._serialize(d)
                    if hit.get("cas_no") and item.get("cas_no") != hit["cas_no"] and item.get("chem_id") != hit["canonical_id"]:
                        continue
                    merge(item, 900 - index * 40, hit.get("alias", ""))
        for ti, cand in enumerate(candidates[:5]):
            for ri, d in enumerate(self.fts(cand, max(12, limit * 4))):
                merge(self._serialize(d), 500 - ti * 40 - ri * 6)
        ranked = sorted(merged.values(), key=lambda it: (-float(it["_score"]), it.get("name") or "", it.get("source") or ""))
        page = ranked[offset: offset + max(1, limit)]
        return {"items": [{k: v for k, v in it.items() if not k.startswith("_")} for it in page], "total": len(ranked)}

    # ---------- production path: precomputed -> lean FTS -> full replica ----------
    def search(self, query: str, limit: int = 20) -> dict:
        """limit must be 20 for the precomputed path (what the frontend requests)."""
        key = query_key(query)
        if not key:
            return {"items": [], "total": 0, "mode": "empty"}
        shard = self._get(f"a/{fnv1a32(normalize_alias(query)) % self.manifest['alias_buckets']}.json") or {}
        pre = (shard.get("q") or {}).get(key)
        # casefold-stable only: a JS port lowercases instead of casefolding (differs for e.g. "ß"); skip those
        stable = key == clean_alias_value(query).lower()
        if pre is not None and stable and limit == self.manifest.get("search_limit", 20):
            return {"items": [self._serialize(d) for d in pre[1:]], "total": pre[0], "mode": "precomputed"}
        if self.alias_matches(query, limit=max(6, limit * 2)):
            return {**self.search_chemicals(query, limit), "mode": "client_full"}
        return {**self._lean(query, limit), "mode": "client_fts"}

    def _lean(self, query: str, limit: int) -> dict:
        """No alias hit => no exact name/CAS bonus is possible (every name, name_en and CAS is an alias key),
        so scores need only FTS order + KOSHA flag (docmeta). Doc records are fetched just for the page (+ ties)."""
        scores: dict[int, float] = {}
        for ti, cand in enumerate(build_search_candidates(query)[:5]):
            for ri, d in enumerate(self.fts(cand, max(12, limit * 4))):
                s = 500 - ti * 40 - ri * 6 + (40 if self.docmeta[d] & 1 else 0)
                if s > scores.get(d, -1e9):
                    scores[d] = s
        order = sorted(scores, key=lambda d: -scores[d])
        if not order:
            return {"items": [], "total": 0}
        cutoff = scores[order[min(limit, len(order)) - 1]]
        head = [self._serialize(d) for d in order if scores[d] >= cutoff]
        head.sort(key=lambda it: (-scores[it["id"]], it.get("name") or "", it.get("source") or ""))
        return {"items": head[:limit], "total": len(order)}
