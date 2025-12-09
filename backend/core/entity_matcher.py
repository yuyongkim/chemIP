import re
from backend.core.terminology_db import TerminologyDB

class EntityMatcher:
    def __init__(self, db_path="data/terminology.db"):
        self.db = TerminologyDB(db_path)

    def extract_candidates(self, text: str) -> list:
        """
        텍스트에서 화학물질 후보 용어 추출 (간단한 정규식 또는 NLP 사용 가능)
        현재는 영어 단어 위주로 간단히 추출
        """
        # Simple regex to find words that look like chemical names (capitalized, etc.)
        # This is a placeholder logic.
        words = re.findall(r'\b[A-Z][a-z]+(?:-[A-Z][a-z]+)*\b', text)
        return list(set(words))

    def match_terms(self, text: str) -> dict:
        """
        텍스트에서 용어를 추출하고 DB와 매칭
        """
        candidates = self.extract_candidates(text)
        matched = []
        unmatched = []

        for term in candidates:
            # Check against DB
            db_term = self.db.get_chemical_term(term)
            if db_term:
                matched.append({
                    "term": term,
                    "db_id": db_term[0],
                    "cas_no": db_term[2]
                })
            else:
                unmatched.append(term)
        
        return {
            "matched": matched,
            "unmatched": unmatched
        }

    def close(self):
        self.db.close()
