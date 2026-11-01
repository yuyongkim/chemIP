// 물질 상세 화면 셸 — 머리(product_chem_header.jsx), 탭 줄(목록: product_tab_list.jsx), 고른 탭 본문,
// 아래 패널(국가별 규제·국내 근거 조문·분류로 걸리는 규제·노출기준·온도별 물성·사고 사례·EPA 집행·텍사스 배출사고·관련 물질·취급 사업장) 배치만 한다. 탭 본문은 product_<탭>.jsx.

function ChemicalEmpty() {
  const L = PRODUCT_LABELS.chem;
  return (
    <div className="card pd-empty-card">
      <Icon name="atom" size={28} className="pd-empty-icon" />
      <h3 className="pd-empty-title">{L.emptyTitle}</h3>
      <p className="pd-empty-hint">{L.emptyHint}</p>
    </div>
  );
}

function ChemicalView({ tab, setTab, selected, anchor = "" }) {
  // Hooks must run in stable order — call before any early return
  const detail = useChemicalDetail(selected?.chem_id);
  useSectionAnchor(anchor); // ?anchor=<키> → 아래 패널로(section_anchor.jsx)
  if (!selected) return <ChemicalEmpty />;
  const sections = detail.data?.sections || [];
  const T = PRODUCT_LABELS.tabs;
  const current = PRODUCT_DETAIL_TABS.find(t => t.k === tab);
  const Body = current?.Component;
  return (
    <div>
      <ChemHeader selected={selected} sections={sections} loading={detail.loading} error={detail.error} />
      <KeyFactsStrip selected={selected} />
      <div className="tabs">
        {PRODUCT_DETAIL_TABS.map(t => (
          <button key={t.k} aria-selected={tab === t.k} onClick={() => setTab(t.k)} title={T[t.k]?.en !== t.label ? T[t.k]?.en : undefined}>
            {t.label} <span className="n">{typeof t.n === "function" ? t.n({ sections }) : t.n}</span>
          </button>
        ))}
      </div>
      {Body && <Body selected={selected} sections={sections} loading={detail.loading} error={detail.error} />}
      <IntlRegulationPanel selected={selected} />
      <KrLawBasisPanel selected={selected} />
      <CategoryRulesPanel selected={selected} sections={sections} loading={detail.loading} />
      <OelPanel selected={selected} sections={sections} />
      <ElPanel selected={selected} />
      <TpPanel selected={selected} />
      <IncidentPanel selected={selected} />
      <EnforcementPanel selected={selected} />
      <TceqEventsPanel selected={selected} />
      <RelatedSubstancesPanel selected={selected} />
      <HandlersPanel selected={selected} anchor={anchor} />
    </div>
  );
}

Object.assign(window, { ChemicalView });
