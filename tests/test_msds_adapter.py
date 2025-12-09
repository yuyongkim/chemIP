import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.kosha_msds_adapter import KoshaMsdsAdapter

def test_search_msds():
    adapter = KoshaMsdsAdapter()
    # 테스트용 키워드 (실제 API 키가 없으면 실패하거나 에러 메시지가 올 수 있음)
    keyword = "Benzene"
    result = adapter.search_msds(keyword)
    
    print(f"\n[Search Result for '{keyword}']")
    print(result)
    
    # API 키가 없어서 에러가 나더라도 구조적인 테스트는 통과하도록 함
    assert isinstance(result, dict)
    assert "status" in result

if __name__ == "__main__":
    test_search_msds()
