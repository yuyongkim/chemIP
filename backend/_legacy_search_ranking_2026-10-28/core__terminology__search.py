"""Chemical search: FTS candidate rows + alias hits, merged and scored."""
import re
import sqlite3
from typing import Any

from backend.core.chemical_aliases import (
    build_search_candidates,
    clean_alias_value,
    extract_alias_candidates,
    normalize_alias,
)


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

        normalized_query = normalize_alias(query)
        alias_hits = self.find_alias_matches(query, limit=max(6, limit * 2))
        merged: dict[int, dict[str, Any]] = {}

        def merge_item(item: dict[str, Any], *, base_score: float, matched_alias: str = "") -> None:
            key = int(item["id"])
            existing = merged.get(key)
            # 저장 이름이 "벤젠 (Benzene)" / "에틸렌 (관용명: ...)" 형식이라, 괄호 주석을 떼고 기본명으로 정확일치 비교.
            exact_name = normalize_alias((item.get("name") or "").split("(")[0]) == normalized_query
            exact_name_en = normalize_alias((item.get("name_en") or "").split("(")[0]) == normalized_query
            exact_cas = (item.get("cas_no") or "").strip() == clean_alias_value(query)
            score = base_score
            # 정확일치는 어느 경로(별칭 base 900 등)보다도 위로 올라오게 지배적 가점.
            if exact_cas:
                score += 1000
            if exact_name or exact_name_en:
                score += 700
            if item.get("source") == "KOSHA":
                score += 40

            if existing is None or score > existing["_score"]:
                merged[key] = {**item, "_score": score, "_matched_alias": matched_alias}

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
                    merge_item(item, base_score=900 - (index * 40), matched_alias=hit.get("alias", ""))

        for term_index, candidate in enumerate(candidates[:5]):
            for row_index, row in enumerate(self._fetch_search_rows(candidate, max(12, limit * 4))):
                item = self._serialize_search_row(row)
                merge_item(item, base_score=500 - (term_index * 40) - (row_index * 6))

        ranked = sorted(
            merged.values(),
            key=lambda item: (-float(item["_score"]), item.get("name") or "", item.get("source") or ""),
        )
        total_count = len(ranked)
        page = ranked[offset: offset + max(1, limit)]
        results = [{k: v for k, v in item.items() if not k.startswith("_")} for item in page]

        return {"items": results, "total": total_count}
