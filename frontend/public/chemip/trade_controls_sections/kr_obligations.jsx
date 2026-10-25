// Trade controls · 한국 수출입 의무 — kr_rules matches for the chosen direction, plus 확인 중 (unverified) items.

const TC_OBLIGATION_FIELDS = ["who", "when_required", "agency", "threshold"];

function KrObligationsSection({ data }) {
  const L = TRADE_LABELS;
  const S = L.sections;
  const ready = tcSourceReady(data.sources_status, "obligations");
  const rules = data.kr_obligations || [];
  const unverified = data.kr_unverified || [];
  const customs = tcCustomsCount(rules);
  return (
    <>
      <SectionPanel id={TRADE_ANCHORS.obligations} title={S.obligations.title} aside={ready ? `${L.count(rules.length)}${customs ? ` · ${L.customs} ${customs}` : ""}` : ""}>
        {!ready && <EmptyState kind="preparing" />}
        {ready && rules.length === 0 && <EmptyState>{S.obligations.empty}</EmptyState>}
        {rules.map((r, i) => <RuleCard key={r.rule_id || i} item={r} title={r.obligation} fieldKeys={TC_OBLIGATION_FIELDS} />)}
      </SectionPanel>
      {unverified.length > 0 && (
        <SectionPanel title={S.unverified.title} aside={L.count(unverified.length)}>
          <div className="ui-hint">{S.unverified.hint}</div>
          {unverified.map((r, i) => <RuleCard key={r.rule_id || i} item={r} title={r.obligation} fieldKeys={TC_OBLIGATION_FIELDS} />)}
        </SectionPanel>
      )}
    </>
  );
}

Object.assign(window, { KrObligationsSection });
