from backend.api.kipris_adapter import KiprisAdapter

class PatentFetcher:
    def __init__(self):
        self.adapter = KiprisAdapter()
        self.last_error: str | None = None

    def fetch_patent_data(self, patent_id: str) -> dict:
        """
        Fetch patent details (Not fully implemented in KIPRIS Adapter yet, placeholder)
        """
        # For now, search returns details. This might need a specific ID lookup endpoint later.
        return {}

    def search_patents(self, keyword: str) -> list:
        """
        Search patents by keyword using KIPRIS API
        """
        results = self.adapter.search_patents(keyword)
        self.last_error = getattr(self.adapter, "last_error", None)
        return results
