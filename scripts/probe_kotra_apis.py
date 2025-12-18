import requests
import urllib.parse
import json
import warnings

# Suppress SSL warnings
warnings.filterwarnings("ignore")

# Key provided by user (Decoding)
API_KEY = "REDACTED_API_KEY"
API_KEY_ENCODED = "REDACTED_API_KEY_ENCODED"

# Test Data
CHEMICAL_NAME_KOR = "벤젠"
CHEMICAL_NAME_ENG = "Benzene"

def test_url(name, url, params, use_encoded_key=False):
    print(f"\n--- Testing {name} ---")
    print(f"URL: {url}")
    
    headers = {"User-Agent": "Mozilla/5.0"}
    
    if use_encoded_key:
        # Manually construct query string to pass encoded key as-is
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        full_url = f"{url}?serviceKey={API_KEY_ENCODED}&{query_string}&type=json"
        print(f"Full URL (Encoded Key): {full_url}")
        try:
            response = requests.get(full_url, headers=headers, timeout=10, verify=False)
        except Exception as e:
            print(f"Req Error: {e}")
            return
    else:
        params['serviceKey'] = API_KEY
        params['type'] = 'json'
        # params['numOfRows'] = 1 # user snippet says 10
        if 'numOfRows' not in params: params['numOfRows'] = 10 
        if 'pageNo' not in params: params['pageNo'] = 1
        
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10, verify=False)
        except Exception as e:
            print(f"Req Error: {e}")
            return

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        try:
            data = response.json()
            print("Response JSON:")
            print(json.dumps(data, indent=2, ensure_ascii=False)[:300])
        except:
            print("Response Text:")
            print(response.text[:300])
    else:
        print(f"Error Body: {response.text[:200]}")

# 0. Market News - HTTPS
base_news = "https://apis.data.go.kr/B410001/kotra_overseasMarketNews/ovseaMrktNews"
test_url("Market News (HTTPS)", base_news, {"search1": "화학"})

# 1. Product DB - HTTPS
base_product = "https://apis.data.go.kr/B410001/cmmdtDb/cmmdtDb"

# Helper to merge defaults
def get_params(overrides):
    defaults = {
        "search1": "", # Country
        "search2": "", # Title
        "search3": "", # Author
        "search4": ""  # Date
    }
    defaults.update(overrides)
    return defaults

# Test 1: Full sample from docs (Country=체코) - Encoded Key
# Use correct variable name for method
def test_url_encoded(name, url, params):
    test_url(name, url, params, use_encoded_key=True)

test_url_encoded("Product DB (Sample: Czech) [Encoded Key]", base_product, get_params({"search1": "체코"}))
test_url_encoded("Product DB (Title=Benzene) [Encoded Key]", base_product, get_params({"search2": "Benzene"}))
test_url_encoded("Product DB (Title=벤젠) [Encoded Key]", base_product, get_params({"search2": "벤젠"}))
