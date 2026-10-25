// Trade controls · 국내 법령별 규제 — kr_law_lists grouped by law (대기·물·산안법·위험물 …), direction-independent.
// 법령마다 접고 펼치는 묶음(Collapsible). 접힌 상태에서도 법령 이름·목록 수·목록 이름이 보인다.

function tcObligationText(o) {
  return typeof o === "string" ? o : o?.obligation || o?.title || "";
}

// 한 목록에 같은 물질 항목이 많으면(제품 유형별 함량 기준 등) 앞의 몇 건만 보이고 나머지는 접어 둔다.
const TC_LAW_ENTRY_PREVIEW = 3;

function KrLawEntry({ entry: e }) {
  return (
    <div className="tc-line">
      <span>{tcEntryName(e)}</span>
      {e.detail && <span className="tc-muted"> · {e.detail}</span>}
    </div>
  );
}

function KrLawList({ list: l }) {
  const L = TRADE_LABELS;
  const obligations = (l.obligations || []).map(tcObligationText).filter(Boolean);
  const entries = [...(l.entries || []), ...(l.family_entries || [])];
  const head = entries.slice(0, TC_LAW_ENTRY_PREVIEW);
  const rest = entries.slice(TC_LAW_ENTRY_PREVIEW);
  return (
    <div className="tc-item">
      <div className="tc-item-head">
        <span className="tc-item-title">{l.title || l.list_id}</span>
        <span className="tc-meta">{[l.list_id, l.amended_on && `${L.fields.amended_on} ${l.amended_on}`].filter(Boolean).join(" · ")}</span>
      </div>
      {head.map((e, i) => <KrLawEntry key={i} entry={e} />)}
      {rest.length > 0 && (
        <Collapsible className="tc-more" summary={L.collapse.more(rest.length)}>
          {rest.map((e, i) => <KrLawEntry key={i} entry={e} />)}
        </Collapsible>
      )}
      {obligations.length > 0 && (
        <div className="tc-field">
          <span className="tc-field-k">{L.fields.obligations}</span>
          <ul className="tc-bullets">{obligations.map((o, i) => <li key={i}>{o}</li>)}</ul>
        </div>
      )}
      <div className="tc-line tc-muted">{l.legal_basis}<SourceLink url={l.source_url} /></div>
    </div>
  );
}

function KrLawSection({ data }) {
  const L = TRADE_LABELS;
  const S = L.sections.krLaw;
  const C = L.collapse;
  const [openAll, setOpenAll] = React.useState(null);
  const ready = tcSourceReady(data.sources_status, "krLaw");
  const laws = data.kr_law_lists || [];
  const aside = ready && laws.length ? (
    <>{S.lists(laws.length)} · <ExpandAllToggle open={openAll} setOpen={setOpenAll} labels={C} /></>
  ) : ready ? S.lists(0) : "";
  return (
    <SectionPanel id={TRADE_ANCHORS.krLaw} title={S.title} aside={aside}>
      {!ready && <EmptyState kind="preparing" />}
      {ready && laws.length === 0 && <EmptyState>{S.empty}</EmptyState>}
      {laws.map(g => (
        <Collapsible
          key={`${g.law}-${openAll}`}
          defaultOpen={openAll === true}
          className="tc-law"
          summary={(
            <span className="tc-law-sum">
              <span className="tc-law-name">{g.law}</span>
              <span className="tc-law-count">{C.lists(g.lists.length)}</span>
              <span className="tc-law-peek">{g.lists.map(l => l.title || l.list_id).join(" · ")}</span>
            </span>
          )}
        >
          {g.lists.map(l => <KrLawList key={l.list_id || l.title} list={l} />)}
        </Collapsible>
      ))}
    </SectionPanel>
  );
}

Object.assign(window, { KrLawSection });
