// 연구·개발 화면 문구(DEV_LABELS). 중소기업 사용자에게는 필요 없는 화면(논문 연구·벤치마크·모바일 시안·개발자 소개)을 모은 입구.

const DEV_LABELS = {
  title: "연구·개발",
  lede: "논문·심사·개발 참여를 위한 화면을 모아 두었습니다. 물질 규제 확인에는 필요하지 않습니다. 아래 화면은 대부분 영문입니다.",
  cards: [
    { k: "research", icon: "book", title: "논문 연구 화면", desc: "ChemIP 관련 논문과 그림을 재현하는 화면." },
    { k: "benchmark", icon: "spark", title: "벤치마크", desc: "검색·추천 정확도 평가 결과와 라벨링 자료." },
    { k: "mobile", icon: "map", title: "모바일 시안", desc: "휴대폰 화면 설계 시안(실제 데이터와 연결되지 않음)." },
  ],
  open: "열기",
  overviewTitle: "개발자용 소개(영문)",
  overviewDesc: "데이터 출처 구성, API 목록, 설치 방법, 로드맵과 알려진 한계.",
  showOverview: "펼치기",
  hideOverview: "접기",
};

Object.assign(window, { DEV_LABELS });
