# ChemIP 링크 규약 v7 — 형제 사이트(Environment · EPC engineering · Chem_Eng) ↔ ChemIP

다른 사이트가 ChemIP 로 들어오는 주소 형식과, ChemIP 가 형제 사이트로 내보내는 주소를 한 장에 정한다.
v1 → v2 (2026-10-30): 계산기 링크 행을 "준비 중"에서 실제 형식(key 13개)으로 바꿨다.
v2 → v3 (2026-10-30): 계산기 key 를 13개 → 29개로 늘렸다(새 16개는 `docs/calculators/CALC_BENCHMARK_v2.md`). 주소 형식은 그대로다.
v3 → v4 (2026-10-30): 화면 언어 `&lang=en|ko` 를 더했다(모든 들어오는 링크에 붙일 수 있다). v1~v3 은 그대로 둔다.
v4 → v5 (2026-10-30): 통합 검색 `?view=search&q=` 를 더했다. 다른 행은 v4 그대로다. v1~v4 는 그대로 둔다.
v5 → v6 (2026-10-31): 용어사전 `?view=glossary&term=<key>&cat=<분류>` 를 더했다. 다른 행은 v5 그대로다. v1~v5 는 그대로 둔다.
v6 → v7 (2026-10-31): 물질 화면 `anchor` 키 `oel`(노출기준 비교 패널)을 더했다. 다른 행은 v6 그대로다. v1~v6 은 그대로 둔다.
형식을 다시 바꾸면 이 파일을 고치지 않고 `LINK_CONTRACT_v8.md` 를 새로 만든다.

## 1. 들어오는 링크 (형제 사이트 → ChemIP)

기본 주소: `https://chemip.yule.pics/chemip`. 값은 모두 URL 인코딩한다(`encodeURIComponent`).

| 용도 | 형식 | 확인 결과 |
|---|---|---|
| 물질 (CAS) — **권장** | `https://chemip.yule.pics/chemip?view=product&pv=chemical&chem=<CAS>` | 공개 주소 200. `chem=71-43-2` → KOSHA 물질 `001008` 벤젠(MSDS 16/16). `chem=7732-18-5` → KOSHA `015826` 물(MSDS 있음). 같은 CAS 의 KOSHA 물질(MSDS 있음 우선)로 열린다(`api_chemicals.jsx` `resolveLinkChemId`). KOSHA 물질이 없으면 CAS 기록 그대로 연다 |
| 물질 (KOSHA 번호) | `...?view=product&pv=chemical&chem=<6자리 KOSHA id>` | `chem=001067` → 아세톤. ChemIP 안에서 받은 번호가 있을 때만 쓴다 |
| 없는 물질 | 같은 형식 | `chem=99999-99-9` → "찾지 못했습니다" 안내와 검색 버튼(직전 물질을 보여 주지 않는다) |
| 아래 패널로 바로 | 위 주소 + `&anchor=<키>` | 아래 표 |
| 검색 | `https://chemip.yule.pics/chemip?view=product&pv=search&q=<이름 또는 CAS>` | `q=벤젠` → 결과에 71-43-2 표시. 줄임형 `?q=<검색어>` 도 같다 |
| 통합 검색 | `https://chemip.yule.pics/chemip?view=search&q=<검색어>` | 한 검색창으로 화학물질(위 "검색"과 같은 결과)·공학 계산기·용어 설명·MSDS 항목·KOSHA 안전보건 기술지침·화면 바로가기를 묶음별로 보인다(묶음마다 위쪽 몇 건 + "더 보기"). `q` 가 없으면 빈 검색창. 예: `q=LMTD` → 계산기 `lmtd` 가 맨 위, `q=71-43-2` → 벤젠, `q=flash%20point` → MSDS 9항. 화면은 `frontend/public/chemip/usearch_view.jsx`, 주소 규칙은 `usearch_link.jsx`. 물질만 찾는 표는 위 "검색" 주소를 쓴다(그대로 동작) |
| 용어사전 | `https://chemip.yule.pics/chemip?view=glossary&term=<key>` (분류만: `?view=glossary&cat=<분류>`) | 화학안전·산업위생·위험물·화학공학 용어 613개(한·영, 법정 용어는 근거 조문). `term` 이 있으면 그 용어를 펼치고 화면 가운데로 옮긴다. key 는 소문자·숫자·`_` (예: `flash_point`, `hazop`, `designated_quantity`, `stel`, 약어는 `ghs`·`k_reach`). 모르는 key 는 "찾지 못했습니다" 안내와 전체 목록. `cat`: `psm` `fire` `ih` `tox` `reg` `hazmat` `unitop` `thermo` `fluid` `control` `abbr`. 목록 정본은 `frontend/public/chemip/glossary_registry.jsx`·`glossary_<분류>.jsx`, 주소 규칙은 `glossary_link.jsx`. 예: `?view=glossary&term=lfl&lang=en` |
| 계산기 | `https://chemip.yule.pics/chemip?view=calc&calc=<key>&<입력 key>=<값>&name=<물질 이름>` | key 29개 — 안전·산업위생: `ppm_mgm3` `mix_exposure` `twa8h` `mix_lfl` `stoich_air` `ventilation` · 누출·확산·방출: `evaporation` `gaussian_plume` `relief_valve` · 화학·열역학: `ideal_gas` `compressibility` `dilution` `concentration` `buffer_ph` `antoine` `water_sat` · 유체·배관: `reynolds` `pipe_dp` `pipe_size` `pump_power` `npsha` `orifice` · 열전달·습공기: `heat_duty` `lmtd` `insulation_loss` `nusselt` `psychro` · 용기·반응기: `vessel_volume` `reactor`. 목록 정본은 `frontend/public/chemip/calc_registry.jsx` `CALC_REGISTRY`. 값은 그 칸의 기본 단위로 읽는다(예: `pipe_dp` 의 `D` 는 mm). 선택 칸은 옵션 값 그대로(`dir=mg2ppm`). 혼합물 표는 링크로 채우지 않는다. 예: `?view=calc&calc=ppm_mgm3&mw=78.1134&name=벤젠`, `?view=calc&calc=evaporation&mw=92.14&psat=3.79&name=톨루엔`(`psat` 은 kPa) |
| 화면 언어 | 위 어느 주소에나 `&lang=en` 또는 `&lang=ko` (단독이면 `?lang=en`) | 페이지를 열 때 한 번 정해진다(`frontend/public/chemip/lang.jsx`). 순서: 주소 `lang` → 이 브라우저에 저장된 값(localStorage `chemip-lang`) → `ko`. 받은 값은 저장되므로 이후 `lang` 없는 주소도 같은 언어로 열린다. 다른 값은 무시한다. 상단 바 "한 / EN" 단추도 같은 값을 붙여 다시 연다. 영어 화면에서도 KOSHA MSDS 원문·국내 법령 이름 같은 출처 자료는 원문(한국어) 그대로다. 예: `?view=product&pv=chemical&chem=71-43-2&lang=en` |
| 물질 소개 페이지(SEO) | `https://chemip.yule.pics/chemip/cas/<CAS>` (끝에 `/` 없음) | **약 3,169개 CAS 에만 있다**(`/chemip/cas/71-43-2` 200, `/chemip/cas/7732-18-5` 404, 끝 `/` 붙이면 308 → `/` 없는 주소). 있는지 모르는 CAS 는 쓰지 말고 위의 물질(CAS) 주소를 쓴다 |

### `anchor` 키

키 → 섹션 표는 `frontend/public/chemip/section_anchor.jsx` `SECTION_ANCHORS` 한 곳에 있다. 화면을 연 뒤 그 섹션을 화면 맨 위로 맞춘다.
위쪽 패널이 늦게 채워져 자리가 밀리면 10초 동안 다시 맞추고, 사용자가 스크롤·클릭·키를 누르면 바로 멈춘다. 모르는 키는 무시한다(맨 위에서 연다).

| 키 | 섹션 | 형제 사이트 용도 | 확인(벤젠 71-43-2, 11초 뒤 섹션 위치) |
|---|---|---|---|
| `intl-regulation` | 해외 규제(지도·나라별 목록) | EPC 관할 화면 | top 0 |
| `provisions` | 근거 조문(EPC 법령 본문 검색) | EPC 관할·법령 화면 | top 0. 해외 규제 자료가 온 뒤에 생기므로 그 전에는 `intl-regulation` 으로 간다. 그 CAS 가 EPC 관할 나라 목록에 없으면 패널이 없어 해외 규제에 머문다 |
| `incidents` | 사고 사례(Chem_Eng 사고 DB) | Chem_Eng 사고 화면 | top 0 |
| `enforcement` | 미국 EPA 집행(ECHO) | Environment ECHO 화면 | top 0 |
| `tceq-events` | 텍사스 TCEQ 배출사고 | Environment TCEQ 화면 | top 0 |
| `oel` | 노출기준 비교(고용노동부 고시·OSHA·NIOSH·EU 참고값, 출처·기준일) | 산업위생·노출 평가 화면, 통합 검색 "<물질> 노출기준" 답 | top 0 (PC-off 정적 자료로 확인) |
| `handlers` | 취급 사업장(PRTR) | 논문 인용 링크 | 페이지 맨 아래 섹션이라 더 내려가지 않는다(top 107, 화면 안에 보임) |

배포 메모: `handlers` 말고 다른 키는 2026-10-30 빌드부터 동작한다. 공개 주소(chemip.yule.pics)에 이 빌드가 배포되기 전에는 다른 키가 있는 링크도 맨 위에서 열린다(링크는 깨지지 않는다).

예시

```
https://chemip.yule.pics/chemip?view=product&pv=chemical&chem=71-43-2&anchor=tceq-events
https://chemip.yule.pics/chemip?view=product&pv=chemical&chem=71-43-2&anchor=provisions
https://chemip.yule.pics/chemip?view=product&pv=chemical&chem=71-43-2&anchor=oel
https://chemip.yule.pics/chemip?view=product&pv=search&q=%EB%B2%A4%EC%A0%A0
https://chemip.yule.pics/chemip?view=product&pv=chemical&chem=71-43-2&lang=en
https://chemip.yule.pics/chemip?view=search&q=LMTD
https://chemip.yule.pics/chemip?view=search&q=flash%20point&lang=en
```

## 2. 나가는 링크 (ChemIP → 형제 사이트)

주소는 `backend/integrations/sources.py` 에서만 정의한다(`CHEMENG_PUBLIC_URL`, `EPC_PUBLIC_URL`, `ENVIRONMENT_PUBLIC_URL`).

| 대상 | 주소 | 어디서 | 확인 |
|---|---|---|---|
| Chem_Eng 경험 그래프 | `https://chemeng.yule.pics` | 사고 사례 패널 설비 행(`product_incidents.jsx`) | 307 → `/chemeng` |
| EPC 설계 검증 분야 | `https://epc.yule.pics/<분야>`, 분야 키 = `backend/integrations/equipment_disciplines.py` `DISCIPLINES`: `piping` · `vessel` · `rotating` · `instrumentation` · `electrical` | 사고 사례·TCEQ 패널의 `epc_url`(`incident_store.py`, `tceq_event_store.py`) | 5개 모두 200 |
| EPC 관할별 법령 본문 검색 | `https://epc.yule.pics/jurisdictions` | 근거 조문 패널 머리(`product_provisions.jsx`) | 200 |
| Environment TCEQ 목록 | **보류** | — | Environment P1 화면이 생긴 뒤에 붙인다. 받는 쪽 주소 형식은 Environment 세션이 보내 주고, `sources.py` 에 둔다(`env.yule.pics` 루트는 200) |

chemeng.yule.pics 와 epc.yule.pics 는 집 PC 터널로 나간다. PC 가 꺼지면 이 두 사이트는 열리지 않는다.
ChemIP 패널의 내용(사고 사례·TCEQ·근거 조문 등)은 정적 파일로도 나가므로 PC 가 꺼져도 화면에는 보인다(근거 조문은 미리 받아 둔 물질만, `scripts/static_export/CONTRACT.md` "pv/<CAS>.json").

## 3. 바꿀 때

- 키를 더하거나 바꿀 때: `section_anchor.jsx` `SECTION_ANCHORS` 한 줄 + 이 문서의 새 버전(v8).
- 계산기를 더할 때: `calc_registry.jsx` 한 줄 + 이 문서의 새 버전(v8).
- 통합 검색 묶음을 더할 때: `usearch_provider_<이름>.jsx` 파일 하나 + `usearch_providers.jsx` 한 줄. 주소 형식이 그대로면 이 문서는 바꾸지 않는다.
- 나가는 주소를 바꿀 때: `sources.py` 한 곳 + 이 문서의 새 버전.
- 화면 언어를 더할 때: `lang.jsx` `CHEMIP_LANGS` + 문구 파일(`*_labels_<언어>.jsx`) + 이 문서의 새 버전.
- 새 연동 추가 순서: `backend/integrations/README.md` "새 연동 추가 순서".
