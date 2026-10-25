// Trade controls · 중소기업 체크리스트 — "체크리스트 인쇄/PDF"(인쇄 전용 배치, checklist_print.css) + "CSV 내려받기".
// 행 만들기: trade_controls_checklist_helpers.jsx, 문구: trade_controls_checklist_labels.jsx.

function tcChecklistHeading(data, selected, direction, country) {
  const L = TC_CHECKLIST_LABELS;
  const name = selected?.name || selected?.name_en || data.substance?.name_ko || data.cas;
  const phrase = TRADE_LABELS.directions[direction]?.phrase(name, tcCountryName(country)) || "";
  return [
    [L.substance, [data.substance?.name_ko, data.substance?.name_en].filter(Boolean).join(" / ") || name],
    [L.cas, data.cas],
    [L.situation, phrase],
    [L.generated, tcTodayKst()],
    [L.retrieved, tcChecklistRetrieved(data).join(", ")],
  ];
}

function ChecklistPrint({ heading, groups }) {
  const L = TC_CHECKLIST_LABELS;
  return (
    <div className="tc-print-root">
      <h1 className="tcp-title">{L.docTitle}</h1>
      <dl className="tcp-heading">
        {heading.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v || "—"}</dd></React.Fragment>)}
      </dl>
      <div className="tcp-disclaimer"><b>{L.disclaimerTitle}</b> {L.disclaimer}</div>
      {groups.map(g => (
        <section key={g.key} className="tcp-group">
          <h2>{g.title} <span>({g.rows.length})</span></h2>
          {g.rows.length === 0 ? <p className="tcp-empty">{L.empty}</p> : (
            <table className="tcp-table">
              <colgroup><col className="tcp-col-check" /><col className="tcp-col-item" /><col className="tcp-col-detail" /><col className="tcp-col-basis" /></colgroup>
              <thead>
                <tr><th className="tcp-check">{L.check}</th><th>{L.columns.item}</th><th>{L.columns.detail}</th><th>{L.columns.basis}</th></tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="tcp-check">☐</td>
                    <td className="tcp-item">{r.title}</td>
                    <td>{tcChecklistDetailPairs(r).map(([k, v]) => <div key={k}><span className="tcp-k">{k}</span> {v}</div>)}</td>
                    <td>{r.basis}{r.url && <div className="tcp-url">{r.url}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
      <div className="tcp-disclaimer">{L.disclaimer}</div>
      <div className="tcp-footer">{L.footer}</div>
    </div>
  );
}

function tcDownloadText(fileName, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ChecklistExport({ data, selected, direction, country }) {
  const L = TC_CHECKLIST_LABELS;
  const [printing, setPrinting] = React.useState(false);
  const heading = tcChecklistHeading(data, selected, direction, country);
  const groups = tcChecklistGroups(data);

  React.useEffect(() => {
    if (!printing) return undefined;
    // 어두운 테마여도 종이에는 밝은 토큰으로 찍는다(인쇄가 끝나면 되돌린다).
    const root = document.documentElement;
    const theme = root.getAttribute("data-theme");
    const restore = () => {
      document.body.classList.remove("tc-printing");
      if (theme) root.setAttribute("data-theme", theme);
    };
    const done = () => { restore(); setPrinting(false); };
    if (theme === "dark") root.removeAttribute("data-theme");
    document.body.classList.add("tc-printing");
    window.addEventListener("afterprint", done);
    const t = setTimeout(() => window.print(), 50); // 포털이 그려진 뒤 인쇄 창을 연다
    return () => { clearTimeout(t); window.removeEventListener("afterprint", done); restore(); };
  }, [printing]);

  const downloadCsv = () => tcDownloadText(tcChecklistFileName(data, "csv"), tcChecklistCsv({ heading, groups }), "text/csv;charset=utf-8");

  return (
    <div className="tc-checklist-bar">
      <button className="btn sm primary" onClick={() => setPrinting(true)}><Icon name="doc" size={12} /> {L.printButton}</button>
      <button className="btn sm" onClick={downloadCsv}><Icon name="down" size={12} /> {L.csvButton}</button>
      <span className="ui-hint">{L.hint}</span>
      {printing && ReactDOM.createPortal(<ChecklistPrint heading={heading} groups={groups} />, document.body)}
    </div>
  );
}

Object.assign(window, { ChecklistExport, ChecklistPrint });
