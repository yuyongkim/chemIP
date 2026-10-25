# kr_product — 제품·운송 관련 국내 물질 목록 수집기

Run (cwd anywhere): `python -I G:\MSDS\scripts\trade_controls\kr_product\build_all.py [parser ...]`

Outputs (backend/data/trade_controls/): `kr_lists/<LIST_ID>.json` (one per list), `kr_permits_product.json`,
`kr_lists/KR_PRODUCT_unverified.json` (unmatched / ambiguous / rejected names, count problems, bad CAS),
`kr_lists/_index_product.json` (summary + benzene/toluene/formaldehyde/acetone/ammonia memberships).
Raw downloads (untrusted): `S:\chemip_trade_controls_raw\kr_product\` (law.go.kr XML, HWP attachments, PubChem JSON).
Retrieved 2026-10-24. law.go.kr DRF with the public `OC=test` value (same as sibling collectors).

## Lists

| list_id | 법령 / 근거 | parser |
|---|---|---|
| KR_CPBSA_PROHIBITED | 생활화학제품 및 살생물제의 안전관리에 관한 법률 제9조·제10조; 안전확인대상생활화학제품 지정 및 안전·표시기준 별표 2 함유금지물질 | p_cpbsa_safety |
| KR_CPBSA_CONTENT_LIMITS | 같은 고시 별표 2 함유물질·사용물질 함량기준, 방출량 기준, 사용가능 주성분 | p_cpbsa_safety |
| KR_CPBSA_PRESERVATIVES | 같은 고시 별표 2 '사용가능 보존용 물질' 본문 열거 | p_cpbsa_safety |
| KR_CPBSA_BIOCIDE_EXISTING_DEFERRED | 법 제18조; 승인유예대상 기존살생물물질의 지정 별표 | p_cpbsa_biocide |
| KR_CPBSA_BIOCIDE_LOW_RISK | 법 제12조제1항 단서; 위해성이 낮은 살생물물질 별표 | p_cpbsa_biocide |
| KR_COSMETIC_PROHIBITED / _RESTRICTED | 화장품법 제8조; 화장품 안전기준 등에 관한 규정 별표 1·2 | p_cosmetic |
| KR_PESTICIDE_REGISTRATION_RESTRICTED / _ADI / _PIC_ANNEX3 / _SPECIAL_MANAGED | 농약관리법; 농약 및 원제의 등록기준 별표 8의2·4의2, 농약의 수출입 승인기준 별표 1, 농약등 및 원제의 취급제한기준 제9조 | p_pesticide |
| KR_ELV_EEE_HAZARDOUS_SUBSTANCES | 전기·전자제품 및 자동차의 자원순환에 관한 법률 제9조; 시행령 별표 1의2 | p_eee_elv |
| KR_CHILD_COMMON_SAFETY_CHEMICALS | 어린이제품 안전 특별법 제25조; 어린이제품 공통안전기준 3.1 (고시 HWP 첨부) | p_child |
| KR_POPS_SUBSTANCES | 잔류성오염물질 관리법 제2조·제13조; 잔류성오염물질의 종류 및 특정면제에 관한 규정 별표 1 | p_pops |
| KR_TRANSPORT_SHIP_DGL | 선박안전법 제41조; 위험물 선박운송 및 저장규칙; 위험물 선박운송 기준 별표 1 (HWP 첨부, UN번호·등급·용기등급) | p_transport |
| KR_TRANSPORT_MARINE_NLS | 해양환경관리법; 선박에서의 오염방지에 관한 규칙 별표 1 제2호 유해액체물질 (X/Y/Z) | p_transport |

Not built (reason recorded): 항공위험물운송기술기준 별표 1 (ICAO TI 영문 PDF, 신뢰성 있게 파싱 불가·ICAO 저작권),
ADR Table A (국내 미채택), 승인 살생물물질 목록 (고시 아님, 화학제품관리시스템에만 게시), 식품첨가물·약사법·원자력안전법
(CAS 목록 없음/저우선). 화학물질 배출저감계획서 대상은 kr_env(KR_CHEM_EMISSION_REDUCTION_PLAN)가 수집.
KOSHA MSDS 15항 '기타 국내 규제'에 나오는 국내법은 잔류성오염물질 관리법뿐(캐시 35,408건 집계) → KR_POPS_SUBSTANCES.

## Modules

| file | role |
|---|---|
| build_all.py | entry point: run parsers, write lists, permits, unverified, index |
| config.py | paths, retrieved date, parser list, probe CAS |
| lawsrc.py | law.go.kr client (reuses kr_env.lawgo, cache redirected to RAW_ROOT) |
| attachments.py | law.go.kr attachment download (flSeq) + HWP text (kr_env.hwp_text) |
| quotes.py | article text quoting, permit item builder |
| names.py | spelling aliases, Korean→English lookup names, reviewed match rejects, 'X 및 그 염류' base |
| annex_tables.py | 별표 2 walker: 부/장/<표> captions, multi-level headers by display column |
| box_groups.py | sub-row-aware box-table reader (cosmetics, pesticides) |
| pubchem.py | PubChem fallback (unique CID only; cached) |
| report.py | permits / unverified / index files; unmatched folded into family_entries |
| p_*.py | one parser per source (table above); transport_*.py are p_transport helpers |
| data/*.json | element_aliases, ko_en_names (lookup keys only), match_rejects (reviewed wrong DB hits), cpbsa_classes |

## Rules
* CAS printed in the law → `law_cas` (check digit validated; failures go to unverified, never used).
* Name-only items → exact normalised-name match in data/terminology.db (read-only); Korean and English hits must
  agree; `pubchem` only for a unique CID. No fuzzy match. Unmatched → `unmatched` + `family_entries` (unmatched=true).
* Counts: every list compares parsed items with a count taken directly from the official table (`stats.count_check`).
* `detail` = what the law says (shown to users). Collector provenance (e.g. "고시 기재 CAS …는 검증숫자 오류, 이름으로 매칭",
  "terminology.db 정확명 불일치") goes to a separate `match_note` key (absent when empty), never into `detail`.
* KR_CPBSA_BIOCIDE_EXISTING_DEFERRED: the 고시 prints English names only; `name_ko` is filled from terminology.db
  (`db_name_ko` of the law CAS) when the DB has one, marked `name_ko_source: "terminology.db"`.
