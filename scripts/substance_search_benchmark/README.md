# substance_search_benchmark — 흔한 물질 검색 정확도 측정

공식 목록에서 고른 물질(약 330종)을 한국어 이름·영어 일반명·영어 IUPAC 명·CAS·출처 별칭으로 검색해, 기대 CAS 가 1위/상위 3위에 오는 비율을 질의 종류별·출처 범주별로 잰다.

출처 범주(`config.CATEGORY_ORDER`, 같은 CAS 는 하나로 합치고 범주를 모은다):

| 범주 | 출처 |
|---|---|
| `petrochem_KPIA` | 한국화학산업협회(KCIA, 옛 한국석유화학협회 KPIA) 제품정보·제품통계 페이지의 제품 표기. 페이지에 CAS 가 없어 `kcia_label_expansion.json` 의 영문명으로 terminology.db(NCIS·KOSHA 이름)에서 CAS 를 찾는다 |
| `accident_prep_97` | NCIS 화학물질 분류 `사고대비물질`(terminology.db `ncis_substance.classifications`, data.go.kr NCIS API 수집분) |
| `osha_kr_special` | 산안법 특별관리물질·허가대상물질 (`backend/data/trade_controls/kr_lists`, law.go.kr) |
| `seed_wiki` | `frontend/lib/chemip-seed.ts` 216종(위키 조회수·국내 법령 등재) |

```
python -B fetch_kcia.py        # KCIA 두 페이지 → data/sources/kcia_products_raw.json
python -B build_list.py        # → data/common_substances.json (+ 못 찾은 항목 common_substances_unresolved.json)
python -B fetch_pubchem.py     # IUPAC 명 → data/pubchem_names.json (이미 받은 CAS 는 건너뜀)
python -B build_cases.py       # → data/benchmark_cases.json
python -B run_benchmark.py --target backend|public|static|inproc --label before
```

| 파일 | 맡는 일 |
|---|---|
| `config.py` | 경로·URL·간격·범주 순서 (값은 여기서만) |
| `seed_parse.py` | chemip-seed.ts 읽기(복사하지 않음) |
| `fetch_kcia.py` | KCIA 제품 표기 받아 두기(원문 그대로) |
| `db_names.py` | terminology.db 읽기 전용 조회: CAS 존재, 이름→CAS, 국·영문명, 사고대비물질 |
| `sources.py` | 범주별 읽기 함수 |
| `build_list.py` | 범주 합치기·CAS 확인 → 물질 목록 |
| `fetch_pubchem.py` | PubChem Title·IUPACName |
| `build_cases.py` | 물질 목록 → 질의 목록 |
| `targets.py` | 검색 대상(운영 API, 공개 사이트, 정적 색인, 프로세스 안 백엔드) |
| `metrics.py` | 순위·비율 계산(순수 함수), IUPAC 출처별 비율 |
| `provenance.py` | IUPAC 순환 방지: 질의(PubChem IUPAC 명)를 검색이 PubChem 동의어로만 아는지(`pubchem_only`) 다른 출처로도 아는지(`independent`) 표시 |
| `report.py` | `reports/<label>_<target>.json·.md` (IUPAC 순환 방지 표 포함) |
| `run_benchmark.py` | 진입점 |
| `data/sources/kcia_label_expansion.json` | KCIA 표기 → 영문 조회명(약어 풀이), 제외 표기와 이유 |
| `_legacy_handpicked_2026-10-28/` | 처음에 손으로 고른 목록과 그 측정(쓰지 않음, 보존용) |
