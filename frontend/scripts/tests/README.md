# frontend/scripts/tests — 정적 자료(오프라인) 모드 시험

화면 원본(`public/chemip/static_*.jsx`, `api_*.jsx`)을 그대로 읽어 시험한다. 운영 빌드·서버 재시작은 하지 않는다.
결과 파일은 `E:\dev-cache\chemip-static-frontend-tests\` 에 둔다(C: 에 두지 않는다).

| 파일 | 맡는 일 |
|---|---|
| `static_vm_loader.cjs` | 순수 모듈을 vendored Babel(빌드와 같은 설정)로 번역해 Node vm 에 올림. 가짜 `window`·디스크에서 읽는 가짜 `fetch` |
| `pilot_contract_shim.cjs` | 시범 산출물(pilot out/)을 CONTRACT v1 경로(`search/`, `p/`, `g/`)로 보여 주는 시험용 변환 |
| `static_search_reference.py` | 파이썬 검색(시범 또는 `scripts/static_export` 의 static_search.py)의 기준 답 생성 |
| `test_util.cjs` | 키 순서 무관 비교(`firstDiff`), 운영 API 를 초당 2회 이하로 부르는 클라이언트 |
| `test_static_search.cjs` | (a) JS 검색 vs 파이썬 기준 — 30개 질의, 4가지 경로 + `/api` 모양. `--live` 면 운영 API 와도 비교. `--layout contract` 면 내보내기 결과(`E:\dev-cache\chemip-static\out`)와 `scripts/static_export/static_search.py`, `--queries` 로 질의 파일 |
| `test_static_trade.cjs` | (b) JS 수출입 조립·국가별·통합허가·물질 상세 vs 운영 API(127.0.0.1:7011). `--layout contract` 면 내보내기 결과로 |
| `test_static_extras.cjs` | 아래 패널·가이드 정적 파일(`p/<chem_id>.x.json`, `g/guides_status.json`) 읽기, 집 PC 전용 관문(`api_origin.jsx`): 정적 배포에서 확인 요청 1회 뒤 요청 0, PC 사이트는 그대로, 텍사스 배출사고 `tx/<CAS>.json`(파일 없음 → "없음" 빈 응답, `/api` 요청 0). `--live` 면 사고 사례·EPA 집행·취급 사업장(지역 PRTR 부분)을 운영 API 와 비교 |
| `static_serve.cjs` | 정적 파일 서버(`--cors`, `--pilot-shim`, gzip 이면 Content-Encoding) |
| `browser_static_check.cjs` | Playwright: 원본 index.html + `CHEMIP_STATIC` 주입 + `/api/**` 전부 차단 → 검색·물질·규제 탭·실시간 전용 탭 안내 확인, 화면 캡처 |
| `test_calculators.cjs` | 공학 계산기(`calc_*.jsx` 순수 모듈): 계산기마다 손계산·공개 표값 기준(NIOSH 환산, IAPWS-IF97, ACGIH 403 식, Hagen–Poiseuille, 이분법 Colebrook), 입력 검사, 딥링크·MSDS 분자량 읽기, 숫자 표기. 등록된 계산기가 모두 시험됐는지도 본다 |
| `test_fluid_vle.cjs` | 실유체 물성(`fluid_props`, vendored CoolProp 8.0.0 wasm 을 Node 에서 불러 씀)·2성분 VLE(`vle_binary`): CoolProp 문서 값, IAPWS-95/2008/2011 시험값, R134a·CO₂ 상태식 논문 값, Çengel 예제 11-1 냉동 사이클, SVNA 예제 10.1·10.3, UNIFAC(thermo 문서·SVNA 부록 H), 에탄올–물 공비점, ko·en 수치 같음 |
| `test_fire_explosion.cjs` | 화재·폭발 계산기(`calc_pool_fire`·`calc_bleve`·`calc_vce`·`calc_probit_harm`, 공용 `calc_fire_*`·`calc_blast_curves`): EPA RMP OCA 예제 16·29·참조표 30 [src], ALOHA BST 맞춤식·Pierorazio 화염 속도 표 [src], Finney probit 표 [src], R4 손계산 [calc], ko·en 수치 같음, 이어서 계산 링크 |
| `test_steam.cjs` | 증기표 IAPWS-IF97(`calc_if97*.jsx`): 공식 검증표(1·2·3·5영역 표 5·15·33·42, B23) 9자리, 역방향 식 검증값((p,h)·(p,s), 3영역 SR3 포함)과 25 mK 안, 교과서 증기표 값, 포화표·CSV, 습공기 코일·혼합(Çengel 14장 예제)·습공기 선도 |
| `test_unified_search.cjs` | 통합 검색(`usearch_*.jsx` 순수 모듈): 맞춤 점수·순위·강조·묶음 모양·묶음 순서, 실제 자료(계산기·용어집·MSDS 항목·화면)로 예시 검색어(LMTD·레이놀즈·ppm·flash point·벤젠·71-43-2), ko·en 두 벌, 기술지침 정적 목록 없을 때 집 PC 검색, `?view=search&q=` 주소. 물질 검색·지침 요청은 가짜 함수 |
| `test_ghs_label.cjs` | 경고표지·그림문자(`ghs_*.jsx` 순수 모듈): 2항 읽기·문구표·번역·예방조치문구 줄이기·표지 내용·딥링크·통합 검색 묶음, 그림 파일·문구표 모양, 실제 KOSHA 2항(있으면) |
| `browser_ghs_label_check.cjs` | Playwright(집 PC 꺼짐 모양, 정적 빌드): MSDS 탭 그림문자 그림·머리 링크, 벤젠 표지 채움 ko·en × 1440·390, 인쇄 흉내(앱 숨김·표지 mm 크기), PDF 쪽 크기(A4·A5 가로·100×70 mm) |
| `test_portal_facts.cjs` | 물성 답·식별자·UN 묶음·"주요 물성" 줄(`facts_*.jsx`, `api_static_facts.jsx`, `api_facts.jsx`): 검색어 읽기(한·영·조사·붙여 쓰기), 번호 모양, 값 표기(en 에서 한글 원문 → 숫자), 내보내기 결과(`E:\dev-cache\chemip-static\out` 의 search·f·g)로 벤젠 인화점·toluene boiling point·폭발 범위·UN1114·KE-02150·EC·InChIKey, 정적 꺼짐 → 요청 0 |
| `test_glossary.cjs` | 용어사전(`glossary_*.jsx`): 분류별 KO·EN key·한글 든 칸, key 겹침(분류 자료·계산기 용어·약어), 관련 용어·계산기·화면·시험·출처·법령 주소 값, 전체 300개 이상, 첫 글자 색인·거르기·찾기, `?view=glossary&term=` 주소 |
| `test_law_viewer.cjs` | 국내 법령 보기·물질 「국내 근거 조문」(`law_core.jsx`·`api_law.jsx`): 주소·조 표기·앵커·법제처 주소, 이름 찾기·말뭉치 찾기, 행정규칙 본문 줄 나누기·조문 줄·찾기·표시·차례, CAS 조각 번호(파이썬과 같은 FNV-1a), 패널 모양, 영어 문구. 내보낸 `law/` 가 있으면 황산·폼알데하이드 실제 근거 조문 |
| `test_guide_text.cjs` | KOSHA 기술지침 본문 검색(`guide_text_core.jsx`·`api_guide_text.jsx`): 순수 함수, 파이썬 `guide_text_build.py` 와 정규화·조각 번호 같음, 내보낸 `gs/` 가 있으면 실제 검색(구리·HAZOP·없는 말) |
| `test_tp.cjs` · `test_calc_joback.cjs` | 온도별 물성(`tp_*.jsx`·`api_tp.jsx`): 상관식마다 chemicals(MIT) 구현과 대조(`fixtures/tp_crosscheck.json`), IAPWS 물 값, 라이선스 허용 목록, `tpPsatFn` / Joback: 위키백과 아세톤·Poling 6판 o-크레졸 예, SMILES 552개 원자단 = thermo+RDKit(`fixtures/joback_crosscheck.json`) |
| `test_lang.cjs` | 화면 언어: (a) `X_KO`/`X_EN` 쌍마다 한글이 든 KO 경로가 EN 에 모두 있는지(함수는 함수로), (b) 문구 파일 밖 `.jsx` 의 문자열·JSX 글자 속 한글(주석·`tr()` 첫 인자 제외) 파일별 개수. 예외는 `lang_allowlist.json`(이유 필수). `--only 접두어,…` `--strict` `--verbose` |
| `compile_check.cjs` | 모든 jsx 를 빌드와 같은 Babel 설정으로 번역(`dist/` 를 쓰지 않음), `index.html` 목록 누락·중복, 파일 사이 최상위 이름 겹침 |
| `refactor_snapshot.cjs` | Playwright: 화면별(1440·390 × 밝게·어둡게) 캡처·보이는 글자·콘솔 오류 기록. `/api` 는 운영 백엔드로 넘기되 초당 3회 이하, 응답은 `E:\dev-cache\chemip-refactor\api-cache` 에 남겨 두 번째 실행은 같은 응답으로 |
| `verify_portal_local.cjs` | **포털 서비스 로컬 검증(배포 전)** 진입점: 임시 빌드(`build_chemip.cjs --out`, 운영 `dist/` 안 건드림) → PC-off 모드(운영과 같은 경로) + PC-on 모드(127.0.0.1:7000) 브라우저 확인 → 정적 영역 배포 준비 → (선택) 기존 시험 묶음 → 서비스별 PASS/FAIL/PARTIAL/NOT YET 표·JSON 보고서 |
| `verify_portal_spec.cjs` | 위 검증의 확인 목록(자료만): 서비스별 감지 파일·주소·기대 선택자/글자(ko·en)·정적 영역·Worker/Pages 경로·허용 4xx/5xx·한글 검사 제외 영역. 서비스 추가 = 항목 하나 |
| `verify_portal_server.cjs` | PC-off 모드 서버: `/chemip`(임시 빌드 + `CHEMIP_STATIC` 주입)·`site_rules.mjs` COPIES·`/data/v1/<영역>`(Worker AREAS 와 Pages `_routes.json` 에 있을 때만, gzip 이면 Content-Encoding)·`/api/*` 503. 404 에 `x-verify: unrouted / missing-area / missing-file` |
| `verify_portal_browser.cjs` | 위 검증의 Playwright 부분: 기대 선택자·글자, 페이지 오류, 예상 밖 4xx/5xx, 가로 스크롤, EN 화면 한글(원문 자료 영역 제외), `?view=` 등록 |
| `verify_portal_deploy.cjs` | 배포 준비: 영역 폴더·파일 수·표본·gzip, Worker `STATIC_DATA.AREAS`(하위 폴더 포함)·`FUNCTION_ROUTES`, 서비스 파일의 `index.html` 스크립트·스타일 줄 |
| `verify_portal_suites.cjs` · `verify_portal_report.cjs` | 기존 시험 묶음 실행(`--suites fast|all`, all 은 test_static_trade 포함) / 상태 규칙·표·JSON 보고서 |
| `refactor_diff.cjs` | 두 스냅숏 비교: 화면별 글자 줄 차이·캡처 픽셀 차이 비율·콘솔 오류 |

```
node frontend/scripts/tests/test_static_search.cjs
node frontend/scripts/tests/test_static_trade.cjs            # 약 7분(운영 API 720회, 초당 2회)
node frontend/scripts/tests/test_calculators.cjs             # 화면·서버 없이, 1초
node frontend/scripts/tests/test_fire_explosion.cjs          # 화재·폭발 계산기 기준값, 화면 없이
node frontend/scripts/tests/test_steam.cjs                   # 증기표·습공기 선도, 화면 없이
node frontend/scripts/tests/test_unified_search.cjs          # 화면·서버 없이, 1초
node frontend/scripts/tests/test_glossary.cjs                # 화면·서버 없이, 1초
node frontend/scripts/tests/test_guide_text.cjs              # 내보낸 gs/ 를 디스크에서 읽음, 파이썬 1회
node frontend/scripts/tests/test_portal_facts.cjs            # 화면·서버 없이(내보내기 결과 읽음), 수 초
node frontend/scripts/tests/test_static_extras.cjs           # --live: 운영 API 36회(초당 2회)
set NODE_PATH=G:\MSDS\frontend\node_modules
node frontend/scripts/tests/browser_static_check.cjs
node frontend/scripts/tests/verify_portal_local.cjs                    # PC-off + PC-on, 약 10분. 보고서 E:\dev-cache\chemip-portal-verify
node frontend/scripts/tests/verify_portal_local.cjs --suites fast      # + 기존 시험 묶음(--suites all 이면 test_static_trade 까지)
node frontend/scripts/tests/verify_portal_local.cjs --only reg,prtr --modes off --skip-build
```
