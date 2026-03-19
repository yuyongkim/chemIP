import json
import logging
import re
import sqlite3

from backend.config.settings import settings

logger = logging.getLogger(__name__)


class TerminologyDB:
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

    @staticmethod
    def _parse_json_list(value) -> list:
        """Safely parse a JSON string that should be a list."""
        if not value:
            return []
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []

    def create_tables(self):

        cursor = self.conn.cursor()
        
        # Chemical Terms Table (Original Source of Truth)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chemical_terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cas_no TEXT,
                description TEXT,
                name_en TEXT
            )
        ''')

        # Add name_en column if missing (for existing DBs)
        try:
            cursor.execute("ALTER TABLE chemical_terms ADD COLUMN name_en TEXT")
        except Exception:
            pass  # column already exists

        # FTS5 Virtual Table for Search
        # We index name, cas_no, and description for full-text search
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
        
        self.conn.commit()
        self.sync_fts()

    def sync_fts(self):
        """
        Syncs the FTS table with the main table.
        This is a simple rebuild strategy. For huge DBs, triggers are better.
        """
        cursor = self.conn.cursor()
        # Check if FTS is empty
        cursor.execute("SELECT count(*) FROM chemical_terms_fts")
        if cursor.fetchone()[0] == 0:
            logger.info("Building FTS index...")
            cursor.execute('''
                INSERT INTO chemical_terms_fts(rowid, name, cas_no, description)
                SELECT id, name, cas_no, description FROM chemical_terms
            ''')
            self.conn.commit()
            logger.info("FTS index built.")

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
        
        # Sync FTS (Insert)
        last_id = cursor.lastrowid
        cursor.execute('''
            INSERT INTO chemical_terms_fts (rowid, name, cas_no, description)
            VALUES (?, ?, ?, ?)
        ''', (last_id, name, cas_no, f"KOSHA_ID:{chem_id}" if chem_id else description))

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
            
            # Update FTS table - Use DELETE then INSERT to avoid issues
            cursor.execute('DELETE FROM chemical_terms_fts WHERE rowid = ?', (row_id,))
            cursor.execute('''
                INSERT INTO chemical_terms_fts (rowid, name, cas_no, description)
                VALUES (?, ?, ?, ?)
            ''', (row_id, final_name, cas_no, kosha_id_str))

        else:
            # Insert
            cursor.execute('''
                INSERT INTO chemical_terms (name, cas_no, description)
                VALUES (?, ?, ?)
            ''', (name, cas_no, kosha_id_str))
            
            last_id = cursor.lastrowid
            
            # Use explicit columns including rowid
            cursor.execute('''
                INSERT INTO chemical_terms_fts (rowid, name, cas_no, description)
                VALUES (?, ?, ?, ?)
            ''', (last_id, name, cas_no, kosha_id_str))
            
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
        """Escape FTS5 special characters to prevent query injection."""
        # Remove FTS5 operators and special characters
        sanitized = re.sub(r'["\'\(\)\*\+\-\^~]', ' ', query)
        # Collapse whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()
        return sanitized

    def search_chemicals(self, query: str, limit: int = 10, offset: int = 0):
        cursor = self.conn.cursor()

        safe_query = self._sanitize_fts_query(query)
        if not safe_query:
            return {"items": [], "total": 0}
        fts_query = f'"{safe_query}"* OR {safe_query}*'
        
        # Using FTS5 match
        # sort by rank is implicit or explicit depending on version, 
        # usually default order is by relevance in FTS5
        sql = '''
            SELECT rowid, name, cas_no, description, name_en 
            FROM chemical_terms_fts 
            WHERE chemical_terms_fts MATCH ? 
            ORDER BY rank 
            LIMIT ? OFFSET ?
        '''
        
        try:
            cursor.execute(sql, (fts_query, limit, offset))
        except sqlite3.OperationalError:
            # Fallback for very weird queries or symbol-heavy ones
             cursor.execute(sql, (f'"{safe_query}"', limit, offset))

        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            chem_id = None
            if row[3] and row[3].startswith("KOSHA_ID:"):
                chem_id = row[3].split(":")[1]
                
            results.append({
                "id": row[0],
                "name": row[1],
                "cas_no": row[2],
                "chem_id": chem_id,
                "name_en": row[4] if len(row) > 4 else None
            })
            
        # Get total count (approximation for speed)
        count_sql = '''
            SELECT COUNT(*) 
            FROM chemical_terms_fts 
            WHERE chemical_terms_fts MATCH ?
        '''
        try:
            cursor.execute(count_sql, (fts_query,))
            total_count = cursor.fetchone()[0]
        except sqlite3.OperationalError:
            total_count = len(results)
        
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

    def get_msds_english_by_chem_id(self, chem_id):
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                '''
                SELECT
                    cas_no,
                    name_en,
                    pubchem_cid,
                    signal_word,
                    ghs_classification,
                    hazard_statements,
                    precautionary_statements,
                    pictograms,
                    last_updated
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

    def get_chemical_meta_by_chem_id(self, chem_id: str):
        cursor = self.conn.cursor()
        cursor.execute(
            '''
            SELECT id, name, cas_no, name_en
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
            "chem_id": chem_id,
        }

    def upsert_guide_mappings(self, chem_id: str, recommendations: list[dict]):
        if not recommendations:
            return
        cursor = self.conn.cursor()
        for rec in recommendations:
            cursor.execute(
                '''
                INSERT OR REPLACE INTO guide_mappings (
                    chem_id,
                    guide_no,
                    guide_title,
                    score,
                    match_terms,
                    match_fields,
                    guide_cas_numbers,
                    guide_keywords,
                    snippet,
                    file_download_url,
                    source,
                    updated_at
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
            SELECT
                guide_no,
                guide_title,
                score,
                match_terms,
                match_fields,
                guide_cas_numbers,
                guide_keywords,
                snippet,
                file_download_url,
                source,
                updated_at
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
            out.append(
                {
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
                }
            )
        return out

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
