// Product · International regulation — world map of jurisdictions listing this CAS,
// plus the listings of the selected jurisdiction. Data: /api/regulations/international/{cas}.
// Jurisdiction names/ISO ids live in intl_regions.jsx; the map shape in data/world-110m.json.
// Threshold bars: product_thresholds.jsx. Statutory evidence per jurisdiction: product_provisions.jsx.

const WORLD_URL = "data/world-110m.json";
const MAP_W = 960, MAP_H = 470;
let worldPromise = null;

function loadWorld() {
  if (!worldPromise) {
    worldPromise = fetch(WORLD_URL)
      .then(r => { if (!r.ok) throw new Error(`map ${r.status}`); return r.json(); })
      .then(topo => window.topojson.feature(topo, topo.objects.countries).features
        .filter(f => f.id !== "010")); // Antarctica only wastes vertical space
    worldPromise.catch(() => { worldPromise = null; });
  }
  return worldPromise;
}

function useWorldPaths() {
  const [state, setState] = useState({ paths: [], error: null });
  React.useEffect(() => {
    if (!window.d3 || !window.topojson) { setState({ paths: [], error: "map library unavailable" }); return; }
    let cancelled = false;
    loadWorld().then(features => {
      if (cancelled) return;
      const projection = window.d3.geoNaturalEarth1().fitSize([MAP_W, MAP_H], { type: "FeatureCollection", features });
      const path = window.d3.geoPath(projection);
      setState({ paths: features.map(f => ({ id: f.id, name: f.properties?.name || "", d: path(f) })), error: null });
    }).catch(e => { if (!cancelled) setState({ paths: [], error: String(e.message || e) }); });
    return () => { cancelled = true; };
  }, []);
  return state;
}

// Country-level codes win over the EU block, so a Dutch listing colours the Netherlands itself.
function isoIndex(codes) {
  const idx = {};
  codes.filter(c => (INTL_JURISDICTIONS[c]?.iso || []).length > 1)
    .forEach(c => INTL_JURISDICTIONS[c].iso.forEach(id => { idx[id] = c; }));
  codes.filter(c => (INTL_JURISDICTIONS[c]?.iso || []).length === 1)
    .forEach(c => { idx[INTL_JURISDICTIONS[c].iso[0]] = c; });
  return idx;
}

function WorldMap({ paths, byIso, counts, active, onSelect }) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={PRODUCT_LABELS.intl.mapAria}
      style={{ width: "100%", height: "auto", display: "block" }}>
      {paths.map(p => {
        const code = byIso[p.id];
        const n = code ? counts[code] : 0;
        const fill = !code ? "var(--bg-sunken)"
          : code === active ? "var(--accent)"
          : `color-mix(in srgb, var(--accent) ${Math.round(30 + 45 * (n / max))}%, var(--bg-sunken))`;
        return (
          <path key={p.id || p.name} d={p.d} fill={fill}
            stroke={code === active ? "var(--accent-ink)" : "var(--border)"} strokeWidth={code === active ? 1.2 : 0.5}
            style={{ cursor: code ? "pointer" : "default", transition: "fill 120ms" }}
            onClick={() => code && onSelect(code)}>
            <title>{code ? `${p.name} · ${jurisdictionLabel(code)} · ${n}건` : p.name}</title>
          </path>
        );
      })}
    </svg>
  );
}

// Old bulk imports store bare markers ("X", or "313" for EPCRA_313) — they say "listed", not a value.
function meaningfulDetail(x) {
  const d = String(x.detail || "").trim();
  if (!d || /^x$/i.test(d) || (/^\d{1,4}$/.test(d) && String(x.regulation).includes(d))) return "";
  return d;
}

// One block per regulation; the same list often repeats per form (anhydrous / solution / salts).
function groupByRegulation(listings) {
  const groups = [];
  const at = {};
  listings.forEach(x => {
    if (!(x.regulation in at)) {
      at[x.regulation] = groups.length;
      groups.push({ regulation: x.regulation, list: x.list, source: x.source, entries: [] });
    }
    groups[at[x.regulation]].entries.push({ name: x.name, detail: meaningfulDetail(x) });
  });
  return groups;
}

function IntlStat({ label, value, sub }) {
  return (
    <div>
      <div className="m">{label}</div>
      <div className="v tnum">{value}</div>
      <div className="muted" style={{ fontSize: 11 }}>{sub}</div>
    </div>
  );
}

function RegulationGroup({ group, first }) {
  return (
    <div style={{ fontSize: 12, padding: "10px 0", overflowWrap: "anywhere", borderTop: first ? "none" : "1px dashed var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <b>{group.list}</b>
        {group.entries.length > 1 && <span className="muted tnum">{group.entries.length}</span>}
      </div>
      {group.entries.map((e, i) => (
        <div key={i} style={{ marginTop: 3 }}>
          {e.detail && <span>{e.detail}</span>}
          {e.name && <span className="muted">{e.detail ? " · " : ""}{e.name}</span>}
          {!e.detail && !e.name && <span className="muted">등재</span>}
        </div>
      ))}
      <div className="muted mono" style={{ fontSize: 10, marginTop: 3 }}>
        {group.regulation}{group.source ? ` · ${group.source}` : ""}
      </div>
    </div>
  );
}

function IntlRegulationPanel({ selected }) {
  const cas = selected?.cas_no || "";
  const { data, loading, error } = useIntlRegulations(cas);
  const { paths, error: mapError } = useWorldPaths();
  const [active, setActive] = useState(null);

  const jurisdictions = data?.jurisdictions || {};
  const codes = Object.keys(jurisdictions).sort((a, b) => jurisdictions[b].length - jurisdictions[a].length);
  const counts = Object.fromEntries(codes.map(c => [c, jurisdictions[c].length]));
  const byIso = React.useMemo(() => isoIndex(codes), [codes.join(",")]);
  const current = active && jurisdictions[active] ? active : codes[0];
  const groups = groupByRegulation(jurisdictions[current] || []);
  const listCount = new Set(codes.flatMap(c => jurisdictions[c].map(x => x.regulation))).size;

  React.useEffect(() => { setActive(null); }, [cas]);

  const IL = PRODUCT_LABELS.intl;
  const ST = PRODUCT_LABELS.status;
  const statusText = !cas ? ST.noCas
    : loading ? ST.loading
    : error ? ST.error(error)
    : IL.status(data?.count || 0, codes.length);

  return (
    <section id="intl-regulation" style={{ marginTop: 28 }}>
      <SectionHeading t={IL.heading} meta={statusText} />

      {(!cas || (!loading && !error && codes.length === 0)) && (
        <div className="card" style={{ padding: 20, color: "var(--fg-muted)", fontSize: 13 }}>
          {!cas ? "CAS 번호가 없어 국가별 규제 목록을 조회할 수 없습니다."
            : "수집된 국가별 규제 목록에 이 물질이 등재되어 있지 않습니다."}
        </div>
      )}

      {codes.length > 0 && (
        <>
          <div className="chem-hdr" style={{ marginBottom: 14 }}>
            <div className="stats-mini" style={{ width: "100%" }}>
              <IntlStat label={IL.stats.jurisdictions.m} value={codes.length} sub={IL.stats.jurisdictions.sub} />
              <IntlStat label={IL.stats.lists.m} value={listCount} sub={IL.stats.lists.sub} />
              <IntlStat label={IL.stats.listings.m} value={data?.count || 0} sub={IL.stats.listings.sub} />
              <IntlStat label={IL.stats.top.m} value={INTL_JURISDICTIONS[codes[0]]?.ko || codes[0]} sub={IL.stats.top.sub(counts[codes[0]])} />
            </div>
          </div>

          <div className="layout-2col" style={{ alignItems: "start" }}>
            <div className="card" style={{ padding: 12 }}>
              {mapError
                ? <div className="muted" style={{ fontSize: 12, padding: 12 }}>지도를 불러오지 못했습니다 ({mapError}). 목록은 정상입니다.</div>
                : <WorldMap paths={paths} byIso={byIso} counts={counts} active={current} onSelect={setActive} />}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {codes.map(c => (
                  <button key={c} className="chip" aria-pressed={c === current} onClick={() => setActive(c)}
                    style={{ cursor: "pointer", fontSize: 11, fontWeight: c === current ? 700 : 500,
                      background: c === current ? "var(--accent-soft)" : undefined,
                      borderColor: c === current ? "var(--accent)" : undefined }}>
                    {jurisdictionLabel(c)} <span className="tnum">{counts[c]}</span>
                  </button>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>지도나 버튼을 눌러 나라를 고르세요. 색이 진할수록 등재 건수가 많습니다.</div>
            </div>

            <div className="panel">
              <h3><b>{jurisdictionLabel(current)}</b> <span className="muted">{groups.length}개 목록 · {counts[current]}건</span></h3>
              <div className="body" style={{ maxHeight: 560, overflowY: "auto" }}>
                {groups.map((g, i) => <RegulationGroup key={g.regulation} group={g} first={i === 0} />)}
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
