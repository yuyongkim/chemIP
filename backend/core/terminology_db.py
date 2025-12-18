import sqlite3
import os
import re

class TerminologyDB:
    def __init__(self, db_path=None):
        # Use absolute path based on project root
        if db_path is None:
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            db_path = os.path.join(project_root, "data", "terminology.db")
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.create_tables()

    def create_tables(self):

        cursor = self.conn.cursor()
        
        # Chemical Terms Table (Original Source of Truth)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chemical_terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cas_no TEXT,
                description TEXT
            )
        ''')

        # FTS5 Virtual Table for Search
        # We index name, cas_no, and description for full-text search
        cursor.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS chemical_terms_fts USING fts5(
                name, 
                cas_no, 
                description, 
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
            print("Building FTS index...")
            cursor.execute('''
                INSERT INTO chemical_terms_fts(rowid, name, cas_no, description)
                SELECT id, name, cas_no, description FROM chemical_terms
            ''')
            self.conn.commit()
            print("FTS index built.")

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
        cursor.execute('''
            INSERT OR REPLACE INTO msds_details (chem_id, section_seq, section_name, content)
            VALUES (?, ?, ?, ?)
        ''', (chem_id, section_seq, section_name, content))
        self.conn.commit()

    def get_stats(self):
        cursor = self.conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM chemical_terms')
        term_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM msds_details')
        detail_count = cursor.fetchone()[0]
        return {"terms": term_count, "details": detail_count}

    def search_chemicals(self, query: str, limit: int = 10, offset: int = 0):
        cursor = self.conn.cursor()
        
        # FTS5 Query Syntax
        # We want to match prefix for typing (e.g. "Benz*")
        # And ensure we sanitize the query to prevent syntax errors
        safe_query = query.replace('"', '').replace("'", "")
        fts_query = f'"{safe_query}"* OR {safe_query}*'
        
        # Using FTS5 match
        # sort by rank is implicit or explicit depending on version, 
        # usually default order is by relevance in FTS5
        sql = '''
            SELECT rowid, name, cas_no, description 
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
                "chem_id": chem_id
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
        except:
            total_count = 0
        
        return {"items": results, "total": total_count}

    def get_msds_details_by_chem_id(self, chem_id):
        cursor = self.conn.cursor()
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
