"""Alias index (chemical_aliases): write alias rows, look up aliases of a chemical, exact alias hits."""
from typing import Any

from backend.core.chemical_aliases import (
    alias_metadata_from_name,
    build_search_candidates,
    clean_alias_value,
    extract_alias_candidates,
    normalize_alias,
    pick_canonical_chem_id,
)


class AliasStoreMixin:
    """Expects ``self.conn`` and the chemical meta readers (ChemicalStoreMixin)."""

    def _upsert_alias_rows(
        self,
        *,
        row_id: int,
        name: str | None,
        cas_no: str | None,
        description: str | None,
        name_en: str | None,
        source: str | None,
        extra_aliases: list[tuple[str, str, float]] | None = None,
    ) -> None:
        cursor = self.conn.cursor()
        canonical_id = pick_canonical_chem_id(
            row_id=row_id,
            description=description,
            cas_no=cas_no,
            source=source,
        )
        aliases = alias_metadata_from_name(name, name_en, cas_no)
        aliases.extend(extra_aliases or [])

        for alias, alias_type, confidence in aliases:
            alias_clean = clean_alias_value(alias)
            alias_norm = normalize_alias(alias_clean)
            if not alias_norm:
                continue
            cursor.execute(
                '''
                INSERT OR REPLACE INTO chemical_aliases (
                    canonical_id, alias, alias_norm, alias_type,
                    chem_name, name_en, cas_no, source, confidence, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''',
                (
                    canonical_id,
                    alias_clean,
                    alias_norm,
                    alias_type,
                    name or "",
                    name_en or "",
                    cas_no or "",
                    source or "",
                    confidence,
                ),
            )

    def add_external_aliases(
        self,
        *,
        chem_id: str,
        aliases: list[str],
        alias_type: str,
        source: str,
        confidence: float = 0.7,
    ) -> int:
        meta = self.get_chemical_meta_by_chem_id(chem_id) or self.get_chemical_meta_by_cas(chem_id)
        if not meta:
            return 0

        row_id = int(meta.get("id", 0) or 0)
        if not row_id:
            return 0

        extra_aliases = [(alias, alias_type, confidence) for alias in extract_alias_candidates(*aliases)]
        self._upsert_alias_rows(
            row_id=row_id,
            name=meta.get("name"),
            cas_no=meta.get("cas_no"),
            description=meta.get("description"),
            name_en=meta.get("name_en"),
            source=meta.get("source"),
            extra_aliases=extra_aliases,
        )
        self.conn.commit()
        return len(extra_aliases)

    def get_aliases_for_chemical(self, chem_id: str, limit: int = 20) -> list[dict[str, Any]]:
        meta = self.get_chemical_meta_by_chem_id(chem_id) or self.get_chemical_meta_by_cas(chem_id)
        if not meta:
            return []

        canonical_id = pick_canonical_chem_id(
            row_id=int(meta.get("id", 0) or 0),
            description=meta.get("description"),
            cas_no=meta.get("cas_no"),
            source=meta.get("source"),
        )

        cursor = self.conn.cursor()
        cursor.execute(
            '''
            SELECT alias, alias_type, source, confidence
            FROM chemical_aliases
            WHERE canonical_id = ?
            ORDER BY
                CASE alias_type
                    WHEN 'cas' THEN 0
                    WHEN 'name_en' THEN 1
                    WHEN 'name' THEN 2
                    ELSE 3
                END,
                confidence DESC,
                alias
            LIMIT ?
            ''',
            (canonical_id, max(1, limit)),
        )
        rows = cursor.fetchall()
        return [
            {
                "alias": row[0],
                "alias_type": row[1],
                "source": row[2],
                "confidence": row[3],
            }
            for row in rows
        ]

    def find_alias_matches(self, query: str, limit: int = 12) -> list[dict[str, Any]]:
        candidates = build_search_candidates(query)
        if not candidates:
            return []

        cursor = self.conn.cursor()
        rows_by_canonical: dict[str, dict[str, Any]] = {}
        for candidate in candidates:
            normalized = normalize_alias(candidate)
            if not normalized:
                continue
            cursor.execute(
                '''
                SELECT canonical_id, alias, alias_type, chem_name, name_en, cas_no, source, confidence
                FROM chemical_aliases
                WHERE alias_norm = ?
                ORDER BY confidence DESC, alias
                LIMIT ?
                ''',
                (normalized, max(1, limit)),
            )
            for row in cursor.fetchall():
                item = rows_by_canonical.get(row[0])
                if item is None or float(row[7] or 0) > float(item["confidence"]):
                    rows_by_canonical[row[0]] = {
                        "canonical_id": row[0],
                        "alias": row[1],
                        "alias_type": row[2],
                        "name": row[3] or "",
                        "name_en": row[4] or "",
                        "cas_no": row[5] or "",
                        "source": row[6] or "",
                        "confidence": float(row[7] or 0),
                    }
        return list(rows_by_canonical.values())
