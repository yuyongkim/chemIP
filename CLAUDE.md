# CLAUDE.md — ChemIP Project Rules

## Paper Versioning (papers/acs-chs/)

- **최종본 기준:** `paper_v2.3.md` / `paper_v2.3.docx`
  - `paper_v1.7`은 ACS CHS 최초 제출 원본(hs-2026-00064q)이자 마크업 기준선. 폴더에 유지할 것.
  - 대체된 버전은 `archive/`로 이관. 본 폴더에는 제출 원본·현행본·제출용 부속 문서만 둔다.
- **변경사항 발생 시 반드시 버전을 올려서 새 파일 생성** (e.g., v1.4 → v1.5)
  - md와 docx 모두 새 버전으로 생성
  - `CHANGELOG.md`에 변경 내용 기록
  - 이전 버전 파일은 삭제하지 않음 (이력 보존)
- **커버레터·리뷰어 응답서도 동일하게 버전관리한다. 덮어쓰기 금지.**
  - `cover_letter_v1 → v2`, `response_to_reviewer_v1 → v2` 식으로 파일명에 버전을 붙인다
  - 구버전은 `archive/`로 이관
- 제출 파일은 `_제출용/`에 폼 업로드 순서대로 번호를 붙여 사본을 둔다

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## 논문 원고 형식 — 저널 형식 사전 파악·투고 전 필수 점검 (2026-10-20)

Paper 4(APFM) 교정쇄에서 질의 56건이 나왔다. 1차 투고본과 수정본 R1 모두 저널 형식을 확인하지 않은 채 표 번호·캡션, 본문 그림 인용, 인용 연도 없이 나갔기 때문이다. 이것은 기본이다. 어기면 제출 금지.

0. **저널 형식을 먼저 파악한다.** 원고를 쓰거나 저널을 바꿀 때 가장 먼저 대상 저널의 Author Guidelines(Submission Guidelines)를 직접 읽고 요약해 프로젝트 폴더에 `JOURNAL_FORMAT_<저널>.md` 로 남긴다: 인용 방식(저자-연도/번호), 참고문헌 양식·정렬, 표·그림 번호와 캡션 위치, 본문 인용 표기(Fig. 1/Figure 1), 제목 수준, 초록 길이, 키워드 수, 필수 선언문(Declarations·Data availability·Funding 등), 익명화 규칙, 파일 형식. 원고는 처음부터 이 형식으로 만든다.
1. **인용은 그 저널 방식 그대로.** 저자-연도 방식이면 참고문헌 전부가 본문에 (저자 연도)로 인용된다. "Altman's model"처럼 이름만 쓰는 서술 금지 → "Altman (1968)". 번호 방식이면 모든 항목이 [n]으로 인용되고 번호가 순서대로다.
2. **표마다 번호·캡션.** "Table N. 제목"이 있고 본문에서 "Table N"으로 순서대로 인용된다.
3. **그림은 본문에서 인용.** 캡션만으로는 안 된다. 본문 문장 안에 "(Fig. N)"이 1부터 순서대로 나온다.
4. **원고 머리 정리.** 버전·날짜 줄("v5.0 / Last updated" 등)과 작업 메모를 지운다.
5. **참고문헌.** 저널 양식과 정렬 규칙을 지키고, DOI는 전부 실제로 열어 확인한다. 본문에 인용되지 않은 항목은 없앤다.
6. **수정본·재투고본에도 똑같이.** 심사 답변만 고치고 형식 점검을 건너뛰지 않는다. 저널을 옮기면 0번부터 다시 한다.

점검은 눈으로만 하지 말고 스크립트로 센다(표 수 = 캡션 수 = 본문 Table 인용 수, 그림 수 = 본문 Fig 인용 수, 참고문헌 수 = 본문 인용 종류 수). 제출 패키지를 보고할 때 이 점검 결과를 함께 적는다.

## 프론트엔드 모듈화 (2026-10-24)

글로벌 규칙의 "프론트엔드는 특히 엄격하게"를 그대로 따른다. 이 프로젝트의 실제 화면은 `frontend/public/chemip/*.jsx`(빌드 없는 React)다.
- 물질 상세 탭은 `product_<탭이름>.jsx` 파일 하나씩, 등록은 탭 목록 데이터에 한 줄로 한다.
- API 호출은 `api.jsx` 훅에만 두고, 탭 컴포넌트는 그 훅의 결과만 그린다.
- 색·간격은 `tokens.css` 변수, 나라 이름은 `intl_regions.jsx` 의 `INTL_JURISDICTIONS` 처럼 한 곳에서 읽는다.
