// 물질 화면 ?anchor=<키> — 다른 사이트(형제 프로젝트) 링크가 아래 패널로 바로 가게 한다.
// 키 → 섹션 id 표는 여기 한 곳. 링크 형식 문서: docs/integration/LINK_CONTRACT_v9.md (키를 바꾸면 같이 고친다).
// 위쪽 패널이 늦게 채워지면 자리가 밀리므로 잠깐 동안 다시 맞추고, 사용자가 스크롤·클릭·키를 누르면 바로 멈춘다.

// 키 → 섹션 id 후보(앞에서부터 화면에 있는 것). 근거 조문은 해외 규제 자료가 온 뒤에 생기므로 그 전에는 해외 규제로 간다.
const SECTION_ANCHORS = {
  "intl-regulation": ["intl-regulation"],
  provisions: ["provisions", "intl-regulation"],
  incidents: ["incidents"],
  enforcement: ["enforcement"],
  "tceq-events": ["tceq-events"],
  handlers: ["handlers"],
  "kr-law": ["kr-law"],
  catrules: ["catrules"], // 분류로 걸리는 규제(product_catrules.jsx)
  oel: ["oel"],
  el: ["el"],
  tp: ["tp"],
};
const ANCHOR_SETTLE_MS = 10000;
const ANCHOR_STEP_MS = 300;
const ANCHOR_STOP_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"];

function anchorTarget(anchor) {
  const ids = SECTION_ANCHORS[anchor] || [];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function useSectionAnchor(anchor) {
  React.useEffect(() => {
    if (!SECTION_ANCHORS[anchor]) return;
    let stopped = false;
    const stop = () => { stopped = true; };
    ANCHOR_STOP_EVENTS.forEach(e => window.addEventListener(e, stop, { passive: true }));
    const t0 = Date.now();
    const timer = setInterval(() => {
      if (stopped || Date.now() - t0 > ANCHOR_SETTLE_MS) { clearInterval(timer); return; }
      const el = anchorTarget(anchor);
      if (el && Math.abs(el.getBoundingClientRect().top) > 2) el.scrollIntoView({ block: "start" });
    }, ANCHOR_STEP_MS);
    return () => { clearInterval(timer); ANCHOR_STOP_EVENTS.forEach(e => window.removeEventListener(e, stop)); };
  }, [anchor]);
}

Object.assign(window, { SECTION_ANCHORS, useSectionAnchor });
