"""chemical_terms rows: insert/merge KOSHA and external-source chemicals, metadata lookups, indexing keywords."""
import re


class ChemicalStoreMixin:
    """Expects ``self.conn`` and ``self._upsert_alias_rows`` (AliasStoreMixin)."""

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
