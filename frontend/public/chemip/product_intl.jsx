// Product · International regulation — world map of jurisdictions listing this CAS,
// plus the listings of the selected jurisdiction. Data: /api/regulations/international/{cas} (useIntlRegulations).
// Jurisdiction names/ISO ids live in intl_regions.jsx; the map: intl_world.jsx + product_intl_map.jsx;
// pure transforms: product_intl_helpers.jsx. Threshold bars: product_thresholds.jsx. Statutory evidence: product_provisions.jsx.
// EU REACH registration: when the bundled data has none for this CAS, one on-demand lookup (useReachRegistration, api_reach.jsx)
// is merged in as the EU_REACH_REGISTERED item (intl_reach.jsx) and drawn by ReachEntry (product_intl_reach.jsx).
// Status-only items ("checking", "not registered", "unknown") are shown but not counted.
// 문구: PRODUCT_LABELS.intl. 스타일: product_detail.css.

function IntlStat({ label, value, sub }) {
  return (
    <div>
      <div className="m">{label}</div>
      <div className="v tnum">{value}</div>
      <div className="muted pd-stat-sub">{sub}</div>
    </div>
  );
}

function RegulationGroup({ group }) {
  const IL = PRODUCT_LABELS.intl;
  return (
    <div className="pd-reg-group">
      <div className="pd-reg-group-head">
        <b>{group.list}</b>
        {group.entries.length > 1 && <span className="muted tnum">{group.entries.length}</span>}
      </div>
      {group.regulation === REACH_LIST_ID && group.entries.map((e, i) => <ReachEntry key={i} entry={e} />)}
      {group.regulation !== REACH_LIST_ID && group.entries.map((e, i) => (
        <div key={i} className="pd-reg-entry">
          {e.detail && <span>{e.detail}</span>}
          {e.name && <span className="muted">{e.detail ? " · " : ""}{e.name}</span>}
          {e.aka && e.aka.length > 0 && <span className="muted pd-mini"> ({IL.aka(e.aka)})</span>}
          {!e.detail && !e.name && <span className="muted">{IL.listed}</span>}
        </div>
      ))}
      <div className="muted mono pd-reg-group-foot">
        {group.regulation}{group.source ? ` · ${group.source}` : ""}
      </div>
    </div>
  );
}

function IntlRegulationPanel({ selected }) {
  const cas = selected?.cas_no || "";
  const { data: listed, loading, error } = useIntlRegulations(cas);
  const needReach = !!cas && !loading && !intlHasReach(listed);
  const reach = useReachRegistration(cas, needReach);
  const data = React.useMemo(() => (needReach ? intlWithReach(listed, reach, REACH_LABELS) : listed), [listed, reach, needReach]);
  const { paths, error: mapError } = useWorldPaths();
  const [active, setActive] = useState(null);

  const jurisdictions = data?.jurisdictions || {};
  const counts = Object.fromEntries(Object.keys(jurisdictions).map(c => [c, intlListingCount(jurisdictions[c])]));
  const codes = Object.keys(jurisdictions).sort((a, b) => counts[b] - counts[a]);
  const listedCodes = codes.filter(c => counts[c] > 0); // a jurisdiction with only a status line (REACH checking / none) is not "listed"
  const byIso = React.useMemo(() => isoIndex(listedCodes), [listedCodes.join(",")]);
  const current = active && jurisdictions[active] ? active : codes[0];
  const groups = groupByRegulation(jurisdictions[current] || []);
  const listCount = new Set(codes.flatMap(c => jurisdictions[c].filter(x => !x.status_only).map(x => x.regulation))).size;

  React.useEffect(() => { setActive(null); }, [cas]);

  const IL = PRODUCT_LABELS.intl;
  const ST = PRODUCT_LABELS.status;
  const statusText = !cas ? ST.noCas
    : loading ? ST.loading
    : error ? ST.error(error)
    : IL.status(data?.count || 0, listedCodes.length);

  return (
    <section id="intl-regulation" className="pd-lower">
      <SectionHeading t={IL.heading} meta={statusText} />

      {(!cas || (!loading && !error && codes.length === 0)) && (
        <div className="card pd-lower-empty">{!cas ? IL.noCas : IL.none}</div>
      )}

      {codes.length > 0 && (
        <>
          <div className="chem-hdr pd-lower-stats">
            <div className="stats-mini pd-full">
              <IntlStat label={IL.stats.jurisdictions.m} value={listedCodes.length} sub={IL.stats.jurisdictions.sub} />
              <IntlStat label={IL.stats.lists.m} value={listCount} sub={IL.stats.lists.sub} />
              <IntlStat label={IL.stats.listings.m} value={data?.count || 0} sub={IL.stats.listings.sub} />
              <IntlStat label={IL.stats.top.m} value={jurisdictionName(codes[0])} sub={IL.stats.top.sub(counts[codes[0]])} />
            </div>
          </div>

          <div className="layout-2col pd-align-start">
            <IntlMapCard paths={paths} mapError={mapError} byIso={byIso} counts={counts} codes={codes} current={current} onSelect={setActive} />
            <div className="panel">
              <h3><b>{jurisdictionLabel(current)}</b> <span className="muted">{IL.listHead(groups.length, counts[current])}</span></h3>
              <div className="body pd-scroll">
                {groups.map(g => <RegulationGroup key={g.regulation} group={g} />)}
              </div>
            </div>
          </div>
          <ProvisionEvidence cas={cas} country={current} name={selected?.name_en || ""} />
          <ThresholdComparison thresholds={data?.thresholds} />
        </>
      )}
    </section>
  );
}

Object.assign(window, { IntlRegulationPanel, IntlStat });
