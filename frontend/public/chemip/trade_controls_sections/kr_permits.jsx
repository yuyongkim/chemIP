// Trade controls · 인허가·신고 — kr_permits matched by the substance's list memberships, direction-independent.
// 법령별로 접고 펼친다. 접힌 상태에서도 법령 이름·건수·종류(허가/신고/금지 …)와 인허가 이름이 보인다.

// when_required 가 새 형식, timing 은 옛 kr_permits_safety 형식(둘 중 있는 것만 보인다).
const TC_PERMIT_FIELDS = ["who", "authority", "when_required", "timing", "threshold"];

function KrPermitsSection({ data }) {
  const L = TRADE_LABELS;
  const S = L.sections.permits;
  const C = L.collapse;
  const [openAll, setOpenAll] = React.useState(null);
  const ready = tcSourceReady(data.sources_status, "permits");
  const permits = data.kr_permits || [];
  const groups = tcGroupByLaw(permits);
  const aside = ready && permits.length ? (
    <>{L.count(permits.length)} · <ExpandAllToggle open={openAll} setOpen={setOpenAll} labels={C} /></>
  ) : ready ? L.count(0) : "";
  return (
    <SectionPanel id={TRADE_ANCHORS.permits} title={S.title} aside={aside}>
      {!ready && <EmptyState kind="preparing" />}
      {ready && permits.length === 0 && <EmptyState>{S.empty}</EmptyState>}
      {groups.map(g => (
        <Collapsible
          key={`${g.law}-${openAll}`}
          defaultOpen={openAll === true}
          className="tc-law"
          summary={(
            <span className="tc-law-sum">
              <span className="tc-law-name">{g.law}</span>
              <span className="tc-law-count">{C.items(g.items.length)}</span>
              <span className="tc-law-kinds">
                {tcKindCounts(g.items).map(([k, n]) => <Badge key={k} tone={tcKindTone(k)}>{n > 1 ? `${k} ${n}` : k}</Badge>)}
              </span>
              {/* 접힌 상태에서도 무엇을 해야 하는지(인허가 이름)는 바로 보인다. 근거·원문만 펼쳐서 본다. */}
              <span className="tc-law-names">
                {g.items.map((p, i) => <span key={p.rule_id || p.permit_id || i} className="tc-law-name-item">{tcPermitName(p)}</span>)}
              </span>
            </span>
          )}
        >
          {g.items.map((p, i) => (
            <React.Fragment key={p.rule_id || p.permit_id || i}>
              <RuleCard item={p} title={tcPermitName(p)} fieldKeys={TC_PERMIT_FIELDS} />
              <KrPermitDurationHint cas={data.cas} permitId={p.permit_id} />
            </React.Fragment>
          ))}
        </Collapsible>
      ))}
    </SectionPanel>
  );
}

Object.assign(window, { KrPermitsSection });
