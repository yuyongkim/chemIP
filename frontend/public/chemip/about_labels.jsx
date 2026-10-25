// Labels for 소개 문구(랜딩의 중소기업 안내 띠)와 "자료 출처·라이선스" 화면, 익명 이용 집계 안내.
// 화면 코드(landing_sme.jsx · sources_view.jsx)는 ABOUT_LABELS 만 읽는다. 출처 목록 자체는 sources_data.jsx.

const ABOUT_LABELS = {
  sme: {
    kicker: "무료 · 오픈소스(AGPL-3.0) · 중소기업 누구나",
    title: "규제·MSDS 담당자가 없는 회사도 바로 씁니다.",
    body: "ChemIP 는 가입·요금 없이 누구나 쓸 수 있습니다. 물질 하나를 고르면 국내 법령별 규제, 인허가·신고, 수출입 의무와 근거 조문을 한 화면에 모아 보여 드리고, 체크리스트로 인쇄할 수 있습니다. 소스 코드는 AGPL-3.0 으로 공개되어 있어 사내에 직접 설치해도 됩니다.",
    points: [
      "가입·결제 없음 — 화면을 열면 바로 검색",
      "규제·인허가 / 수출입 체크리스트 인쇄·CSV",
      "필요한 기능·틀린 자료는 요청 게시판으로",
    ],
    ctaBoard: "요청 게시판",
    ctaSources: "자료 출처·라이선스",
  },
  usage: {
    title: "익명 이용 집계 안내",
    body: "서비스 개선과 연구(중소기업 활용 근거)를 위해 날짜별 물질 상세 조회 수와 규제·인허가 / 수출입 조회 수만 셉니다. IP 주소·브라우저 정보·계정 등 개인을 알아볼 수 있는 정보는 수집하지 않습니다. 집계 결과는 /api/usage/summary 에서 누구나 볼 수 있습니다.",
    statsTitle: "최근 30일 집계",
    metricNames: { substance_view: "물질 상세 조회", trade_controls: "규제·인허가 / 수출입 조회" },
    distinct: n => `서로 다른 물질 ${n}개`,
    times: n => `${n.toLocaleString("ko-KR")}회`,
    since: d => (d ? `집계 시작 ${d}` : "아직 집계된 기록이 없습니다."),
  },
  sources: {
    navLabel: "자료 출처",
    title: "자료 출처·라이선스",
    lede: "ChemIP 가 보여 주는 모든 자료의 제공기관과 이용 조건입니다. 화면의 표시는 안내이며, 법적 판단은 각 원문과 관할 기관에 확인하십시오.",
    software: "ChemIP 소스 코드: GNU AGPL-3.0. 수정해 서비스로 제공하면 수정한 소스도 같은 조건으로 공개해야 합니다.",
    repo: "소스 코드 (GitHub)",
    license: "라이선스 전문",
    columns: { name: "자료", provider: "제공기관", used: "쓰는 곳", license: "이용 조건·출처 표시" },
    unrecorded: "저장소에 이용 조건 기록이 없어 제공처 고지 확인이 필요합니다",
    attribution: "출처 표시",
    open: "원문 ↗",
    count: n => `${n}개 출처`,
  },
};

Object.assign(window, { ABOUT_LABELS });
