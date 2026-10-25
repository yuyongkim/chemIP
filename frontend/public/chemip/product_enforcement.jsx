// Product · US enforcement cases — EPA ECHO civil/criminal cases that name this CAS as a pollutant
// (Environment project's ECHO downloads, indexed by scripts/build_echo_cas_index.py).
// Data: /api/integrations/enforcement/{cas}.

function fmtUsd(v) {
  const n = Number(v || 0);
  if (n >= 1e6) return `$${(n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  if (n >= 1e3) return `$${(n / 1e3).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
  return `$${n.toLocaleString("en-US")}`;
}

function EnforcementCase({ c, first }) {
  return (
    <div style={{ fontSize: 12, padding: "10px 0", borderTop: first ? "none" : "1px dashed var(--border)", overflowWrap: "anywhere" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <b>{c.name}</b>
        {c.penalty_usd > 0 && <span className="tnum" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{fmtUsd(c.penalty_usd)}</span>}
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
        {[c.fiscal_year && `FY${c.fiscal_year}`, c.states, c.statutes, c.type, c.outcome].filter(Boolean).join(" · ")}
      </div>
      {c.violations && <div style={{ marginTop: 4 }}>위반: {c.violations}</div>}
      {c.summary && <div className="muted" style={{ marginTop: 4, lineHeight: 1.5 }}>{c.summary}</div>}
      <a className="mono" style={{ fontSize: 10 }} href={c.url} target="_blank" rel="noopener">ECHO {c.case_number} ↗</a>
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
    <section ref={ref} id="enforcement" style={{ marginTop: 28 }}>
      <SectionHeading t={EL.heading} meta={`${EL.sourceNote} · ${statusText}`} />

      {inView && !loading && data && total === 0 && (
        <div className="card" style={{ padding: 20, color: "var(--fg-muted)", fontSize: 13 }}>
          {data.available === false ? "집행 사건 색인이 없습니다." : "EPA 집행 사건 중 이 물질을 오염물질로 적은 사건이 없습니다."}
        </div>
      )}

      {total > 0 && (
        <>
          <div className="chem-hdr" style={{ marginBottom: 14 }}>
            <div className="stats-mini" style={{ width: "100%" }}>
              <IntlStat label={EL.stats.cases.m} value={total.toLocaleString("ko-KR")} sub={`FY${data.years[0]}–${data.years[1]}`} />
              <IntlStat label={EL.stats.penalized.m} value={data.with_penalty.toLocaleString("ko-KR")} sub={EL.stats.penalized.sub} />
              <IntlStat label={EL.stats.penalties.m} value={fmtUsd(data.penalty_total_usd)} sub={EL.stats.penalties.sub} />
              <IntlStat label={EL.stats.statutes.m} value={Object.keys(data.statutes).length}
                sub={Object.entries(data.statutes).slice(0, 4).map(([k, n]) => `${k} ${n}`).join(" · ")} />
            </div>
          </div>
          <div className="panel">
            <h3>
              <b>사건</b>
              <span style={{ display: "flex", gap: 6 }}>
                {[["top_penalty", "벌금 큰 순"], ["recent", "최근 순"]].map(([k, label]) => (
                  <button key={k} className="chip" aria-pressed={view === k} onClick={() => setView(k)}
                    style={{ cursor: "pointer", fontSize: 11, fontWeight: view === k ? 700 : 500,
                      background: view === k ? "var(--accent-soft)" : undefined }}>{label}</button>
                ))}
              </span>
            </h3>
            <div className="body" style={{ maxHeight: 560, overflowY: "auto", paddingTop: 4 }}>
              {list.map((c, i) => <EnforcementCase key={c.case_number} c={c} first={i === 0} />)}
            </div>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{data.source}. 사건에 적힌 오염물질 기준이라 이 물질이 주된 위반 사유가 아닐 수 있습니다.</div>
        </>
      )}
    </section>
  );
}

Object.assign(window, { EnforcementPanel });
