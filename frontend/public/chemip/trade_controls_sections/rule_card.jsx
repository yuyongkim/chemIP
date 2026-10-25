// Trade controls · RuleCard — one obligation / permit with its fields, legal basis link, quoted source text, match tags.
// 한국 수출입 의무(kr_obligations)·확인 중 항목·인허가(kr_permits)가 같이 쓴다.
// 법령 원문 발췌는 길어서 기본으로 접어 둔다(Collapsible).

function RuleCard({ item, title, fieldKeys }) {
  const L = TRADE_LABELS;
  const conditions = tcConditions(item.matched_by);
  const supporting = item.citation?.supporting || [];
  const quotes = [
    ...tcQuoteLines(item.citation?.verified_text),
    ...supporting.flatMap(c => tcQuoteLines(c.verified_text).map(q => `${c.article ? `[${c.article}] ` : ""}${q}`)),
  ];
  const kind = tcKindLabel(item.kind);
  return (
    <div className="tc-item">
      <div className="tc-item-head">
        <span className="tc-item-title">{title || item.rule_id || item.permit_id}</span>
        <span className="tc-tags-inline">
          {kind && <Badge tone={tcKindTone(item.kind)}>{kind}</Badge>}
          {item.customs_confirmation && <Badge tone="hazard" title={L.customsHint}>{L.customs}</Badge>}
        </span>
      </div>
      {tcFieldRows(item, fieldKeys).map(([k, v]) => (
        <div key={k} className="tc-field"><span className="tc-field-k">{L.fields[k] || k}</span><span>{v}</span></div>
      ))}
      {conditions.map((c, i) => (
        <div key={i} className="tc-field"><span className="tc-field-k">{L.sections.permits.condition}</span><span>{c}</span></div>
      ))}
      <div className="tc-field">
        <span className="tc-field-k">{L.fields.legal_basis}</span>
        <span>{item.citation?.legal_basis || "—"}<SourceLink url={item.citation?.source_url} /></span>
      </div>
      {supporting.map((c, i) => (
        <div key={i} className="tc-field">
          <span className="tc-field-k">{i === 0 ? L.supportingTitle : ""}</span>
          <span>{c.article || c.legal_basis || ""}<SourceLink url={c.source_url} /></span>
        </div>
      ))}
      {item.note && <div className="tc-line tc-muted">{L.fields.note}: {item.note}</div>}
      {quotes.length > 0 && (
        <Collapsible className="tc-quotes" summary={L.quote.show(quotes.length)}>
          {quotes.map((q, i) => <div key={i} className="tc-quote">{q}</div>)}
        </Collapsible>
      )}
      <div className="tc-tags">
        {tcMatchTags(item.matched_by).map(t => <Badge key={t.key}>{t.label}{t.value ? ` · ${t.value}` : ""}</Badge>)}
        {(item.rule_id || item.permit_id) && <span className="tc-meta">{item.rule_id || item.permit_id}</span>}
      </div>
    </div>
  );
}

Object.assign(window, { RuleCard });
