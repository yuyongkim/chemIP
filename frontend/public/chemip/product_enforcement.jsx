// Product · US enforcement cases — EPA ECHO civil/criminal cases that name this CAS as a pollutant
// (Environment project's ECHO downloads, indexed by scripts/build_echo_cas_index.py).
// Data: /api/integrations/enforcement/{cas} (useEnforcement, 화면에 다가오면 요청). 금액 표기: product_format.jsx.
// 문구: PRODUCT_LABELS.enforcement. 스타일: product_detail.css.

function EnforcementCase({ c }) {
  const EL = PRODUCT_LABELS.enforcement;
  return (
    <div className="pd-case tight">
      <div className="pd-between">
        <b>{c.name}</b>
        {c.penalty_usd > 0 && <span className="tnum pd-penalty">{fmtUsd(c.penalty_usd)}</span>}
      </div>
      <div className="muted pd-item-sub">
        {[c.fiscal_year && `FY${c.fiscal_year}`, c.states, c.statutes, c.type, c.outcome].filter(Boolean).join(" · ")}
      </div>
      {c.violations && <div className="pd-case-line">{EL.violations(c.violations)}</div>}
      {c.summary && <div className="muted pd-case-desc">{c.summary}</div>}
      <a className="mono pd-link-xs" href={c.url} target="_blank" rel="noopener">{EL.echoLink(c.case_number)}</a>
    </div>
  );
}

function EnforcementPanel({ selected }) {
  const ref = React.useRef(null);
  const inView = useInView(ref);
  const cas = selected?.cas_no || "";
  const { data, loading, error } = useEnforcement(cas, inView);
  const [view, setView] = useState("top_penalty");
  const total = data?.total || 0;
  const list = data?.[view] || [];

  const EL = PRODUCT_LABELS.enforcement;
  const ST = PRODUCT_LABELS.status;
  const statusText = !cas ? ST.noCas : !inView ? ST.scrollToLoad : loading ? ST.loading
    : error ? ST.error(error) : data?.available === false ? EL.missing : EL.count(total.toLocaleString("ko-KR"));

  return (
    <section ref={ref} id="enforcement" className="pd-lower">
      <SectionHeading t={EL.heading} meta={`${EL.sourceNote} · ${statusText}`} />

      {inView && !loading && data && total === 0 && (
        <div className="card pd-lower-empty">{data.available === false ? EL.missingBody : EL.noneBody}</div>
      )}

      {total > 0 && (
        <>
          <div className="chem-hdr pd-lower-stats">
            <div className="stats-mini pd-full">
              <IntlStat label={EL.stats.cases.m} value={total.toLocaleString("ko-KR")} sub={EL.fiscalRange(data.years[0], data.years[1])} />
              <IntlStat label={EL.stats.penalized.m} value={data.with_penalty.toLocaleString("ko-KR")} sub={EL.stats.penalized.sub} />
              <IntlStat label={EL.stats.penalties.m} value={fmtUsd(data.penalty_total_usd)} sub={EL.stats.penalties.sub} />
              <IntlStat label={EL.stats.statutes.m} value={Object.keys(data.statutes).length}
                sub={Object.entries(data.statutes).slice(0, 4).map(([k, n]) => `${k} ${n}`).join(" · ")} />
            </div>
          </div>
          <div className="panel">
            <h3>
              <b>{EL.cases}</b>
              <span className="pd-toggle-row">
                {EL.sorts.map(([k, label]) => (
                  <button key={k} className={`chip pd-toggle${view === k ? " on" : ""}`} aria-pressed={view === k} onClick={() => setView(k)}>{label}</button>
                ))}
              </span>
            </h3>
            <div className="body pd-case-list">
              {list.map(c => <EnforcementCase key={c.case_number} c={c} />)}
            </div>
          </div>
          <div className="muted pd-foot-note-sm">{EL.note(data.source)}</div>
        </>
      )}
    </section>
  );
}

Object.assign(window, { EnforcementPanel });
