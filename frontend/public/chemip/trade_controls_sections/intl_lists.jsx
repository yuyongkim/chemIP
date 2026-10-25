// Trade controls · 상대국 법령 목록 — intl_lists/ memberships (EU REACH·PIC·POPs, US TSCA, CN 危险化学品 …).
// Used inside DestinationSection: dest.intl_lists when a country is picked, data.intl_lists (all countries) otherwise.

function IntlListsBlock({ lists, showCountry = false }) {
  const S = TRADE_LABELS.sections.intlLists;
  const items = lists || [];
  return (
    <div className="tc-subblock">
      <div className="tc-item-head">
        <b>{S.title}</b>
        <span className="tc-meta">{TRADE_LABELS.sections.lists.count(items.filter(l => !l.absent).length)}</span>
      </div>
      {items.length === 0 && <EmptyState>{S.empty}</EmptyState>}
      {items.map(l => (
        <div key={l.list_id || l.title} className="tc-item">
          <div className="tc-item-head">
            <span>{showCountry && <Badge>{tcCountryName(l.jurisdiction)}</Badge>} <b>{l.title || l.list_id}</b></span>
            <span className="tc-meta">{[l.list_id, l.source_version].filter(Boolean).join(" · ")}</span>
          </div>
          {l.absent && <div className="tc-line"><Badge tone="hazard">{S.absent}</Badge> {l.absence_note}</div>}
          {[...(l.entries || []), ...(l.family_entries || [])].map((e, i) => (
            <div key={i} className="tc-line">
              <span>{tcEntryName(e)}</span>
              {e.detail && <span className="tc-muted"> · {e.detail}</span>}
            </div>
          ))}
          {l.obligation_for_kr_exporter && (
            <div className="tc-field"><span className="tc-field-k">{S.obligation}</span><span>{l.obligation_for_kr_exporter}</span></div>
          )}
          <div className="tc-line tc-muted">{l.legal_basis}<SourceLink url={l.source_url} /></div>
          {l.license && <div className="tc-line tc-meta">{S.license} {l.license}</div>}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { IntlListsBlock });
