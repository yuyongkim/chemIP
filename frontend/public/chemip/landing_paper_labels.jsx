// 처음 화면 · 연구 논문 절 문구(LANDING_PAPER_LABELS_KO, 영어: landing_paper_labels_en.jsx). 화면 코드는 landing_paper.jsx.
// 근거: ACS Chemical Health & Safety, DOI 10.1021/acs.chas.6c00064 (Crossref 출판일 2026-10-06), 원고 papers/acs-chs/_제출본_v2.9.

const LANDING_PAPER_LABELS_KO = {
  eyebrow: "연구 논문",
  title: "학술지 심사를 거친 도구입니다",
  journal: "ACS Chemical Health & Safety",
  status: "2026 게재",
  paperTitle: "ChemIP: An Open-Source Web Platform for Unified Chemical Safety Data Retrieval across Korean and International Regulatory Sources",
  points: [
    {
      title: "문제",
      desc: "물질 하나를 검토하려면 유해성·규제·특허·의약품 정보를 기관마다 다른 포털에서 따로 찾아야 합니다. 조사 시간이 늘고, 빠뜨리는 항목이 생기고, 담당자마다 결과가 달라집니다.",
    },
    {
      title: "해법",
      desc: "물질 이름이나 CAS 번호 한 번으로 국내외 안전·규제·특허 자료를 함께 조회합니다. 4곳 이상의 포털을 오가며 모으던 일을 한 번의 조회로 줄입니다.",
    },
    {
      title: "설계",
      desc: "자료 출처마다 연결 모듈을 따로 두어, 한 출처가 멈춰도 나머지는 계속 보여 줍니다. AI를 쓸 수 없을 때는 규칙에 따른 보고서로 대신합니다.",
    },
    {
      title: "공개",
      desc: "소스 코드와 테스트, 자료 처리 과정을 모두 공개해 누구나 검증하고 다시 만들어 볼 수 있습니다.",
    },
  ],
  // 기존 방식 vs ChemIP — 논문 서론·그림 1 의 내용(포털별 개별 조회 → 한 번의 질의). 시간 수치는 넣지 않는다.
  compare: {
    title: "조사 방식이 이렇게 바뀝니다",
    before: {
      label: "기존 방식",
      steps: [
        { name: "안전보건공단 MSDS", task: "MSDS 검색·내려받기" },
        { name: "화학물질 정보(KISChem·NCIS)", task: "유해화학물질 분류 확인" },
        { name: "법령·고시", task: "법령별 지정 목록 대조" },
        { name: "특허(KIPRIS)", task: "특허 검색" },
        { name: "식약처·해외 자료", task: "의약품·상대국 규제 확인" },
      ],
      end: "담당자가 직접 모아 문서로 정리",
    },
    after: {
      label: "ChemIP",
      query: "물질 이름 또는 CAS 번호 한 번",
      hub: "출처별 연결 모듈이 동시에 조회 · 이름/CAS 일치 확인",
      results: ["MSDS·GHS 유해성", "국내 법령 목록·인허가", "수출입·상대국 규제", "특허·의약품 연계", "체크리스트(인쇄·PDF·CSV)"],
    },
  },
  // 논문 그림(저자 작성, 게재본 그림 번호 그대로). 이미지: assets/paper/
  figures: [
    { src: "assets/paper/fig1_architecture.webp", w: 1600, h: 978, title: "그림 1. 시스템 구조", desc: "화면 · 서버(출처별 연결 모듈, 재시도·대체 계층) · 외부 공공 자료의 3계층 구조" },
    { src: "assets/paper/fig2_integration_flow.webp", w: 1600, h: 771, title: "그림 2. 자료 통합 흐름", desc: "질의 → 별칭·CAS 확인 → 기준 물질 행 → 출처별 조회 → 정규화 → 근거 묶음 → 보고서" },
  ],
  figureSource: "출처: Kim, ACS Chemical Health & Safety (2026), DOI 10.1021/acs.chas.6c00064",
  links: [
    { label: "논문 원문 (DOI 10.1021/acs.chas.6c00064)", href: "https://doi.org/10.1021/acs.chas.6c00064" },
    { label: "소스 코드 (GitHub)", href: "https://github.com/yuyongkim/chemIP" },
    { label: "보관본 (Zenodo DOI 10.5281/zenodo.19447588)", href: "https://doi.org/10.5281/zenodo.19447588" },
  ],
};

Object.assign(window, { LANDING_PAPER_LABELS_KO });
