# 비상대응 기준 표(el) — v1 (2026-10-31)

오프사이트 스크리닝(장외 영향 사전 검토) 담당 에이전트 E 에게 남기는 안내입니다. CAS 별 비상대응 기준 표는 이 작업(Engineering H)이 맡고,
정적 파일 `v1/el/<CAS>.json` · `v1/el/index.json` 으로 R2 에 올라가 있습니다(3,076개 객체, 2026-10-31 업로드).
형식은 `scripts/static_export/CONTRACT.md` "el/" 절이 기준입니다.

## E 쪽에서 바꿀 것

E 의 `scripts/portal_build/toxic_endpoints.py` 머리 주석에는 "DOE PAC Rev. 29 는 넣지 않음(emhub1 응답 없음)" 이라고 적혀 있습니다.
지금은 아래처럼 바꿀 수 있습니다.

| 필요한 값 | 어디서 읽나 |
|---|---|
| ERPG-2 | `el/<CAS>.json` 의 `erpg.v[1]`(DOE PAC 가 ERPG 근거로 실은 84종, 단위 `erpg.unit`) |
| AEGL-2 (10분·30분·60분) | `aegl.v["2"][0..2]`(EPA 값 페이지 그대로, `**`/`***` 칸도 표 아래 주석 값으로 채움, 단위 `aegl.unit`) |
| PAC-2 | `pac.v[1]`(원문 단위 `pac.unit`) 또는 `pac.mg[1]`(mg/m³, DOE Table 4) |
| 분자량 | `mw`(DOE PAC) |

- 브라우저에서는 `useEmergencyLimits(cas)`(api_el.jsx) → `data.file` 이 그 파일입니다(`kora_sheet_panel.jsx` 가 이미 이렇게 씁니다).
- `calc_rmp_data.jsx` 를 만드는 `gen_frontend_rmp.py` 도 이미 `out/v1/el` 을 읽습니다. 이 표를 다시 만들면(`emergency_limits.py`)
  그 스크립트도 다시 돌려 주세요.
- 화면 사용자가 PAC-2 를 직접 넣게 하던 칸은 이제 파일 값으로 미리 채울 수 있습니다.

## 출처와 표시 규칙

| 출처 | 원본 | 표시 |
|---|---|---|
| EPA AEGL 값 페이지 | https://www.epa.gov/aegl/access-acute-exposure-guideline-levels-aegls-values (미국 정부 저작물) | 값 그대로, TSD 는 링크만 |
| DOE PAC Rev. 29 (2016-05) | `Revision_29.xlsx` — edms3.energy.gov 가 국외 접속을 끊어 같은 DOE 주소의 Internet Archive 사본을 받음(manifest 에 두 주소 기록) | 값 그대로 |
| AIHA ERPG | DOE PAC 가 근거로 다시 실은 값만 | "ERPG via DOE PAC Rev. 29", AIHA 문서 글 없음 |
| RIVM probitrelaties | https://www.rivm.nl/probitrelaties (물질별 쪽) | a·b·n·상태·확정일·원문 링크 |

- 한국 끝점 순서(참고): ERPG-2 → AEGL-2(60분) → PAC-2. 화면 함수는 `elEndpoint`(el_helpers.jsx).
- AEGL 이 있는 물질은 DOE 가 AEGL 을 쓰므로 `erpg` 가 비어 있습니다(예: 염소). AIHA 가 ERPG 를 냈더라도 이 표에는 없습니다.
- Rev. 29A 는 Rev. 29 와 한 값만 다릅니다(7778-50-9 중크롬산칼륨 PAC-2 8.8 → 7.4 mg/m³). 과제 지시대로 Rev. 29 를 씁니다.

## 다시 만들기

```
python -I -B G:\MSDS\scripts\portal_build\el_fetch.py
python -I -B G:\MSDS\scripts\portal_build\emergency_limits.py
E:/dev-cache/r2-venv/Scripts/python -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:/dev-cache/chemip-static/out/v1/el --prefix v1/el --gzip-all
```
