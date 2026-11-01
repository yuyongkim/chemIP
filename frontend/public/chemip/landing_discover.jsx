// 처음 화면 · 둘러보기 줄 — 왼쪽 "자주 찾는 물질"(landing_popular.jsx), 오른쪽 "오늘의 물질"(landing_today.jsx). 배치만 한다.

function LandingDiscover() {
  return (
    <section className="section ld-disc-sec">
      <div className="ld-inner ld-disc-row">
        <LandingPopular />
        <LandingToday />
      </div>
    </section>
  );
}

Object.assign(window, { LandingDiscover });
