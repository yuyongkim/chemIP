# country_lists — EPC 로컬 수집본에서 국가별 물질 규제 목록 추출

진입점은 `scripts/load_country_lists_from_epc.py`(조립·적재만). 파서는 아래 모듈이 맡는다.
새 목록은 해당 국가 모듈에 파서 한 개와 `PARSERS`/`OWNED` 등록만 추가하고,
`backend/core/intl_regulatory_store.py` 의 `REGULATION_LABELS` 에 한 줄을 더한다.

| 파일 | 책임 | regulation 코드 |
|---|---|---|
| `base.py` | Row, CAS 체크섬, 읽기 전용 연결, EPC 경로(eCFR·관할·KOSHA) | - |
| `us.py` | OSHA PSM 부록 A, OSHA 1910.1000 Z-1 PEL, TSCA SNUR(40 CFR 721) | US_OSHA_PSM, US_OSHA_PEL, US_TSCA_SNUR |
| `eu.py` | Seveso III 부록 I 2부 | EU_SEVESO_III |
| `vn.py` | 법령 24/2026 부록 I~IV | VN_DECREE24_APP_I~IV |
| `mx.py` | NOM-028-STPS 부록 A | MX_NOM028_THRESHOLD |
| `pk.py` | Sindh 유해물질 규칙 2014 | PK_SINDH_HAZSUB |
| `in_.py` | 화학사고 규칙 1996 | IN_CHEM_ACCIDENT_RULES |
| `nl.py` | Bal 부록 III 물질등급(ZZS)·VIa 대기 농도 한계·IIa 토양 개입값·V PRTR | NL_BAL_STOFKLASSE, NL_BAL_ZZS_IMMISSION, NL_BAL_SOIL_INTERVENTION, NL_BAL_PRTR |
| `kr.py` | 산업안전보건법 시행령 별표 13 유해·위험물질 규정량(PSM). 원천은 EPC `datasets/kosha_rag` | KR_OSHA_PSM |

원천 DB 는 읽기 전용이며 네트워크 접근은 없다. 옛 단일 파일은 `scripts/_legacy_load_country_lists_from_epc.py`.
