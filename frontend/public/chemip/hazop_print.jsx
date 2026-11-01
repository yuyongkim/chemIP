// HAZOP 작성기 · 인쇄 / PDF — 누르면 body.hz-printing 을 켜고 기록지 표(포털)만 인쇄한다(calc.css @media print). 경고표지 인쇄와 같은 방식.
// 표 열은 KOSHA GUIDE C-C-37 서식 순서(이탈번호·이탈·원인·결과·현재안전조치·위험도·개선번호·개선권고) + 조치계획(책임·일정·진행).

function HazopPrintSheet({ study }) {
  const L = HAZOP_LABELS;
  const C = L.cols;
  return (
    <div className="hz-print">
      <div className="hz-print-head">
        <b>{L.print.head(study.name, study.date)}</b>
        {study.drawing && <span> · {L.study.drawing} {study.drawing}</span>}
        {study.team && <div>{L.study.team}: {study.team}</div>}
      </div>
      {study.nodes.map(node => (
        <section key={node.id} className="hz-print-node">
          <div className="hz-print-node-head">
            <b>{C.node} {node.no}</b> {node.name}
            {node.intent && <div>{L.node.intent}: {node.intent}</div>}
            {node.drawing && <div>{L.node.drawing}: {node.drawing}</div>}
          </div>
          <table className="hz-print-table">
            <thead>
              <tr>{["no", "deviation", "causes", "consequences", "safeguards", "risk", "recNo", "rec", "owner", "due"].map(k => <th key={k}>{C[k]}</th>)}</tr>
            </thead>
            <tbody>
              {node.rows.map((r, i) => {
                const score = hzRiskScore(r, study.risk);
                return (
                  <tr key={r.id}>
                    <td className="mono">{hzRowNo(node, i)}</td>
                    <td>{r.deviation}</td>
                    <td>{r.causes}</td>
                    <td>{r.consequences}</td>
                    <td>{r.safeguards}</td>
                    <td className="mono">{score == null ? "" : `${r.S}×${r.L}=${score} ${L.risk.bands[hzRiskBand(score, study.risk)]}`}</td>
                    <td className="mono">{r.recNo}</td>
                    <td>{r.rec}</td>
                    <td>{r.owner}</td>
                    <td className="mono">{r.due}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
      <div className="hz-print-foot">{L.print.footer}</div>
    </div>
  );
}

function HazopPrintButton({ study }) {
  const T = HAZOP_LABELS.toolbar;
  const [printing, setPrinting] = React.useState(false);
  React.useEffect(() => {
    if (!printing) return undefined;
    const root = document.documentElement;
    const theme = root.getAttribute("data-theme");
    const restore = () => {
      document.body.classList.remove("hz-printing");
      if (theme) root.setAttribute("data-theme", theme);
    };
    const done = () => { restore(); setPrinting(false); };
    if (theme === "dark") root.removeAttribute("data-theme");
    document.body.classList.add("hz-printing");
    window.addEventListener("afterprint", done);
    const t = setTimeout(() => window.print(), 50);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", done); restore(); };
  }, [printing]);
  return (
    <>
      <button type="button" className="btn sm" onClick={() => setPrinting(true)}><Icon name="doc" size={12} /> {T.print}</button>
      {printing && ReactDOM.createPortal(<div className="hz-print-root"><HazopPrintSheet study={study} /></div>, document.body)}
    </>
  );
}

Object.assign(window, { HazopPrintSheet, HazopPrintButton });
