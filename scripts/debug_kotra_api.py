import os
import sys
import requests
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Force load .env from root
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
print(f"Loading .env from: {dotenv_path}")
load_dotenv(dotenv_path)

from backend.config.settings import settings

def test_kotra_api(keyword):
    print(f"--- Debugging Env Vars ---")
    keys_found = []
    for k in os.environ.keys():
        keys_found.append(k)
    
    print(f"All Env Keys: {sorted(keys_found)}")
    
    # Check specifically for KOTRA
    kotra_keys = [k for k in keys_found if "KOTRA" in k]
    print(f"KOTRA Keys: {kotra_keys}")

    print(f"--- Testing KOTRA API for keyword: '{keyword}' ---")
    
    # Hardcoded keys found in scripts/verify_kotra_product.py
    hardcoded_decoded = "REDACTED_API_KEY"
    hardcoded_encoded = "REDACTED_API_KEY_ENCODED"

    keys = {
        "Decoded": hardcoded_decoded,
        "Encoded": hardcoded_encoded
    }
    
    # KOTRA often requires HTTP, not HTTPS
    # Endpoint 1: Commodity DB
    url_comm = "http://apis.data.go.kr/B410001/cmmdtDb/cmmdtDb"
    
    # Endpoint 2: Overseas Market News
    url_news = "http://apis.data.go.kr/B410001/kotra_overseasMarketNews/ovseaMrktNews"

    endpoints = [
        ("Commodity DB", url_comm, "search2"),
        ("Market News", url_news, "search2")
    ]

    for ep_name, url, search_param in endpoints:
        print(f"\n[{ep_name}] URL: {url}")
        
        for key_type, key_val in keys.items():
            if not key_val:
                print(f"  Skipping {key_type} Key (Top key not found in env)")
                continue

            print(f"  Testing with {key_type} Key...")
            try:
                # 1. Standard Requests (Auto-encoding)
                # Usually works best with DECODED key
                params = {
                    "serviceKey": key_val,
                    search_param: keyword,
                    "numOfRows": 5, "pageNo": 1, "type": "json"
                }
                if ep_name == "Market News":
                    params["search1"] = "" # Country

                # Try standard request
                res = requests.get(url, params=params, timeout=5)
                if res.status_code == 200 and "response" in res.json():
                    print(f"    SUCCESS ({key_type} / Standard): 200 OK")
                    data = res.json()
                    # print(str(data)[:200])
                    # Count items
                    try:
                        body = data['response']['body']
                        total = body.get('totalCount', 0)
                        items = body.get('items', {}).get('item', [])
                        if not items: items = []
                        print(f"    Total Count: {total}")
                        if total > 0:
                            print("    FOUND DATA!")
                            return # Stop if found
                    except:
                        pass
                else:
                    print(f"    Failed ({key_type} / Standard): {res.status_code}")
                    # print(res.text[:100])
                
                # 2. Manual Encoding (For Encoded Key)
                # If using Encoded key, we must NOT let requests encode it again.
                if key_type == "Encoded":
                     # Construct query string manually
                     qs = f"serviceKey={key_val}&{search_param}={requests.utils.quote(keyword)}&numOfRows=5&pageNo=1&type=json"
                     if ep_name == "Market News":
                         qs += "&search1="
                     
                     full_url = f"{url}?{qs}"
                     res = requests.get(full_url, timeout=5)
                     if res.status_code == 200 and "response" in res.json():
                        print(f"    SUCCESS (Encoded / Manual): 200 OK")
                        data = res.json()
                        body = data['response']['body']
                        total = body.get('totalCount', 0)
                        print(f"    Total Count: {total}")
                        if total > 0:
                            print("    FOUND DATA!")
                            return
                     else:
                        print(f"    Failed (Encoded / Manual): {res.status_code}")

            except Exception as e:
                print(f"    Error: {e}")

if __name__ == "__main__":
    test_kotra_api("benzene")
    test_kotra_api("벤젠")
    test_kotra_api("반도체") # Semiconductor (Control group)
