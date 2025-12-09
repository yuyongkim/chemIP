import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.patent_fetcher import PatentFetcher
from backend.services.document_processor import DocumentProcessor
from backend.core.entity_matcher import EntityMatcher
from backend.core.terminology_db import TerminologyDB

def test_pipeline():
    print("=== Pipeline Test Start ===")
    
    # 1. Setup Data
    print("\n[1] Setting up Terminology DB...")
    db = TerminologyDB()
    db.add_chemical_term("Benzene", "71-43-2", "A common solvent.")
    db.add_chemical_term("Toluene", "108-88-3", "Another solvent.")
    print("Added Benzene and Toluene to DB.")

    # 2. Fetch Patent (Mock)
    print("\n[2] Fetching Patent Data...")
    fetcher = PatentFetcher()
    patent_data = fetcher.fetch_patent_data("10-2023-1234567")
    print(f"Fetched Patent: {patent_data['title']}")
    
    # 3. Process Document
    print("\n[3] Processing Document...")
    processor = DocumentProcessor()
    # Using the abstract from the fetched patent as the text source
    raw_text = patent_data['abstract']
    normalized_text = processor.normalize_text(raw_text)
    print(f"Normalized Text: {normalized_text}")

    # 4. Entity Matching
    print("\n[4] Matching Entities...")
    matcher = EntityMatcher()
    match_result = matcher.match_terms(normalized_text)
    
    print(f"Matched Terms: {match_result['matched']}")
    print(f"Unmatched Terms: {match_result['unmatched']}")

    # Cleanup
    matcher.close()
    db.close()
    print("\n=== Pipeline Test End ===")

if __name__ == "__main__":
    test_pipeline()
