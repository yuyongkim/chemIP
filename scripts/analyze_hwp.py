import re

def extract_strings_from_hwp(file_path, min_length=4):
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Try to decode as UTF-16LE (common for HWP text) and UTF-8
    encodings = ['utf-16-le', 'utf-8', 'euc-kr']
    found_strings = set()
    
    for enc in encodings:
        try:
            text = content.decode(enc, errors='ignore')
            # Find sequences of printable characters
            matches = re.findall(r'[a-zA-Z0-9가-힣\s_\-/:.]{' + str(min_length) + ',}', text)
            for m in matches:
                clean_m = m.strip()
                if len(clean_m) >= min_length:
                    found_strings.add(clean_m)
        except Exception:
            pass
            
    return sorted(list(found_strings))

file_path = r"C:\Users\USER\Desktop\MSDS\OPENAPI_서비스명세서(물질안전보건자료MSDS)_20240603.hwp"
strings = extract_strings_from_hwp(file_path)

print(f"Found {len(strings)} strings. Checking for specific parameter candidates:")
candidates = ['searchWrd', 'searchKeyword', 'chemName', 'chemId', 'casNo', 'pageNo', 'numOfRows', 'serviceKey']

for cand in candidates:
    if cand in strings:
        print(f"[MATCH] Found candidate: {cand}")
    else:
        print(f"[MISS] Not found: {cand}")

print("\nTop 50 strings containing 'search' or 'chem':")
relevant = [s for s in strings if 'search' in s.lower() or 'chem' in s.lower()]
for s in relevant[:50]:
    print(s)

