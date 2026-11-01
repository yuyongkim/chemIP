// Product · Incident cases × design verification — accidents involving this CAS (Chem_Eng incidents.db)
// and the EPC engineering design discipline that verifies the failed equipment.
// Data: /api/integrations/incidents/{cas} (useIncidents, 화면에 다가오면 요청). Equipment→discipline table:
// backend/integrations/equipment_disciplines.py. 문구: PRODUCT_LABELS.incidents. 스타일: product_detail.css.

const CHEMENG_URL = "https://chemeng.yule.pics";

function DisciplineCard({ d }) {
  const IL = PRODUCT_LABELS.incidents;
  return (
    <div className="card pd-disc-card">
      <div className="pd-between">
        <b>{PRODUCT_LABELS.disciplineNames?.[d.key] || d.label}</b><span className="tnum">{IL.discCount(d.incidents.toLocaleString("ko-KR"))}</span>
      </div>
      <div className="muted mono pd-mini">{d.standards}</div>
      <div className="pd-tag-row">
        {d.equipment.map(e => <span key={e} className="chip pd-chip-10">{e}</span>)}
      </div>
      <div className="pd-link-row">
        <a href={d.epc_url} target="_blank" rel="noopener" className="mono pd-link-11">{IL.epcVerify}</a>
        {d.experience_keys.length > 0 && (
          <a href={CHEMENG_URL} target="_blank" rel="noopener" className="mono pd-link-11">{IL.experience(d.experience_keys.map(k => IL.experienceNames?.[k] || k).join("·"))}</a>
        )}
      </div>
    </div>
  );
}

function IncidentCase({ c }) {
  const IL = PRODUCT_LABELS.incidents;
  const harm = [c.fatalities ? IL.fatal(c.fatalities) : "", c.injuries ? IL.injured(c.injuries) : ""].filter(Boolean).join(" · ");
  return (
    <div className="pd-case">
      <div className="pd-between">
        <b>{c.title || c.id}</b>
        <span className="muted mono pd-src-tag">{IL.sources[c.source] || c.source}</span>
      </div>
      <div className="muted pd-item-sub">
        {[c.date, c.country, c.accident_type, harm].filter(Boolean).join(" · ")}
      </div>
      {c.equipment.length > 0 && (
        <div className="pd-tag-row">
          {c.equipment.map(e => (
            <span key={e.name} className={`chip ${e.discipline ? "accent" : ""} pd-chip-10`}>
              {e.name}{e.discipline ? ` → ${e.discipline}` : ""}
            </span>
          ))}
        </div>
      )}
      <div className="pd-case-summary">{c.summary}</div>
      {c.causes.length > 0 && <div className="muted pd-case-line">{IL.causes(c.causes.join(" / "))}</div>}
      <div className="muted mono pd-case-foot">
        {c.url && <a href={c.url} target="_blank" rel="noopener">{IL.sourceLink}</a>}
        {c.recommendations ? IL.recommendations(c.recommendations) : ""}
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
    <section ref={ref} id="incidents" className="pd-lower">
      <SectionHeading t={IL.heading} meta={`${IL.sourceNote} · ${statusText}`} />

      {inView && !loading && data && total === 0 && (
        <div className="card pd-lower-empty">{data.available === false ? IL.offlineBody : IL.noneBody}</div>
      )}

      {total > 0 && (
        <>
          <div className="chem-hdr pd-lower-stats">
            <div className="stats-mini pd-full">
              <IntlStat label={IL.stats.incidents.m} value={total.toLocaleString("ko-KR")} sub={IL.stats.incidents.sub} />
              <IntlStat label={IL.stats.fatalities.m} value={data.fatalities.toLocaleString("ko-KR")} sub={IL.stats.fatalities.sub} />
              <IntlStat label={IL.stats.injuries.m} value={data.injuries.toLocaleString("ko-KR")} sub={IL.stats.injuries.sub} />
              <IntlStat label={IL.stats.sources.m} value={Object.keys(data.by_source).length}
                sub={Object.entries(data.by_source).map(([k, n]) => `${IL.sources[k] || k} ${n}`).join(" · ")} />
            </div>
          </div>

          <div className="pd-disc-intro">
            <b>{IL.discTitle}</b>
            <span className="muted">{IL.discNote}</span>
          </div>
          <div className="pd-disc-grid">
            {data.disciplines.map(d => <DisciplineCard key={d.key} d={d} />)}
          </div>

          <div className="panel">
            <h3><b>{IL.cases}</b> <span className="muted">{IL.casesMeta(data.cases.length)}</span></h3>
            <div className="body pd-case-list tall">
              {data.cases.map(c => <IncidentCase key={c.id} c={c} />)}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

Object.assign(window, { IncidentPanel });
