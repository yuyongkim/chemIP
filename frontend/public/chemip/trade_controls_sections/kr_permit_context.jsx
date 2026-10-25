// Trade controls · 실제 통합허가 사례 — 이 물질(군) 배출기준이 설정된 사업장 수·기준 분포·업종·처리기간·TMS 배출량.
// Data: useKrPermitContext (api.jsx) → /api/integrations/kr-permit-context/{cas}. 문구: trade_controls_permit_context_labels.jsx,
// 순수 함수: trade_controls_permit_context_helpers.jsx. 한 건 카드: kr_permit_context_entry.jsx, 배출량: kr_permit_context_emissions.jsx.

function KrPermitContextSection({ cas }) {
  const L = KR_PERMIT_CONTEXT_LABELS;
  const { data, loading, error } = useKrPermitContext(cas);
  const entries = data?.entries || [];
  const overall = kpcOverallDuration(data, L.durationPostType);
  const byIndustry = kpcIndustryDurations(data, L.durationPostType, L.maxDurationIndustries);
  const attr = data?.attribution || {};
  const ready = data && data.available !== false;
  return (
    <SectionPanel title={L.title} aside={ready && entries.length ? L.count(entries.length) : ""}>
      <div className="ui-hint">{L.hint}</div>
      {loading && <EmptyState>{L.loading}</EmptyState>}
      {!loading && error && <ErrorState message={error} />}
      {!loading && data && data.available === false && <EmptyState kind="preparing">{L.unavailable}</EmptyState>}
      {ready && entries.length === 0 && <EmptyState>{L.empty}</EmptyState>}
      {entries.map(e => <KrPermitContextEntry key={e.entity} entry={e} />)}
      {ready && <KrPermitContextEmissions emissions={data.emissions} />}
      {ready && overall && (
        <div className="tc-subblock">
          <div className="tc-item-title">{L.durationTitle}</div>
          <div className="tc-line">{L.durationOverall(overall.post_type, kpcNum(overall.median), overall.n, kpcNum(overall.p25), kpcNum(overall.p75))}</div>
          {byIndustry.length > 0 && (
            <div className="tc-field">
              <span className="tc-field-k">{L.durationIndustry}</span>
              <span>{byIndustry.map(d => L.durationIndustryItem(d.industry, kpcNum(d.median), d.n)).join(" · ")}</span>
            </div>
          )}
          <div className="ui-hint">{L.durationNote}</div>
        </div>
      )}
      {ready && (
        <div className="tc-sources">
          <span className="tc-meta">{L.sourceTitle}:</span>
          {L.sources.map(s => <SourceLink key={s.key} url={attr[s.key]} label={`${s.label} ↗`} />)}
          {attr.retrieved && <div className="ui-hint">{L.retrieved(attr.retrieved)}</div>}
        </div>
      )}
    </SectionPanel>
  );
}

Object.assign(window, { KrPermitContextSection });
