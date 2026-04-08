# Paper Changelog — ACS Chemical Health & Safety

## v1.7 (2026-04-08) — figures added (6 total)
- Figure 1: 아키텍처 다이어그램 (새로 제작, fig1_architecture.png)
- Figure 2: 메인 인터페이스 (cap_main.png)
- Figure 3: MSDS/GHS 조회 (cap_chemical.png)
- Figure 4: 특허 검색 (cap_patents.png)
- Figure 5: 의약품 교차참조 (cap_drugs.png)
- Figure 6: Before/After 워크플로우 비교 (새로 제작, fig6_workflow_comparison.png)
- 본문 Figure 참조 업데이트 (Figure 1→아키텍처, Figure 2→메인 UI, etc.)
- docx에 6장 이미지 + 캡션 삽입
- 국문 번역본: paper_v1.6_ko.md
- Files: paper_v1.7.md, paper_v1.7.docx

## v1.6 (2026-04-08) — scope refocused on safety-regulatory-patent integration
- Scope 축소: 6개 워크플로우 → 5개 핵심 (MSDS, 규제분류, 특허, 의약품, AI요약) + 무역/뉴스는 supplementary 1문장
- Abstract: "nine endpoints" 나열 → safety/regulatory/patent 프레이밍
- Introduction: trade intelligence 강조 제거, 규제-특허 연동 강조
- Safety-Relevant Functionalities: 무역 정보를 독립 항목 → 부가 언급으로 축소
- Use Case 1: KOTRA 상세 → 규제+특허 연동 중심 재구성
- Table 2: Trade intelligence 행 제거
- Deployment experience: KOTRA 이슈 → safety 관련 이슈(GHS, KOSHA, NCIS)로 교체
- Conclusions: "nine public data endpoints" → "safety, regulatory, patent, pharmaceutical"
- Files: paper_v1.6.md, paper_v1.6.docx

## v1.5 (2026-04-08) — ref 16 corrected, docx fully reformatted
- Ref 16 화학물질관리법: Act No. 16272, 2019 → Act No. 16084, 2018 (오류 수정, 산업안전보건법과 번호 중복 해소)
- docx 전면 재생성: Table 1/2 실제 Word 테이블, bold/italic 실제 서식, superscript 참조번호, double-spaced, Times New Roman 12pt, 페이지 번호
- build_docx.py 빌드 스크립트 추가
- Files: paper_v1.5.md, paper_v1.5.docx

## v1.4 (2026-04-07) — submission-ready
- Introduction: ChemIP 차별점 문장 추가 ("end-to-end workflow of regulatory safety evaluation")
- Platform Design: 재현성 문장 추가 ("step-by-step installation guide")
- 76% 수치: 추가 caveat ("rough, order-of-magnitude estimates")
- ACS CCS safety guideline 참조 추가 (ref 18)
- Files: paper_v1.4.md, paper_v1.4.docx

## v1.3 (2026-04-07) — prompts 3-5 applied
- Table 2 대폭 수정: PubChem open-source → --, MSDS/GHS 행 분리, PubChem Patent → Y, Drug cross-ref 수정, 각주 추가
- SE 냄새 제거 5곳: connection pooling, HTTP codes, Aho-Corasick, monkeypatch, CI/CD → 안전 실무 표현으로 전환
- Limitations 3개 추가: 캐시 갱신, 한국어 장벽, API 이용약관
- 시간 절감에 step-count 감소 보충
- 한국 법령 참조 2개 추가 (화학물질관리법, 산업안전보건법)
- GHS UN 문서번호 추가
- 비교 주장에 PubChem/SciFinder 기능 인정 문장 추가

## v1.2 (2026-04-07) — prompts 1-2 applied
- Abstract GitHub/Zenodo 문장 분리·완곡화
- ICCA "reports that there are" 수정
- 비교 주장 "To our knowledge, publicly documented" 강화
- 시간 절감 caveat "small set of representative cases" 추가

## v1.1 (2026-04-07) — fact-checked draft
- "safety-critical" → "reliable" 완화
- ref 8-13 본문 인용 추가
- Cover letter "We" → "I"
- Abstract 약어 정리

## v1.0 (2026-04-07) — initial draft
- SoftwareX v3.1에서 ACS CHS 포맷으로 변환
- 제목 변경: "Chemical Safety Data Retrieval"
- 섹션 구조: Introduction / Platform Design / Safety-Relevant Functionalities / Use Cases / Results and Discussion / Conclusions
- Code Metadata 표 제거 (ACS에 없음)
- ACS 참조 형식 (superscript, DOI)
- AI 공시 (Claude) Acknowledgments에 추가
- Files: paper_v1.0.md, paper_v1.0.docx
