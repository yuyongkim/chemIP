// 처음 화면 · "최근 조회" 줄 — 이 브라우저에서 마지막으로 본 물질로 돌아가는 단추. 문구: LANDING_LABELS.hero.recent
// 주소로 새로 들어오면 첫 화면이 먼저 뜨므로(app.jsx), 보던 물질은 여기서 이어 본다. 기록이 없으면 그리지 않는다.

function landingRecentChemical() {
  try {
    const chem = JSON.parse(localStorage.getItem("chemip-selected") || "null");
    return chem && chem.name ? chem : null;
  } catch (e) {
    return null;
  }
}

function landingOpenRecent(setView) {
  try { localStorage.setItem("chemip-view", "chemical"); } catch (e) {}
  setView && setView("product");
}

function LandingRecent({ setView }) {
  const [chem] = useState(landingRecentChemical);
  if (!chem) return null;
  return (
    <p className="ld-recent">
      <span className="ld-recent-label">{LANDING_LABELS.hero.recent}</span>
      <button type="button" className="ld-recent-link" onClick={() => landingOpenRecent(setView)}>
        {chem.name}{chem.cas_no ? ` (${chem.cas_no})` : ""}
      </button>
    </p>
  );
}

Object.assign(window, { LandingRecent });
