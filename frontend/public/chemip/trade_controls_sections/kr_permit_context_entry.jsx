// 실제 통합허가 사례 · 물질(또는 물질군) 한 건 — 사업장 수, 배출기준 분포, 업종, 허가 사례 링크.
// entry: kr_permit_context_store._entry() 결과. 문구: KR_PERMIT_CONTEXT_LABELS.

function KrPermitContextEntry({ entry }) {
  const L = KR_PERMIT_CONTEXT_LABELS;
  const p = entry.primary;
  const relationText = entry.relation === "direct" ? L.relation.direct
    : entry.relation === "family_parent" ? L.relation.family_parent(entry.label)
    : L.relation.related(entry.label, entry.expressed_as);
  const others = kpcOtherDistributions(entry);
  const industries = kpcTopIndustries(entry, L.maxIndustries);
  return (
    <div className="tc-item">
      <div className="tc-item-head">
        <span className="tc-item-title">{entry.label}</span>
        <Badge tone={entry.relation === "direct" ? "accent" : ""} title={L.relationHint[entry.relation] || ""}>{relationText}</Badge>
      </div>
      <div className="tc-line">
        {L.sites(entry.n_sites, entry.n_outlets)}
        {L.years(entry.first_year, entry.latest_year) && <span className="tc-muted"> · {L.years(entry.first_year, entry.latest_year)}</span>}
      </div>
      {p && (
        <div className="tc-line">
          <b>{L.median(kpcNum(p.median), kpcUnitText(p))}</b>
          <span className="tc-muted"> · {L.range(kpcNum(p.min), kpcNum(p.max))} · {L.iqr(kpcNum(p.p25), kpcNum(p.p75))} · {L.rows(p.n_rows)}</span>
        </div>
      )}
      {others.length > 0 && (
        <div className="tc-field">
          <span className="tc-field-k">{L.otherUnits}</span>
          <span>{others.map(d => `${kpcNum(d.median)} ${kpcUnitText(d)} (${L.rows(d.n_rows)})`).join(" · ")}</span>
        </div>
      )}
      {industries.length > 0 && (
        <div className="tc-field">
          <span className="tc-field-k">{L.industries}</span>
          <span>{industries.map(i => L.industryItem(kpcIndustryName(i.industry), i.n_sites, i.median !== null && p ? `${kpcNum(i.median)} ${p.unit}` : "")).join(" · ")}</span>
        </div>
      )}
      {entry.relation !== "direct" && L.relationHint[entry.relation] && <div className="tc-line tc-muted">{L.relationHint[entry.relation]}</div>}
      {entry.samples?.length > 0 && (
        <Collapsible summary={L.samples(entry.samples.length)}>
          {entry.samples.map(s => (
            <div key={s.post_id} className="tc-line">
              {s.site_name} <span className="tc-muted">
                · {kpcIndustryName(s.industry)} · {s.post_type} · {s.permit_date ? L.sampleDate.permit(s.permit_date) : L.sampleDate.post(s.post_date)}
                {s.limits ? ` · ${s.limits}` : ""}{s.decision_no ? ` · ${L.sampleDecision(s.decision_no)}` : ""}
              </span>
              <SourceLink url={s.url} label={L.sampleLink} />
            </div>
          ))}
        </Collapsible>
      )}
      {entry.names_seen?.length > 0 && <div className="tc-tags"><span className="tc-meta">{L.namesSeen}: {entry.names_seen.join(" / ")}</span></div>}
    </div>
  );
}

Object.assign(window, { KrPermitContextEntry });
