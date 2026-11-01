"""msds_details rows (MSDS sections per KOSHA chem_id) and table counts."""
import sqlite3


class MsdsStoreMixin:
    """Expects ``self.conn``."""

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
