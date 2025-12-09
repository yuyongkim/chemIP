import sqlite3
import os
import re

class GlobalPatentAdapter:
    def __init__(self, db_path="data/global_patent_index.db"):
        self.db_path = db_path

    def get_connection(self):
        if not os.path.exists(self.db_path):
            return None
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def search_patents_by_chem_id(self, chem_id: str):
        """
        Search global patent index for patents related to a chemical ID.
        Applies 'Smart Search' logic to categorize results by context (Usage vs Mention vs Exclusion).
        """
        conn = self.get_connection()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor()
            # Added jurisdiction to selection
            cursor.execute('''
                SELECT patent_id, title, file_path, matched_term, jurisdiction, section, snippet, created_at
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
                LIMIT 200
            ''', (chem_id,))
            
            rows = cursor.fetchall()
            results = []
            
            for row in rows:
                patent_id = row[0]
                title = row[1]
                file_path = row[2]
                matched_term = row[3]
                jurisdiction = row[4]
                section = row[5]
                snippet = row[6]
                
                # Context Analysis
                category = "mention" # Default
                relevance_score = 1  # Default
                
                if snippet and matched_term:
                    snippet_lower = snippet.lower()
                    term_lower = matched_term.lower()
                    
                    # 1. Exclusion Check (Lowest Priority)
                    # Look for "free of X", "no X", "without X"
                    if re.search(r'\b(free of|no|without|non|substantially free|less than)\b.{0,30}' + re.escape(term_lower), snippet_lower) or \
                       re.search(re.escape(term_lower) + r'[\s-]free', snippet_lower):
                        category = "exclusion"
                        relevance_score = 0
                    
                    # 2. Usage Check (Highest Priority)
                    # Look for context indicating active use
                    elif re.search(r'\b(solvent|solution|dissolved|mixture|comprising|containing|reaction|yield|catalyst|reagent|using|use of)\b', snippet_lower):
                        category = "usage"
                        relevance_score = 2

                results.append({
                    "patent_id": patent_id,
                    "title": title,
                    "file_path": file_path,
                    "matched_term": matched_term,
                    "jurisdiction": jurisdiction,
                    "section": section,
                    "snippet": snippet,
                    "source": f"{jurisdiction} (Global Index)",
                    "category": category,
                    "relevance_score": relevance_score
                })
            
            # Sort by Relevance Score (Desc), then Section Priority
            # We rely on the initial SQL sort for section priority, so we use a stable sort here or include it in key
            # Python's sort is stable.
            results.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            return results
        except Exception as e:
            print(f"Error querying Global Patent index: {e}")
            return []
        finally:
            conn.close()
