# search_synonyms — 물질 검색 동의어 파일 만들기

`backend/data/search/synonyms.jsonl` 을 만든다. 무엇을 어디서 읽을지(표·열·법령 목록·보충 목록), 등급과 출처는 전부 `backend/data/search/` 의 자료 파일에 있고, 여기 코드는 그 규칙대로 읽고 합치기만 한다. terminology.db 는 읽기 전용으로 연다.

```
python -B scripts/search_synonyms/fetch_pubchem_synonyms.py   # 선택: PubChem 이름(벤치마크 + SEO tier1 만, E:\dev-cache\pubchem 캐시)
python -B scripts/search_synonyms/build_synonyms.py           # → backend/data/search/synonyms.jsonl
```

다시 만든 뒤에는 백엔드 재시작과 정적 검색 색인 재생성(`scripts/static_export/run_all.py --steps search`)이 필요하다.

| 파일 | 맡는 일 |
|---|---|
| `build_synonyms.py` | 진입점: 자료 읽기 → 점검 → 합치기 → 쓰기 |
| `spec.py` | 경로와 자료 파일 읽기(값은 여기서만) |
| `names.py` | 칸 하나 → 이름들(구분자·앞뒤 문자·접미어·CAS 꼴 제거, ECHA 괄호 IUPAC 명 꺼내기). 순수 함수 |
| `source_db.py` | terminology.db 표·열(`db_sources`)에서 (CAS, 이름, 출처코드) |
| `source_law.py` | law.go.kr 목록(`backend/data/trade_controls/kr_lists`)의 법령 물질명. CAS 가 법령에 적힌 항목만, 목록마다 출처코드 `law:<list_id>`; 같은 목록이 한 이름에 CAS 를 여럿 적으면 물질군 이름으로 보고 `#group`(한 등급 낮춤) |
| `source_curated.py` | 손으로 보탠 목록(KCIA 표기, 원소 이름, PubChem 이름) 읽기 |
| `checks.py` | 보충 목록 점검: CAS 가 chemical_terms 에 있는지, 출처코드가 있는지, `expect_en` 이 그 CAS 의 영문명에 있는지(잘못 적은 CAS 를 잡는다), 차단 목록의 출처코드 |
| `merge.py` | 이름 합치기: 이름마다 가장 센 등급 하나, 같은 등급이면 PubChem 아닌 출처를 남김; 차단 목록 적용 |
| `fetch_pubchem_synonyms.py` | PubChem IUPAC 명 + 앞쪽 동의어 → `backend/data/search/pubchem_synonyms.json` (항목마다 `PubChem CID n`) |
| `pubchem_config.py` | PubChem 범위(벤치마크 목록 + SEO tier1, 상한 800)·URL·간격·버릴 코드 패턴 |
| `_legacy_single_file_2026-10-28/` | 한 파일짜리 이전 빌더와 그 자료·생성물(쓰지 않음, 되돌리기용) |
