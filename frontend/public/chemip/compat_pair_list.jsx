// 저장 혼촉 매트릭스 · 짝별 판정과 이유(나쁜 짝부터). 고른 짝(selected)은 맨 위에 펼쳐 보인다. 이유 한 줄 = 체계 · 분류 짝 · 설명.

function CompatReason({ r }) {
  const L = SAFETY_LABELS.compat;
  const a = cmClassName(r.system, r.a), b = cmClassName(r.system, r.b);
  return (
    <li className={`sft-reason is-${r.outcome}`}>
      <span className="sft-sym" aria-hidden="true">{L.outcomes[r.outcome].symbol}</span>
      <span className="sft-chip-sys">{L.reasonSystem[r.system]}</span>{" "}
      <b>{tr(a.ko, a.en)} × {tr(b.ko, b.en)}</b>
      {r.system === "un" && r.code ? <span className="muted"> ({L.imdgCode(r.code)})</span> : null}
      {r.note ? <> — {tr(r.note.ko, r.note.en)}</> : null}
    </li>
  );
}

function CompatPair({ p, items, open }) {
  const L = SAFETY_LABELS.compat;
  const A = items[p.i], B = items[p.j];
  return (
    <div className={`sft-pair is-${p.outcome}${open ? " is-selected" : ""}`}>
      <div className="sft-pair-head">
        <span className="sft-sym" aria-hidden="true">{L.outcomes[p.outcome].symbol}</span>
        <span><span className="sft-idx mono">{p.i + 1}</span> {A.name} × <span className="sft-idx mono">{p.j + 1}</span> {B.name}</span>
        <span className={`sft-badge is-${p.outcome}`}>{L.outcomes[p.outcome].short}</span>
      </div>
      {p.reasons.length > 0 && <ul className="sft-reasons">{p.reasons.map((r, k) => <CompatReason key={k} r={r} />)}</ul>}
      {p.outcome === "unknown" && <div className="calc-hint">{L.unknownHint}</div>}
      {p.outcome === "o" && open && <div className="calc-hint">{L.okHint}</div>}
    </div>
  );
}

function CompatPairList({ items, pairs, selected }) {
  const L = SAFETY_LABELS.compat;
  const ranked = cmRankedPairs(pairs);
  const sel = selected ? ranked.find(p => p.i === selected[0] && p.j === selected[1]) : null;
  const rest = ranked.filter(p => p !== sel);
  const shown = rest.filter(p => p.outcome !== "o");
  const okCount = rest.length - shown.length;
  return (
    <div className="panel calc-panel" id="sft-pairs">
      <h3><b>{L.pairsTitle}</b></h3>
      <div className="body sft-pair-list" aria-live="polite">
        {sel && <CompatPair p={sel} items={items} open />}
        {shown.map(p => <CompatPair key={`${p.i}-${p.j}`} p={p} items={items} />)}
        {!sel && shown.every(p => p.outcome === "unknown") && <div className="calc-hint">{L.noBadPairs}</div>}
        {okCount > 0 && <div className="calc-hint">{L.outcomes.o.symbol} {L.outcomes.o.name}: {okCount}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { CompatReason, CompatPair, CompatPairList });
