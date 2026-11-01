// Product · Incident cases × design verification — accidents involving this CAS (Chem_Eng incidents.db)
// and the EPC engineering design discipline that verifies the failed equipment.
// Data: /api/integrations/incidents/{cas}. Equipment→discipline table: backend/integrations/equipment_disciplines.py.

const INCIDENT_SOURCE_LABELS = { csb: "CSB", emars: "eMARS", kosha: "KOSHA", nics: "NICS", rmp: "EPA RMP" };

function DisciplineCard({ d }) {
  return (
    <div className="card" style={{ padding: 12, fontSize: 12, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <b>{d.label}</b><span className="tnum">{d.incidents.toLocaleString("ko-KR")}건</span>
      </div>
      <div className="muted mono" style={{ fontSize: 10, marginTop: 2 }}>{d.standards}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
        {d.equipment.map(e => <span key={e} className="chip" style={{ fontSize: 10 }}>{e}</span>)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
        <a href={d.epc_url} target="_blank" rel="noopener" className="mono" style={{ fontSize: 11 }}>EPC 설계 검증 ↗</a>
        {d.experience_keys.length > 0 && (
          <a href="https://chemeng.yule.pics" target="_blank" rel="noopener" className="mono" style={{ fontSize: 11 }}>
            Chem_Eng 경험: {d.experience_keys.join("·")} ↗
          </a>
        )}
      </div>
    </div>
  );
}

function IncidentCase({ c, first }) {
  const harm = [c.fatalities ? `사망 ${c.fatalities}` : "", c.injuries ? `부상 ${c.injuries}` : ""].filter(Boolean).join(" · ");
  return (
    <div style={{ fontSize: 12, padding: "12px 0", borderTop: first ? "none" : "1px dashed var(--border)", overflowWrap: "anywhere" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <b>{c.title || c.id}</b>
        <span className="muted mono" style={{ fontSize: 10, whiteSpace: "nowrap" }}>{INCIDENT_SOURCE_LABELS[c.source] || c.source}</span>
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
        {[c.date, c.country, c.accident_type, harm].filter(Boolean).join(" · ")}
      </div>
      {c.equipment.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {c.equipment.map(e => (
            <span key={e.name} className={`chip ${e.discipline ? "accent" : ""}`} style={{ fontSize: 10 }}>
              {e.name}{e.discipline ? ` → ${e.discipline}` : ""}
            </span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 6, lineHeight: 1.55 }}>{c.summary}</div>
      {c.causes.length > 0 && <div className="muted" style={{ marginTop: 4 }}>원인: {c.causes.join(" / ")}</div>}
      <div className="muted mono" style={{ fontSize: 10, marginTop: 4 }}>
        {c.url && <a href={c.url} target="_blank" rel="noopener">출처 ↗</a>}
        {c.recommendations ? ` · 권고 ${c.recommendations}건` : ""}
        {` · ${c.attribution || c.license}`}
      </div>
    </div>
  );
}

function IncidentPanel({ selected }) {
  const ref = React.useRef(null);
  const inView = useInView(ref);
  const cas = selected?.cas_no || "";
  const { data, loading, error } = useIncidents(cas, inView);
  const total = data?.total || 0;

  const IL = PRODUCT_LABELS.incidents;
  const ST = PRODUCT_LABELS.status;
  const statusText = !cas ? ST.noCas : !inView ? ST.scrollToLoad : loading ? ST.loading
    : error ? ST.error(error) : data?.available === false ? IL.offline : IL.count(total.toLocaleString("ko-KR"));

  return (
    <section ref={ref} id="incidents" style={{ marginTop: 28 }}>
      <SectionHeading t={IL.heading} meta={`${IL.sourceNote} · ${statusText}`} />

      {inView && !loading && data && total === 0 && (
        <div className="card" style={{ padding: 20, color: "var(--fg-muted)", fontSize: 13 }}>
          {data.available === false ? "사고 사례 DB에 연결하지 못했습니다." : "수집된 사고 사례(CSB·eMARS·KOSHA·NICS·EPA RMP)에 이 물질이 없습니다."}
        </div>
      )}

      {total > 0 && (
        <>
          <div className="chem-hdr" style={{ marginBottom: 14 }}>
            <div className="stats-mini" style={{ width: "100%" }}>
              <IntlStat label={IL.stats.incidents.m} value={total.toLocaleString("ko-KR")} sub={IL.stats.incidents.sub} />
              <IntlStat label={IL.stats.fatalities.m} value={data.fatalities.toLocaleString("ko-KR")} sub={IL.stats.fatalities.sub} />
              <IntlStat label={IL.stats.injuries.m} value={data.injuries.toLocaleString("ko-KR")} sub={IL.stats.injuries.sub} />
              <IntlStat label={IL.stats.sources.m} value={Object.keys(data.by_source).length}
                sub={Object.entries(data.by_source).map(([k, n]) => `${INCIDENT_SOURCE_LABELS[k] || k} ${n}`).join(" · ")} />
            </div>
          </div>

          <div style={{ fontSize: 12, marginBottom: 8 }}>
            <b>사고 난 설비 → 설계 검증 분야</b>
            <span className="muted"> · 사고 기록의 설비를 그 설비를 설계·검사하는 기준에 연결했습니다</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 14 }}>
            {data.disciplines.map(d => <DisciplineCard key={d.key} d={d} />)}
          </div>

          <div className="panel">
            <h3><b>사례</b> <span className="muted">출처별 최신순 {data.cases.length}건 · RMP는 정형 기록만 있어 통계에만 반영</span></h3>
            <div className="body" style={{ maxHeight: 620, overflowY: "auto", paddingTop: 4 }}>
              {data.cases.map((c, i) => <IncidentCase key={c.id} c={c} first={i === 0} />)}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

Object.assign(window, { IncidentPanel });
