// 패밀리 사이트 목록 — 바닥글(family_footer.jsx)과 상단 바 메뉴(family_menu.jsx)가 읽는 단 한 곳.
// 출처: docs/integration/FAMILY_SITES_v1.md §1 (순서·문구 그대로). 바꿀 때는 그 문서의 새 버전에 맞춰 여기만 고친다.
// 백엔드용 형제 사이트 주소는 backend/integrations/sources.py 에 따로 있다(물질 연동용). 이 목록과 일부러 분리해 둔다.
// self: true = 지금 이 사이트(ChemIP). 바닥글에서는 빠지고, 메뉴에서는 "지금 사이트"로 표시된다.

const FAMILY_SITES = [
  {
    key: "chemip",
    name: "ChemIP",
    url: "https://chemip.yule.pics/chemip",
    desc: { ko: "화학물질 MSDS·규제·인허가 통합 조회", en: "Chemical SDS, regulation and permit lookup" },
    self: true,
  },
  {
    key: "chemeng",
    name: "ChemEng AI",
    url: "https://chemeng.yule.pics/chemeng",
    desc: { ko: "화공 사고 사례·공정 지식 질의", en: "Process incidents and chemical engineering Q&A" },
  },
  {
    key: "epc",
    name: "EPC Workbench",
    url: "https://epc.yule.pics",
    desc: { ko: "7개 분야 설계 검증·나라별 법령 본문", en: "Seven-discipline design checks and jurisdiction law text" },
  },
  {
    key: "env",
    name: "env.yule.pics",
    url: "https://env.yule.pics",
    desc: { ko: "환경 인허가 리스크·집행 사례", en: "Environmental permit risk and enforcement cases" },
  },
];

Object.assign(window, { FAMILY_SITES });
