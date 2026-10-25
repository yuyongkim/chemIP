// Trade controls · 한눈에 보기 — 국내 법령 수 · 인허가/신고 건수 · 수입(수출) 시 의무 · 수출 통제 해당 여부 · HS.
// 카드를 누르면 해당 섹션(TRADE_ANCHORS)으로 스크롤한다. 숫자는 tcSummary(trade_controls_helpers.jsx).

function tcScrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function TcSummaryCard({ anchor, label, value, sub, tone = "", ready = true }) {
  const S = TRADE_LABELS.summary;
  return (
    <button type="button" className={`tc-sum-card${tone ? ` ${tone}` : ""}`} onClick={() => tcScrollTo(anchor)} title={S.jump}>
      <span className="tc-sum-label">{label}</span>
      <span className="tc-sum-value">{ready ? value : S.preparing}</span>
      {ready && sub ? <span className="tc-sum-sub">{sub}</span> : null}
    </button>
  );
}

function TradeSummary({ data, direction }) {
  const S = TRADE_LABELS.summary;
  const A = TRADE_ANCHORS;
  const m = tcSummary(data);
  const kinds = m.permits.kinds.slice(0, 4).map(([k, n]) => `${k} ${n}`).join(" · ");
  // 지금 방향에 적용되지 않는 목록에는 "수출 시" 처럼 적용 방향을 붙인다(목록 directions 가 비면 양방향).
  const controls = m.controls.lists.map(c => {
    const ds = c.directions.map(d => String(d).toLowerCase());
    const here = !ds.length || ds.includes(direction) || ds.includes("both");
    return { name: c.name, note: here ? "" : ds.map(d => S.controls.otherDirection[d] || d).join("·") };
  });
  return (
    <div className="tc-summary" aria-label={S.title}>
      <TcSummaryCard anchor={A.krLaw} ready={m.laws.ready} label={S.laws.label}
        value={S.laws.value(m.laws.n)} sub={m.laws.lists ? S.laws.sub(m.laws.lists) : ""} tone={m.laws.n ? "on" : ""} />
      <TcSummaryCard anchor={A.permits} ready={m.permits.ready} label={S.permits.label}
        value={m.permits.n ? S.permits.value(m.permits.n) : S.permits.none} sub={kinds} tone={m.permits.n ? "on" : ""} />
      <TcSummaryCard anchor={A.obligations} ready={m.obligations.ready} label={S.obligations.label[direction] || S.obligations.label.import}
        value={m.obligations.n ? S.obligations.value(m.obligations.n) : S.obligations.none}
        sub={m.obligations.customs ? S.obligations.customs(m.obligations.customs) : ""} tone={m.obligations.customs ? "alert" : m.obligations.n ? "on" : ""} />
      <TcSummaryCard anchor={A.lists} ready={m.controls.ready} label={S.controls.label}
        value={controls.length ? S.controls.yes(controls.length) : S.controls.no}
        sub={controls.length ? controls.map(c => c.note ? `${c.name}(${c.note})` : c.name).join(" · ") : S.controls.sub}
        tone={controls.length ? "alert" : ""} />
      <TcSummaryCard anchor={A.hs} label={S.hs}
        value={m.hs.length ? m.hs.map(tcHsDots).join(" · ") : S.hsNone} tone={m.hs.length ? "on" : ""} />
    </div>
  );
}

Object.assign(window, { TradeSummary });
