// 안전 도구 목록(SAFETY_TOOLS: 화면 key·아이콘) — 도구 하나 = 화면 파일 하나 + 아래 배열 한 줄 + app.jsx APP_SCREENS 한 줄.
// 이름·설명은 SAFETY_LABELS.nav.tools[k], 없으면 APP_LABELS.screens[k].
// SafetyToolsNav: 공학 계산기 화면 위쪽과 각 도구 화면 위에 놓는 바로가기 줄(지금 도구는 눌린 상태). 문구: SAFETY_LABELS.nav. 스타일: calc.css .sft-nav*

const SAFETY_TOOLS = [
  { k: "compat", icon: "shield" },
  { k: "mixghs", icon: "flask" },
  { k: "applicability", icon: "book" }, // 적용 법규 판정기(apl_view.jsx)
  { k: "hazop", icon: "layers" }, // HAZOP 워크시트 작성기(hazop_view.jsx)
  { k: "ghslabel", icon: "doc" }, // 경고표지 만들기(다른 화면 ghs_label_view.jsx) — 이름은 APP_LABELS.screens
];

function SafetyToolsNav({ current, setView }) {
  const L = SAFETY_LABELS.nav;
  return (
    <nav className="sft-nav" aria-label={L.aria}>
      <span className="sft-nav-head">{L.title}</span>
      {SAFETY_TOOLS.map(t => (
        <button key={t.k} type="button" className="sft-nav-item" aria-pressed={current === t.k} title={L.tools[t.k]?.desc || ""}
          onClick={() => setView && setView(t.k)}>
          <Icon name={t.icon} size={12} /> {L.tools[t.k]?.name || APP_LABELS.screens[t.k] || t.k}
        </button>
      ))}
      {current && (
        <button type="button" className="sft-nav-item sft-nav-back" onClick={() => setView && setView("calc")}>
          <Icon name="chev" size={12} /> {L.calc}
        </button>
      )}
    </nav>
  );
}

Object.assign(window, { SAFETY_TOOLS, SafetyToolsNav });
