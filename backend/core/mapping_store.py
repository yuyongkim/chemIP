"""Drug and guide mapping DB operations extracted from terminology_db.py.

Provides MappingStoreMixin that TerminologyDB inherits to keep
domain-specific CRUD in a dedicated module.
"""

from __future__ import annotations

import json
import logging
import re
import sqlite3

logger = logging.getLogger(__name__)


class MappingStoreMixin:
    """Mixin providing drug_mappings and guide_mappings table operations.

    Expects ``self.conn`` (sqlite3.Connection) from the host class.
    """

    conn: sqlite3.Connection

    @staticmethod
    def _parse_json_list(value) -> list:
        if not value:
            return []
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []

    # ------------------------------------------------------------------
    # Guide mappings
    # ------------------------------------------------------------------

    def upsert_guide_mappings(self, chem_id: str, recommendations: list[dict]):
        if not recommendations:
            return
        cursor = self.conn.cursor()
        for rec in recommendations:
            cursor.execute(
                '''
                INSERT OR REPLACE INTO guide_mappings (
                    chem_id, guide_no, guide_title, score,
                    match_terms, match_fields,
                    guide_cas_numbers, guide_keywords,
                    snippet, file_download_url, source, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''',
                (
                    chem_id,
                    str(rec.get("guide_no", "")).strip(),
                    str(rec.get("title", "")).strip(),
                    int(rec.get("score", 0) or 0),
                    json.dumps(rec.get("match_terms", []), ensure_ascii=False),
                    json.dumps(rec.get("match_fields", []), ensure_ascii=False),
                    json.dumps(rec.get("guide_cas_numbers", []), ensure_ascii=False),
                    json.dumps(rec.get("guide_keywords", []), ensure_ascii=False),
                    str(rec.get("snippet", "")),
                    str(rec.get("file_download_url", "")),
                    str(rec.get("source", "kosha_guide")),
                ),
            )
        self.conn.commit()

    def get_guide_mappings(self, chem_id: str, limit: int = 10):
        cursor = self.conn.cursor()
        cursor.execute(
            '''
            SELECT guide_no, guide_title, score,
                   match_terms, match_fields,
                   guide_cas_numbers, guide_keywords,
                   snippet, file_download_url, source, updated_at
            FROM guide_mappings
            WHERE chem_id = ?
            ORDER BY score DESC, updated_at DESC
            LIMIT ?
            ''',
            (chem_id, max(1, limit)),
        )
        rows = cursor.fetchall()

        pjl = self._parse_json_list
        out = []
        for row in rows:
            out.append({
                "guide_no": row[0],
                "title": row[1],
                "score": row[2],
                "match_terms": pjl(row[3]),
                "match_fields": pjl(row[4]),
                "guide_cas_numbers": pjl(row[5]),
                "guide_keywords": pjl(row[6]),
                "snippet": row[7] or "",
                "file_download_url": row[8] or "",
                "source": row[9] or "kosha_guide",
                "updated_at": row[10],
            })
        return out

    # ------------------------------------------------------------------
    # Drug mappings
    # ------------------------------------------------------------------

    def upsert_drug_mappings(self, chem_id: str, source: str, items: list[dict]):
        if not items:
            return
        cursor = self.conn.cursor()
        for item in items:
            item_key = item.get("_key", "")
            if not item_key:
                continue
            cursor.execute(
                '''
                INSERT OR REPLACE INTO drug_mappings (chem_id, source, item_key, data, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''',
                (chem_id, source, item_key, json.dumps(item, ensure_ascii=False)),
            )
        self.conn.commit()

    def get_drug_mappings(self, chem_id: str, source: str | None = None, limit: int = 50):
        cursor = self.conn.cursor()
        if source:
            cursor.execute(
                'SELECT source, data FROM drug_mappings WHERE chem_id = ? AND source = ? ORDER BY updated_at DESC LIMIT ?',
                (chem_id, source, limit),
            )
        else:
            cursor.execute(
                'SELECT source, data FROM drug_mappings WHERE chem_id = ? ORDER BY source, updated_at DESC LIMIT ?',
                (chem_id, limit),
            )
        rows = cursor.fetchall()
        result: dict[str, list] = {}
        for row in rows:
            src = row[0]
            try:
                data = json.loads(row[1])
            except Exception:
                continue
            result.setdefault(src, []).append(data)
        return result

    # ------------------------------------------------------------------
    # MSDS English safety data
    # ------------------------------------------------------------------

    def get_msds_english_by_chem_id(self, chem_id):
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                '''
                SELECT cas_no, name_en, pubchem_cid, signal_word,
                       ghs_classification, hazard_statements,
                       precautionary_statements, pictograms, last_updated
                FROM msds_english
                WHERE chem_id = ?
                ''',
                (chem_id,),
            )
        except sqlite3.OperationalError:
            return None

        row = cursor.fetchone()
        if not row:
            return None

        pjl = self._parse_json_list
        return {
            "cas_no": row[0],
            "name_en": row[1],
            "pubchem_cid": row[2],
            "signal_word": row[3] or "",
            "ghs_classification": pjl(row[4]),
            "hazard_statements": pjl(row[5]),
            "precautionary_statements": pjl(row[6]),
            "pictograms": pjl(row[7]),
            "last_updated": row[8],
        }
