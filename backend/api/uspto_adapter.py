import sqlite3
import os

class UsptoAdapter:
    def __init__(self, db_path="data/uspto_index.db"):
        self.db_path = db_path

    def get_connection(self):
        if not os.path.exists(self.db_path):
            return None
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def search_patents_by_chem_id(self, chem_id: str):
        """
        Search local USPTO index for patents related to a chemical ID.
        """
        conn = self.get_connection()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT patent_id, title, file_path, matched_term, created_at
                FROM patent_index
                WHERE chem_id = ?
                ORDER BY 
                CASE 
                    WHEN section = 'Title' THEN 1
                    WHEN section = 'Abstract' THEN 2
                    WHEN section = 'Claims' THEN 3
                    WHEN section = 'Description' THEN 4
                    ELSE 5
                END ASC,
                created_at DESC
                LIMIT 50
            ''', (chem_id,))
            
            rows = cursor.fetchall()
            results = []
            for row in rows:
                results.append({
                    "patent_id": row[0],
                    "title": row[1],
                    "file_path": row[2],
                    "matched_term": row[3],
                    "source": "USPTO (Local)"
                })
            return results
        except Exception as e:
            print(f"Error querying USPTO index: {e}")
            return []
        finally:
            conn.close()
