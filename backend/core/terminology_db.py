import logging
import re
import sqlite3
from typing import Any

from backend.config.settings import settings
from backend.core.chemical_aliases import (
    alias_metadata_from_name,
    build_search_candidates,
    clean_alias_value,
    extract_alias_candidates,
    normalize_alias,
    pick_canonical_chem_id,
)
from backend.core.mapping_store import MappingStoreMixin

logger = logging.getLogger(__name__)


class TerminologyDB(MappingStoreMixin):
    def __init__(self, db_path=None):
        if db_path is None:
            db_path = settings.TERMINOLOGY_DB_PATH
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA busy_timeout=5000")
        self.create_tables()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False

    def create_tables(self):
        cursor = self.conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chemical_terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cas_no TEXT,
                description TEXT,
                name_en TEXT,
                source TEXT DEFAULT 'KOSHA',
                external_id TEXT
            )
        ''')

        for statement in (
            "ALTER TABLE chemical_terms ADD COLUMN name_en TEXT",
            "ALTER TABLE chemical_terms ADD COLUMN source TEXT DEFAULT 'KOSHA'",
            "ALTER TABLE chemical_terms ADD COLUMN external_id TEXT",
        ):
            try:
                cursor.execute(statement)
            except Exception:
                pass

        cursor.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS chemical_terms_fts USING fts5(
                name,
                cas_no,
                description,
                name_en,
                content='chemical_terms',
                content_rowid='id'
            )
        ''')

        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS chemical_aliases (
                canonical_id TEXT NOT NULL,
                alias TEXT NOT NULL,
                alias_norm TEXT NOT NULL,
                alias_type TEXT DEFAULT 'derived',
                chem_name TEXT,
                name_en TEXT,
                cas_no TEXT,
                source TEXT,
                confidence REAL DEFAULT 1.0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (canonical_id, alias_norm)
            )
            '''
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_chemical_aliases_alias_norm ON chemical_aliases(alias_norm)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_chemical_aliases_canonical_id ON chemical_aliases(canonical_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_chemical_terms_cas_no ON chemical_terms(cas_no)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_chemical_terms_source ON chemical_terms(source)"
        )

        # Patent Terms Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patent_terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                term TEXT NOT NULL,
                definition TEXT,
                category TEXT
            )
        ''')
        
        # MSDS Details Table (Stores specific sections)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS msds_details (
                chem_id TEXT,
                section_seq INTEGER,
                section_name TEXT,
                content TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (chem_id, section_seq)
            )
        ''')

        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS drug_mappings (
                chem_id TEXT NOT NULL,
                source TEXT NOT NULL,
                item_key TEXT NOT NULL,
                data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (chem_id, source, item_key)
            )
            '''
        )

        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS guide_mappings (
                chem_id TEXT NOT NULL,
                guide_no TEXT NOT NULL,
                guide_title TEXT,
                score INTEGER DEFAULT 0,
                match_terms TEXT,
                match_fields TEXT,
                guide_cas_numbers TEXT,
                guide_keywords TEXT,
                snippet TEXT,
                file_download_url TEXT,
                source TEXT DEFAULT 'kosha_guide',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (chem_id, guide_no)
            )
            '''
        )
        
        cursor.execute("UPDATE chemical_terms SET source = 'KOSHA' WHERE source IS NULL OR TRIM(source) = ''")

        self.conn.commit()
        self.sync_fts()
        self.sync_aliases()

    def sync_fts(self):
        """
        Syncs the FTS table with the main table.
        This is a simple rebuild strategy. For huge DBs, triggers are better.
        """
        cursor = self.conn.cursor()
        cursor.execute("SELECT count(*) FROM chemical_terms_fts")
        if cursor.fetchone()[0] == 0:
            logger.info("Building FTS index...")
            cursor.execute('''
                INSERT INTO chemical_terms_fts(rowid, name, cas_no, description, name_en)
                SELECT id, name, cas_no, description, name_en FROM chemical_terms
            ''')
            self.conn.commit()
            logger.info("FTS index built.")

    def sync_aliases(self) -> None:
        cursor = self.conn.cursor()
        cursor.execute("SELECT 1 FROM chemical_aliases LIMIT 1")
        if cursor.fetchone():
            return

        logger.info("Building chemical alias index...")
        cursor.execute(
            '''
            SELECT id, name, cas_no, description, name_en, source
            FROM chemical_terms
            '''
        )
        rows = cursor.fetchall()
        for row in rows:
            self._upsert_alias_rows(
                row_id=row[0],
                name=row[1],
                cas_no=row[2],
                description=row[3],
                name_en=row[4],
                source=row[5],
            )
        self.conn.commit()
        logger.info("Chemical alias index built (%s chemicals).", len(rows))

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

    def add_chemical_term(self, name, cas_no=None, description=None, chem_id=None):
        cursor = self.conn.cursor()
        if chem_id:
            cursor.execute('SELECT id FROM chemical_terms WHERE description = ?', (f"KOSHA_ID:{chem_id}",))
            if cursor.fetchone():
                return 
        
        cursor.execute('''
            INSERT INTO chemical_terms (name, cas_no, description)
            VALUES (?, ?, ?)
        ''', (name, cas_no, f"KOSHA_ID:{chem_id}" if chem_id else description))

        last_id = cursor.lastrowid
        cursor.execute('''
            INSERT INTO chemical_terms_fts (rowid, name, cas_no, description, name_en)
            VALUES (?, ?, ?, ?, ?)
        ''', (last_id, name, cas_no, f"KOSHA_ID:{chem_id}" if chem_id else description, None))
        self._upsert_alias_rows(
            row_id=last_id,
            name=name,
            cas_no=cas_no,
            description=f"KOSHA_ID:{chem_id}" if chem_id else description,
            name_en=None,
            source="KOSHA",
        )

        self.conn.commit()

    def upsert_chemical_term(self, data: dict):
        cursor = self.conn.cursor()
        chem_id = data.get('chemId')
        name = data.get('chemNameKor')
        cas_no = data.get('casNo')
        
        kosha_id_str = f"KOSHA_ID:{chem_id}"
        
        cursor.execute('SELECT id, name FROM chemical_terms WHERE description = ?', (kosha_id_str,))
        row = cursor.fetchone()
        
        if row:
            row_id = row[0]
            existing_name = row[1]
            
            # Merge Logic
            final_name = existing_name
            if name and name != existing_name:
                # Check for containment
                if name in existing_name:
                    pass
                elif existing_name in name:
                    final_name = name
                else:
                    # Both distinct (e.g. Benzene vs 벤젠)
                    def has_korean(text):
                        return any(ord('가') <= ord(char) <= ord('힣') for char in text)
                    
                    if has_korean(name) and not has_korean(existing_name):
                        final_name = f"{name} ({existing_name})"
                    elif has_korean(existing_name) and not has_korean(name):
                        final_name = f"{existing_name} ({name})"
                    else:
                        final_name = f"{existing_name} ({name})"
            
            # Update main table
            cursor.execute('''
                UPDATE chemical_terms 
                SET name = ?, cas_no = ?
                WHERE id = ?
            ''', (final_name, cas_no, row_id))
            
            self._upsert_alias_rows(
                row_id=row_id,
                name=final_name,
                cas_no=cas_no,
                description=kosha_id_str,
                name_en=None,
                source="KOSHA",
            )

            cursor.execute('DELETE FROM chemical_terms_fts WHERE rowid = ?', (row_id,))
            cursor.execute('''
                INSERT INTO chemical_terms_fts (rowid, name, cas_no, description, name_en)
                VALUES (?, ?, ?, ?, ?)
            ''', (row_id, final_name, cas_no, kosha_id_str, None))

        else:
            cursor.execute('''
                INSERT INTO chemical_terms (name, cas_no, description)
                VALUES (?, ?, ?)
            ''', (name, cas_no, kosha_id_str))

            last_id = cursor.lastrowid
            cursor.execute('''
                INSERT INTO chemical_terms_fts (rowid, name, cas_no, description, name_en)
                VALUES (?, ?, ?, ?, ?)
            ''', (last_id, name, cas_no, kosha_id_str, None))
            self._upsert_alias_rows(
                row_id=last_id,
                name=name,
                cas_no=cas_no,
                description=kosha_id_str,
                name_en=None,
                source="KOSHA",
            )

        self.conn.commit()

    def upsert_msds_detail(self, chem_id, section_seq, section_name, content):
        cursor = self.conn.cursor()
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO msds_details (chem_id, section_seq, section_name, content)
                VALUES (?, ?, ?, ?)
            ''', (chem_id, section_seq, section_name, content))
        except sqlite3.OperationalError:
            # Backward compatibility for legacy schema: (chem_id, section_no, xml_data)
            cursor.execute('''
                INSERT OR REPLACE INTO msds_details (chem_id, section_no, xml_data)
                VALUES (?, ?, ?)
            ''', (chem_id, section_seq, content))
        self.conn.commit()

    def get_stats(self):
        cursor = self.conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM chemical_terms')
        term_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM msds_details')
        detail_count = cursor.fetchone()[0]
        return {"terms": term_count, "details": detail_count}

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
            exact_name = normalize_alias(item.get("name")) == normalized_query
            exact_name_en = normalize_alias(item.get("name_en")) == normalized_query
            exact_cas = (item.get("cas_no") or "").strip() == clean_alias_value(query)
            score = base_score
            if exact_cas:
                score += 260
            if exact_name or exact_name_en:
                score += 180
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

    def get_msds_details_by_chem_id(self, chem_id):
        cursor = self.conn.cursor()
        try:
            cursor.execute('''
                SELECT section_seq, section_name, content 
                FROM msds_details 
                WHERE chem_id = ? 
                ORDER BY section_seq
            ''', (chem_id,))
            rows = cursor.fetchall()
            details = []
            for row in rows:
                details.append({
                    "section_seq": row[0],
                    "section_name": row[1],
                    "content": row[2]
                })
            return details
        except sqlite3.OperationalError:
            # Backward compatibility for legacy schema.
            cursor.execute('''
                SELECT section_no, xml_data
                FROM msds_details
                WHERE chem_id = ?
                ORDER BY section_no
            ''', (chem_id,))
            rows = cursor.fetchall()
        
        details = []
        for row in rows:
            details.append({
                "section_seq": row[0],
                "section_name": f"Section {row[0]}",
                "content": row[1]
            })
        return details

    def get_chemical_meta_by_chem_id(self, chem_id: str):
        cursor = self.conn.cursor()
        cursor.execute(
            '''
            SELECT id, name, cas_no, name_en, description, source, external_id
            FROM chemical_terms
            WHERE description = ?
            LIMIT 1
            ''',
            (f"KOSHA_ID:{chem_id}",),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row[0],
            "name": row[1] or "",
            "cas_no": row[2] or "",
            "name_en": row[3] or "",
            "description": row[4] or "",
            "source": row[5] or "KOSHA",
            "external_id": row[6] or "",
            "chem_id": chem_id,
        }

    def get_chemical_meta_by_cas(self, cas_no: str):
        """Look up chemical metadata by CAS number (for non-KOSHA chemicals)."""
        cursor = self.conn.cursor()
        cursor.execute(
            '''
            SELECT id, name, cas_no, name_en, source, description, external_id
            FROM chemical_terms
            WHERE cas_no = ?
            LIMIT 1
            ''',
            (cas_no,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row[0],
            "name": row[1] or "",
            "cas_no": row[2] or "",
            "name_en": row[3] or "",
            "source": row[4] or "",
            "description": row[5] or "",
            "external_id": row[6] or "",
        }

    def add_chemical_from_source(self, name: str, cas_no: str | None,
                                  source: str, external_id: str,
                                  name_en: str | None = None) -> int | None:
        """Insert a chemical from an external source (ECHA, COMPTOX, etc.).

        Skips if a record with the same CAS + source already exists.
        Returns the new row id, or None if skipped.
        """
        cursor = self.conn.cursor()
        desc = f"{source}_ID:{external_id}"

        # Check by external_id first (exact match)
        cursor.execute(
            "SELECT id FROM chemical_terms WHERE description = ?", (desc,)
        )
        if cursor.fetchone():
            return None

        # Check by CAS + source (avoid duplicate CAS within same source)
        if cas_no:
            cursor.execute(
                "SELECT id FROM chemical_terms WHERE cas_no = ? AND source = ?",
                (cas_no, source),
            )
            if cursor.fetchone():
                return None

        cursor.execute(
            """INSERT INTO chemical_terms (name, cas_no, description, name_en, source, external_id)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (name, cas_no, desc, name_en, source, external_id),
        )
        row_id = cursor.lastrowid

        # Sync FTS
        cursor.execute(
            """INSERT INTO chemical_terms_fts (rowid, name, cas_no, description, name_en)
               VALUES (?, ?, ?, ?, ?)""",
            (row_id, name, cas_no, desc, name_en),
        )
        self._upsert_alias_rows(
            row_id=row_id,
            name=name,
            cas_no=cas_no,
            description=desc,
            name_en=name_en,
            source=source,
        )
        self.conn.commit()
        return row_id

    def get_indexing_keywords(self):
        """
        Get expanded list of keywords for indexing.
        Includes:
        - Original Name
        - CAS No
        - Extracted English Names (from parentheses)
        - Extracted Korean Names (without parentheses)
        """
        cursor = self.conn.cursor()
        cursor.execute('SELECT id, name, cas_no, description FROM chemical_terms')
        rows = cursor.fetchall()
        
        results = []
        seen = set()

        for row in rows:
            chem_id = None
            if row[3] and row[3].startswith("KOSHA_ID:"):
                chem_id = row[3].split(":")[1]
            
            if not chem_id:
                continue

            name = row[1]
            cas_no = row[2]
            
            # Helper to add term
            def add_term(term, type_):
                if not term or len(term) < 2: return
                key = (chem_id, term.lower())
                if key not in seen:
                    results.append({
                        "id": row[0],
                        "name": term,
                        "chem_id": chem_id,
                        "type": type_
                    })
                    seen.add(key)

            # 1. Original Name
            add_term(name, "Original")
            
            # 2. CAS No
            if cas_no:
                add_term(cas_no, "CAS")

            # 3. Extract English from parentheses
            # Pattern: matches text inside () that contains at least one English char
            matches = re.findall(r'\(([^)]*[a-zA-Z][^)]*)\)', name)
            for match in matches:
                clean_match = match.strip()
                add_term(clean_match, "English")
                
                # Split by comma if present (e.g. "ACID, MONOHYDRATE")
                if ',' in clean_match:
                    parts = clean_match.split(',')
                    for part in parts:
                        add_term(part.strip(), "English_Part")

            # 4. Extract Korean parts (remove (...) parts)
            kor_name = re.sub(r'\([^)]*\)', '', name).strip()
            if kor_name:
                add_term(kor_name, "Korean")
                
        return results

    def close(self):
        self.conn.close()
