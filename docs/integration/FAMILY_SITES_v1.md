# 패밀리 사이트 규약 v1 — ChemIP · ChemEng AI · EPC Workbench · env.yule.pics

네 사이트를 한 묶음(포털)처럼 오가게 하는 최소 규약. 물질(CAS) 연동과는 별개로, **어느 페이지에서든 다른 세 사이트로 갈 수 있게** 하는 것이 목적이다.
확인일 2026-10-30(네 주소 모두 200). 바꿀 때는 이 파일을 고치지 않고 `FAMILY_SITES_v2.md` 를 새로 만든다.

## 1. 목록 (이 순서·이 문구 그대로)

| key | 이름 | 주소 | 한 줄 설명 (ko) | 한 줄 설명 (en) |
|---|---|---|---|---|
| `chemip` | ChemIP | https://chemip.yule.pics/chemip | 화학물질 MSDS·규제·인허가 통합 조회 | Chemical SDS, regulation and permit lookup |
| `chemeng` | ChemEng AI | https://chemeng.yule.pics/chemeng | 화공 사고 사례·공정 지식 질의 | Process incidents and chemical engineering Q&A |
| `epc` | EPC Workbench | https://epc.yule.pics | 7개 분야 설계 검증·나라별 법령 본문 | Seven-discipline design checks and jurisdiction law text |
| `env` | env.yule.pics | https://env.yule.pics | 환경 인허가 리스크·집행 사례 | Environmental permit risk and enforcement cases |

## 2. 각 사이트가 붙일 것 (최소)

1. **바닥글(footer) 한 줄** — 모든 페이지. "패밀리 사이트 / Family sites" 제목 + 자기 자신을 뺀 세 사이트 링크(이름 + 한 줄 설명은 title 속성이나 작은 글씨).
2. 선택: 상단 바 오른쪽의 작은 "사이트 이동 / Sites" 메뉴(같은 목록).
- 목록은 사이트마다 **설정 파일 한 곳**에 두고 화면은 그것만 읽는다(주소를 화면 코드에 박지 않는다).
- 새 탭(`target="_blank" rel="noopener"`)으로 연다.
- 언어 전환이 있는 사이트는 ko/en 설명을 따른다.

## 3. 알아 둘 것

- ChemIP 는 Cloudflare 에서 나가므로 PC 가 꺼져도 열린다. 나머지 세 사이트는 집 PC 터널이라 PC 가 꺼지면 열리지 않는다(링크는 그대로 둔다).
- 물질 단위 깊은 연결(CAS·anchor)은 `LINK_CONTRACT_v4.md`.
