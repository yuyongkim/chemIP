from __future__ import annotations

from backend.core.guide_linker import recommend_guides


class FakeGuideStore:
    def __init__(self) -> None:
        self._search_rows = {
            "71-43-2": [
                {
                    "guide_no": "H-132-2023",
                    "title": "벤젠 노출 근로자의 건강관리지침",
                    "ofanc_ymd": "2023-01-01",
                    "file_download_url": "https://example.com/benzene",
                    "score": 120,
                    "match_fields": ["text"],
                    "snippet": "CAS No 71-43-2 벤젠 건강관리",
                }
            ],
            "벤젠": [
                {
                    "guide_no": "H-132-2023",
                    "title": "벤젠 노출 근로자의 건강관리지침",
                    "ofanc_ymd": "2023-01-01",
                    "file_download_url": "https://example.com/benzene",
                    "score": 100,
                    "match_fields": ["title", "text"],
                    "snippet": "벤젠 CAS No 71-43-2",
                },
                {
                    "guide_no": "A-30-2018",
                    "title": "클로로벤젠에 대한 작업환경측정,분석 기술지침",
                    "ofanc_ymd": "2018-01-01",
                    "file_download_url": "https://example.com/chlorobenzene",
                    "score": 100,
                    "match_fields": ["title", "text"],
                    "snippet": "클로로벤젠 CAS No 108-90-7",
                },
            ],
            "Benzene": [
                {
                    "guide_no": "A-30-2018",
                    "title": "클로로벤젠에 대한 작업환경측정,분석 기술지침",
                    "ofanc_ymd": "2018-01-01",
                    "file_download_url": "https://example.com/chlorobenzene",
                    "score": 80,
                    "match_fields": ["text"],
                    "snippet": "chlorobenzene benzene ring",
                }
            ],
        }
        self._details = {
            "H-132-2023": {
                "text": "벤젠 건강관리 지침. CAS No 71-43-2. 작업자 보호 절차.",
            },
            "A-30-2018": {
                "text": "클로로벤젠 작업환경측정 지침. CAS No 108-90-7.",
            },
        }

    def search(self, query: str, limit: int, offset: int):
        rows = self._search_rows.get(query, [])
        return rows[offset : offset + limit], len(rows)

    def get(self, guide_no: str, include_text: bool = True):
        return self._details.get(guide_no, {})


def test_recommend_guides_prefers_exact_cas_matches_over_partial_name_matches() -> None:
    store = FakeGuideStore()

    recommendations = recommend_guides(
        store=store,
        terms=["71-43-2", "벤젠", "Benzene"],
        top_k=8,
    )

    assert [item["guide_no"] for item in recommendations] == ["H-132-2023"]
    assert recommendations[0]["exact_cas_matches"] >= 1
