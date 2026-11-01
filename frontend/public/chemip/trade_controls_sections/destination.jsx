// Trade controls · 상대국 — the counterpart country's listings + INTL conventions, its law lists (IntlListsBlock,
// intl_lists.jsx), and KOTRA import restrictions (export only). Without a country: every country's law lists.

function KotraBlock({ kotra, unavailable, terms }) {
  const S = TRADE_LABELS.sections.kotra;
  // 정적 자료로 조립한 화면(서버 꺼짐)에는 KOTRA 결과가 없다. 없다고 오해하지 않게 연결 안내를 보인다.
  if (!kotra && unavailable) {
    return (
      <div className="tc-subblock">
        <div className="tc-item-head"><b>{S.title}</b></div>
        <EmptyState kind="error">{S.offline}</EmptyState>
      </div>
    );
  }
  if (!kotra) return null;
  const items = kotra.items || [];
  return (
    <div className="tc-subblock">
      <div className="tc-item-head">
        <b>{S.title}</b>
        {kotra.query_used && <span className="tc-meta">{S.query(kotra.query_used)}</span>}
      </div>
      {kotra.error && <EmptyState kind="error">{S.error}</EmptyState>}
      {!kotra.error && items.length === 0 && <EmptyState>{S.empty}</EmptyState>}
      {items.map((k, i) => (
        <div key={i} className="tc-line">
          <span className="mono">{k.hsCode}</span> <b><Highlight text={k.productName} terms={terms} /></b>
          <div className="tc-muted"><Highlight text={k.regulation} terms={terms} />{k.startDate ? ` · ${k.startDate}${k.endDate ? `~${k.endDate}` : ""}` : ""}</div>
        </div>
      ))}
    </div>
  );
}

function DestinationSection({ data }) {
  const S = TRADE_LABELS.sections.destination;
  const dest = data.destination;
  const terms = tcHighlightTerms(data);
  if (!dest) {
    return (
      <SectionPanel title={S.title.destination_import}>
        <EmptyState>{S.pick}</EmptyState>
        {(data.intl_lists || []).length > 0 && <IntlListsBlock lists={data.intl_lists} showCountry terms={terms} />}
      </SectionPanel>
    );
  }
  const groups = tcGroupListings(dest.listings);
  return (
    <SectionPanel title={`${S.title[dest.role] || S.title.destination_import} · ${tcCountryLabel(dest.country)}`} aside={TRADE_LABELS.sections.lists.count(groups.length)}>
      {groups.length === 0 && <EmptyState>{S.empty}</EmptyState>}
      {groups.map(g => (
        <div key={g.key} className="tc-item">
          <div><Badge>{tcCountryName(g.country)}</Badge> <b>{g.list}</b></div>
          {g.details.length > 0 && <div className="tc-line">{g.details.join(" · ")}</div>}
          {g.source && <div className="tc-meta tc-line">{g.source}</div>}
        </div>
      ))}
      <IntlListsBlock lists={dest.intl_lists} terms={terms} />
      <KotraBlock kotra={dest.kotra} unavailable={dest.kotra_unavailable} terms={terms} />
    </SectionPanel>
  );
}

Object.assign(window, { DestinationSection });
