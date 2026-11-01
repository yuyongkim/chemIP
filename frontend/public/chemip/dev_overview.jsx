// 연구·개발 화면의 "개발자용 소개" — 예전 영문 랜딩의 절(데이터 출처·작업 흐름·API·설치·로드맵·한계) 배치만.
// 처음 화면(landing.jsx)에서 옮겨 왔다. 심사자·개발자 대상이라 영문을 유지한다.
// 절: dev_overview_hero.jsx · dev_overview_sections.jsx · dev_overview_footer.jsx. 문구·자료: dev_overview_data.jsx.

function DevOverview({ setView }) {
  return (
    <>
      <Banner />
      <DevHero setView={setView} />
      <StatsStrip />
      <Sources />
      <Workflows />
      <Capabilities />
      <QuickStart />
      <Users />
      <Roadmap />
      <Gaps />
      <DevFooter setView={setView} />
    </>
  );
}

Object.assign(window, { DevOverview });
