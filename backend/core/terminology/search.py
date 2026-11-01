"""Chemical search: synonym hits + alias hits + FTS candidate rows, merged and scored (scoring: ranking.py)."""
import re
import sqlite3
from typing import Any

from backend.core.chemical_aliases import (
    build_search_candidates,
    extract_alias_candidates,
    normalize_alias,
)
from backend.core.terminology.ranking import ranking, score
from backend.core.terminology.synonyms import synonym_index


class SearchMixin:
    """Expects ``self.conn`` and ``self.find_alias_matches`` (AliasStoreMixin)."""

    @staticmethod
    def _sanitize_fts_query(query: str) -> str:
        sanitized = re.sub(r'["\'\(\)\*\+\-\^~]', ' ', query)
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()
        return sanitized

    def _fetch_search_rows(self, query: str, limit: int) -> list[sqlite3.Row]:
        cursor = self.conn.cursor()
        safe_query = self._sanitize_fts_query(query)
        if not safe_query:
            return []
        fts_query = f'"{safe_query}"* OR {safe_query}*'
        sql = '''
            SELECT ct.id, ct.name, ct.cas_no, ct.description, ct.name_en, ct.source
            FROM chemical_terms ct
            INNER JOIN (
                SELECT rowid, rank FROM chemical_terms_fts
                WHERE chemical_terms_fts MATCH ?
            ) fts ON ct.id = fts.rowid
            ORDER BY
                CASE WHEN ct.source = 'KOSHA' THEN 0 ELSE 1 END,
                fts.rank
            LIMIT ?
        '''
        try:
            cursor.execute(sql, (fts_query, limit))
        except sqlite3.OperationalError:
            cursor.execute(sql, (f'"{safe_query}"', limit))
        return cursor.fetchall()

    def _fetch_rows_by_cas(self, cas_no: str) -> list[sqlite3.Row]:
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT id, name, cas_no, description, name_en, source FROM chemical_terms WHERE cas_no = ? ORDER BY id",
            (cas_no,),
        )
        return cursor.fetchall()

    def _serialize_search_row(self, row: sqlite3.Row) -> dict[str, Any]:
        desc = row[3] or ""
        source = row[5] if len(row) > 5 else None
        chem_id = None
        if desc.startswith("KOSHA_ID:"):
            chem_id = desc.split(":", 1)[1]
        detail_id = chem_id if chem_id else (row[2] if row[2] else None)
        return {
            "id": row[0],
            "name": row[1],
            "cas_no": row[2],
            "chem_id": detail_id,
            "name_en": row[4] if len(row) > 4 else None,
            "source": source,
            "has_msds": source == "KOSHA",
        }

    def search_chemicals(self, query: str, limit: int = 10, offset: int = 0):
        candidates = build_search_candidates(query)
        if not candidates:
            return {"items": [], "total": 0}

        w = ranking()
        synonyms = synonym_index()
        normalized_query = normalize_alias(query)
        alias_hits = self.find_alias_matches(query, limit=max(6, limit * 2))
        synonym_hits = synonyms.hits([normalize_alias(c) for c in candidates])
        heuristics = bool(alias_hits or synonym_hits)  # see ranking.py: keeps the static lean path exact
        merged: dict[int, dict[str, Any]] = {}

        def merge_item(item: dict[str, Any], *, base_score: float, matched_alias: str = "") -> None:
            key = int(item["id"])
            existing = merged.get(key)
            syn_tier = synonyms.tier(normalized_query, item.get("cas_no"))
            item_score = score(item, base=base_score, query=query, syn_tier=syn_tier, heuristics=heuristics, w=w)
            if existing is None or item_score > existing["_score"]:
                merged[key] = {**item, "_score": item_score, "_matched_alias": matched_alias}

        # 등록부 이름·이명(NCIS·K-REACH·KISCHEM·출처 있는 보충 목록)이 맞은 물질은 그 CAS 의 행을 바로 넣는다.
        for cas_no, name, _tier in synonym_hits:
            for row in self._fetch_rows_by_cas(cas_no):
                merge_item(self._serialize_search_row(row), base_score=w["synonym_hit_base"], matched_alias=name)

        for index, hit in enumerate(alias_hits):
            search_terms = extract_alias_candidates(
                hit.get("alias"),
                hit.get("name"),
                hit.get("name_en"),
                hit.get("cas_no"),
            )
            for term in search_terms[:4]:
                for row in self._fetch_search_rows(term, max(8, limit * 3)):
                    item = self._serialize_search_row(row)
                    if hit.get("cas_no") and item.get("cas_no") != hit["cas_no"] and item.get("chem_id") != hit["canonical_id"]:
                        continue
                    merge_item(item, base_score=w["alias_hit_base"] - (index * w["alias_hit_step"]),
                               matched_alias=hit.get("alias", ""))

        for term_index, candidate in enumerate(candidates[:5]):
            for row_index, row in enumerate(self._fetch_search_rows(candidate, max(12, limit * 4))):
                item = self._serialize_search_row(row)
                merge_item(item, base_score=w["fts_base"] - (term_index * w["fts_term_step"]) - (row_index * w["fts_row_step"]))

        ranked = sorted(
            merged.values(),
            key=lambda item: (-float(item["_score"]), item.get("name") or "", item.get("source") or ""),
        )
        total_count = len(ranked)
        page = ranked[offset: offset + max(1, limit)]
        results = [{k: v for k, v in item.items() if not k.startswith("_")} for item in page]

        return {"items": results, "total": total_count}
