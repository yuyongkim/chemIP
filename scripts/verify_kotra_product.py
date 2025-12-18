import requests
import json

# Exact URL provided by user (Decoded for readability in script, but we will pass as is if we can, 
# but requests handles encoding. The user provided URL has encoded values.)

# Let's try to reconstruct the params exactly.
# search1 = 체코
# search2 = 리튬이온
# search3 = 정지연
# search4 = 20230718

url = "https://apis.data.go.kr/B410001/cmmdtDb/cmmdtDb"
api_key_decoded = "REDACTED_API_KEY"

def test(params, desc):
    print(f"\n--- {desc} ---")
    # Always include key and type
    if 'serviceKey' not in params:
        params['serviceKey'] = api_key_decoded
    params['type'] = 'json'
    
    try:
        # verify=False for gov site
        res = requests.get(url, params=params, verify=False, timeout=10)
        print(f"URL: {res.url}")
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            try:
                print(json.dumps(res.json(), indent=2, ensure_ascii=False)[:500])
            except:
                print(res.text[:500])
        else:
            print(res.text[:500])
    except Exception as e:
        print(f"Error: {e}")

# 1. Exact user case
params_user = {
    "numOfRows": 10,
    "pageNo": 1,
    "search1": "체코",
    "search2": "리튬이온",
    "search3": "정지연",
    "search4": "20230718"
}
test(params_user, "1. Exact User URL Params")

# 2. Minimal Required? (Hypothesis: Maybe Country and Keyword are needed?)
params_minimal = {
    "numOfRows": 10,
    "pageNo": 1,
    "search1": "체코",
    "search2": "리튬이온"
    # Omit search3, search4
}
test(params_minimal, "2. Minimal (No Author/Date)")

# 3. Only Keyword (Global search?)
params_keyword = {
    "numOfRows": 10,
    "pageNo": 1,
    "search2": "리튬이온"
}
test(params_keyword, "3. Only Keyword")

# 4. Keyword + Empty others (What I did before, but let's re-verify)
params_empty_others = {
    "numOfRows": 10,
    "pageNo": 1,
    "search1": "",
    "search2": "리튬이온",
    "search3": "",
    "search4": ""
}
test(params_empty_others, "4. Keyword + Empty Others")
