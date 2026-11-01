"""Korean first-level regions (시도) for the PRTR facility map, and address → (region, 시군구) parsing.

One place for the region list: the static export (scripts/static_export/prtr.py) and the PC route
(backend/api/routes/prtr_map.py) both write it into ``prtr/index.json`` ``regions``; the browser reads names from there.
Keys are ISO 3166-2:KR codes, the same ``shapeISO`` the boundary file carries (frontend/public/chemip/prtr_map_geo.jsx).
Aliases cover the short forms and the pre-2023/2024 names found in PRTR addresses (강원도 → 강원특별자치도,
전라북도 → 전북특별자치도). Pure functions only; no I/O.
"""
from __future__ import annotations

# (ISO code, current Korean name, English name, other spellings seen in addresses)
SIDO = (
    ("KR-11", "서울특별시", "Seoul", ("서울", "서울시")),
    ("KR-26", "부산광역시", "Busan", ("부산", "부산시")),
    ("KR-27", "대구광역시", "Daegu", ("대구", "대구시")),
    ("KR-28", "인천광역시", "Incheon", ("인천", "인천시")),
    ("KR-29", "광주광역시", "Gwangju", ("광주",)),
    ("KR-30", "대전광역시", "Daejeon", ("대전", "대전시")),
    ("KR-31", "울산광역시", "Ulsan", ("울산", "울산시")),
    ("KR-50", "세종특별자치시", "Sejong", ("세종", "세종시")),
    ("KR-41", "경기도", "Gyeonggi", ("경기",)),
    ("KR-42", "강원특별자치도", "Gangwon", ("강원도", "강원")),
    ("KR-43", "충청북도", "North Chungcheong", ("충북",)),
    ("KR-44", "충청남도", "South Chungcheong", ("충남",)),
    ("KR-45", "전북특별자치도", "Jeonbuk", ("전라북도", "전북")),
    ("KR-46", "전라남도", "South Jeolla", ("전남",)),
    ("KR-47", "경상북도", "North Gyeongsang", ("경북",)),
    ("KR-48", "경상남도", "South Gyeongsang", ("경남",)),
    ("KR-49", "제주특별자치도", "Jeju", ("제주도", "제주")),
)

_BY_NAME = {name: iso for iso, ko, _en, aliases in SIDO for name in (ko, *aliases)}
_SIGUNGU_ENDINGS = ("시", "군", "구")


def region_table() -> list[dict]:
    """The list the browser reads: [{iso, ko, en}] in the order above."""
    return [{"iso": iso, "ko": ko, "en": en} for iso, ko, en, _aliases in SIDO]


def sido_iso(token: str) -> str:
    """'경기도' / '경기' / '강원도' → ISO code, '' when the token is not a region name."""
    return _BY_NAME.get((token or "").strip(), "")


def parse_address(address: str) -> tuple[str, str]:
    """Road address → (ISO code, 시군구). 시군구 is the city/county level ('수원시 장안구' → '수원시');
    '' for Sejong (no 시군구) or when the second word is not a 시·군·구. ('', '') when no region is recognised."""
    words = (address or "").split()
    if not words:
        return "", ""
    iso = sido_iso(words[0])
    if not iso:
        return "", ""
    second = words[1] if len(words) > 1 else ""
    if iso == "KR-50" or not second.endswith(_SIGUNGU_ENDINGS) or len(second) < 2:
        return iso, ""
    return iso, second
