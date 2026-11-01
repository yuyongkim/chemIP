// 물질 상세 · 텍사스 배출사고 보고 — TCEQ Air Emission Event Reports(공개) 중 이 CAS 가 적힌 사고(Environment 가공본,
// scripts/build_tceq_event_index.py 가 색인). 배출점 종류 분포는 EPC 설계 분야에 잇되 원인으로 보이지 않는다.
// 자료: /api/integrations/tceq-events/{cas} (useTceqEvents, 화면에 다가오면 요청, 정적 tx/<CAS>.json 먼저).
// 문구: tceq_events_labels.jsx. 순수 함수: product_tceq_events_helpers.jsx. 스타일: product_detail.css(.pd-*).

function TceqKindRow({ r }) {
  const L = TCEQ_EVENTS_LABELS;
  return (
    <div className="series-row">
      <div>
        <div className="pd-series-name">{r.label}</div>
        <div className="pd-track"><div className="pd-track-fill" style={{ "--w": `${r.p * 100}%` }} /></div>
        <div className="muted pd-mini">
          {r.discipline
            ? <a className="mono pd-link-xs" href={r.discipline.epc_url} target="_blank" rel="noopener">{L.epcLink(PRODUCT_LABELS.disciplineNames?.[r.discipline.key] || r.discipline.label)}</a>
            : L.noDiscipline}
        </div>
      </div>
      <div className="mono tnum muted pd-series-val">{L.kindCount(r.n.toLocaleString("ko-KR"), r.pct)}</div>
    </div>
  );
}

function TceqEvent({ e, kindLabels }) {
  const L = TCEQ_EVENTS_LABELS;
  return (
    <div className="pd-case tight">
      <div className="pd-between">
        <b>{e.facility || e.incident_number}</b>
        {e.qty != null && <span className="tnum pd-penalty">{L.qty(tceqFmtLbs(e.qty))}</span>}
      </div>
      <div className="muted pd-item-sub">
        {[e.date, e.county, e.duration, e.point_kinds.map(k => L.pointKindNames?.[k] || kindLabels[k] || k).join("·")].filter(Boolean).join(" · ")}
      </div>
      {e.cause && <div className="muted pd-case-desc">{L.causeLabel}{e.cause}</div>}
      <a className="mono pd-link-xs" href={e.url} target="_blank" rel="noopener">{L.eventLink(e.incident_number)}</a>
    </div>
  );
}

function TceqEventsPanel({ selected }) {
  const ref = React.useRef(null);
  const inView = useInView(ref);
  const cas = selected?.cas_no || "";
  const { data, loading, error } = useTceqEvents(cas, inView);
  const total = data?.total || 0;

  const L = TCEQ_EVENTS_LABELS;
  const ST = PRODUCT_LABELS.status;
  const statusText = !cas ? ST.noCas : !inView ? ST.scrollToLoad : loading ? ST.loading
    : error ? ST.error(error) : data?.available === false ? L.missing : L.count(total.toLocaleString("ko-KR"));
  const kinds = total > 0 ? tceqKindRows(data) : [];

  return (
    <section ref={ref} id="tceq-events" className="pd-lower">
      <SectionHeading t={L.heading} meta={`${L.sourceNote} · ${statusText}`} />

      {inView && !loading && error && <ErrorState message={error} card />}
      {inView && !loading && data && total === 0 && (
        <EmptyState card>{data.available === false ? L.missingBody : L.noneBody}</EmptyState>
      )}

      {total > 0 && (
        <>
          <div className="chem-hdr pd-lower-stats">
            <div className="stats-mini pd-full">
              <IntlStat label={L.stats.events.m} value={total.toLocaleString("ko-KR")} sub={L.stats.events.sub(data.years[0], data.years[1])} />
              <IntlStat label={L.stats.lbs.m} value={L.qty(tceqFmtLbs(data.qty_total_lbs))} sub={L.stats.lbs.sub} />
              <IntlStat label={L.stats.counties.m} value={Object.keys(data.counties).length}
                sub={L.stats.counties.sub(Object.entries(data.counties))} />
              <IntlStat label={L.stats.points.m} value={tceqPointTotal(data).toLocaleString("ko-KR")} sub={L.stats.points.sub} />
            </div>
          </div>
          <SectionPanel title={L.kindsTitle} aside={L.kindsAside}>
            {kinds.map(r => <TceqKindRow key={r.kind} r={r} />)}
          </SectionPanel>
          <SectionPanel title={L.recentTitle} aside={L.recentAside(data.recent.length)}>
            <div className="pd-case-list">
              {data.recent.map(e => <TceqEvent key={e.incident_number} e={e} kindLabels={data.point_kind_labels || {}} />)}
            </div>
          </SectionPanel>
          <div className="muted pd-foot-note-sm">
            {L.note(data.source)} {(L.notes.length ? L.notes : data.notes || []).join(" ")}{" "}
            {data.info_url && <SourceLink url={data.info_url} label={L.infoLink} />}
          </div>
        </>
      )}
    </section>
  );
}

Object.assign(window, { TceqEventsPanel });
