// Trade controls · 통제 목록 등재 — CWC schedules · Australia Group · drug precursors the substance is on.

function ControlledListsSection({ data }) {
  const S = TRADE_LABELS.sections.lists;
  const ready = tcSourceReady(data.sources_status, "lists");
  const lists = data.controlled_lists || [];
  const elsewhere = lists.length ? [] : tcControlSummary(data);
  return (
    <SectionPanel id={TRADE_ANCHORS.lists} title={S.title} aside={ready ? S.count(lists.length) : ""}>
      {!ready && <EmptyState kind="preparing" />}
      {ready && lists.length === 0 && (
        <EmptyState>{elsewhere.length ? S.otherDirection(elsewhere.map(c => c.name).join(" · ")) : S.empty}</EmptyState>
      )}
      {lists.map((l, i) => (
        <div key={l.list_id || i} className="tc-item">
          <div className="tc-item-head">
            <b>{l.title || l.list_id}</b>
            <span className="tc-meta">{[l.jurisdiction, l.source_version].filter(Boolean).join(" · ")}</span>
          </div>
          {[...(l.entries || []), ...(l.family_entries || [])].map((e, j) => (
            <div key={j} className="tc-line">
              {e.category && <Badge tone="accent">{e.category}</Badge>} <span>{tcEntryName(e)}</span>
              {e.detail && <span className="tc-muted"> · {e.detail}</span>}
            </div>
          ))}
          {l.kr_obligation && <div className="tc-line">{l.kr_obligation}</div>}
          <div className="tc-line tc-muted">{[l.authority, l.legal_basis].filter(Boolean).join(" · ")}<SourceLink url={l.source_url} /></div>
        </div>
      ))}
    </SectionPanel>
  );
}

Object.assign(window, { ControlledListsSection });
