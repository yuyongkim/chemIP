// 화면 "취급 사업장 지도"(?view=prtr&cas=<CAS>) 셸 — 상태(물질·지표·지역)와 배치만.
// 자료: usePrtrIndex·usePrtrSubstance(api_prtr.jsx), 지도 경로: usePrtrGeoPaths(prtr_geo.jsx), 값 가공: prtr_map_helpers.jsx.
// 문구: PRTR_MAP_LABELS. 스타일: product_views.css(.prtr-*). 물질 화면 취급 사업장 패널(product_handlers.jsx)에서 링크한다.

function PrtrMapView({ link }) {
  const L = PRTR_MAP_LABELS;
  const idx = usePrtrIndex();
  const substances = React.useMemo(() => prtrSubstances(idx.data), [idx.data]);
  const names = React.useMemo(() => prtrRegionNames(idx.data), [idx.data]);
  const [cas, setCas] = useState(() => ((link && link.cas) || "").trim());
  const current = cas || (substances[0] && substances[0].cas) || "";
  const sub = usePrtrSubstance(current);
  const [metric, setMetric] = useState("facilities");
  const [region, setRegion] = useState("");
  const geo = usePrtrGeoPaths();
  const detailRef = React.useRef(null);

  const pick = (c) => {
    setCas(c);
    setRegion("");
    try { window.history.replaceState(null, "", prtrViewUrl(window.location.href, c)); } catch (e) { /* 주소만 못 바꿈 */ }
  };
  const selectRegion = (iso) => {
    setRegion(iso);
    const el = detailRef.current;
    if (iso && el && el.getBoundingClientRect().top > window.innerHeight * 0.8) el.scrollIntoView({ block: "start" });
  };

  const body = sub.data;
  const meta = substances.find(s => s.cas === current) || body || {};
  const name = prtrSubstanceName(body || meta, CHEMIP_LANG);
  const values = prtrRegionValues(body, metric);

  return (
    <div className="prtr-view">
      <header className="prtr-head">
        <ViewTitle t={L.title} />
        <p className="muted prtr-lede">{L.lede}</p>
      </header>

      {idx.loading ? <EmptyState>{L.empty.loading}</EmptyState>
        : idx.error ? <ErrorState message={idx.error} card />
        : !substances.length ? <EmptyState kind="preparing" card>{L.empty.noIndex}</EmptyState>
        : <PrtrSubstancePicker substances={substances} cas={current} onPick={pick} />}

      {substances.length > 0 && (
        sub.loading ? <EmptyState>{L.empty.loading}</EmptyState>
        : sub.error ? <ErrorState message={sub.error} card />
        : !body ? <EmptyState card>{L.empty.noData}</EmptyState>
        : (
          <>
            <div className="prtr-sub-head">
              <h2 className="prtr-sub-title">{name} <span className="mono muted prtr-cas">CAS {body.cas}</span></h2>
              <a className="ui-link-btn" href={prtrSubstanceHref(body.cas)}>{L.substanceLink} →</a>
            </div>
            <PrtrMapStats body={body} />
            <div className="prtr-layout">
              <div className="card prtr-map-card">
                <PrtrMetricSwitch metric={metric} onChange={setMetric} />
                {geo.error
                  ? <div className="muted prtr-map-error">{L.mapError(geo.error)}</div>
                  : <PrtrChoropleth paths={geo.paths} values={values} active={region} names={names} metric={metric}
                      substanceName={name} onSelect={selectRegion} />}
                <PrtrMapLegend values={values} metric={metric} />
                <div className="muted prtr-hint">{L.mapHint}</div>
              </div>
              <PrtrRegionTable regions={body.regions} names={names} active={region} onSelect={selectRegion} />
            </div>
            <div ref={detailRef}>
              <PrtrRegionDetail body={body} iso={region} names={names} onClear={() => setRegion("")} />
            </div>
            <PrtrSourceNote body={body} />
          </>
        )
      )}
    </div>
  );
}

Object.assign(window, { PrtrMapView });
