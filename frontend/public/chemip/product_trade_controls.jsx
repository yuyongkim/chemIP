// Product · 규제·인허가 / 수출입 tab — shell only: holds direction/country state, calls the hook, lays out sections.
// Data: useTradeControls (api.jsx) → /api/regulations/trade-controls/{cas}. Sections: trade_controls_sections/*.jsx,
// strings: trade_controls_labels.jsx, pure helpers: trade_controls_helpers.jsx, shared UI: ui_common.jsx.

function TradeControlsTab({ selected }) {
  const L = TRADE_LABELS;
  const cas = selected?.cas_no || "";
  const [direction, setDirection] = React.useState("import");
  const [country, setCountry] = React.useState("");
  const { data, loading, error } = useTradeControls(cas, direction, country);
  const name = selected?.name || selected?.name_en || cas;
  const ok = cas && !loading && data && !data.error;
  // 방향·상대국을 바꾸는 동안 직전 결과를 흐리게 보여 화면이 통째로 비었다 차는 것을 막는다(같은 물질일 때만).
  const last = React.useRef({ cas: "", data: null });
  if (ok) last.current = { cas, data };
  const shown = ok ? data : (loading && last.current.cas === cas ? last.current.data : null);
  const failed = cas && !loading && (error || data?.error);

  return (
    <section className="tc-tab">
      <div className="tc-head">
        <h3 className="tc-title">{L.title}</h3>
      </div>
      {cas && (
        <div className="tc-sticky">
          <TradeControlsBar direction={direction} setDirection={setDirection} country={country} setCountry={setCountry} />
          {loading && shown && <span className="tc-updating" role="status">{L.loading}</span>}
        </div>
      )}
      {!cas && <EmptyState card>{L.noCas}</EmptyState>}
      {cas && loading && !shown && <EmptyState card>{L.loading}</EmptyState>}
      {failed && <ErrorState card message={L.errors[data?.error] || error || data.error} />}
      {shown && (
        <div className={`tc-body${loading ? " is-stale" : ""}`} aria-busy={loading || undefined}>
          <TradeSummary data={shown} direction={direction} />
          <ChecklistExport data={shown} selected={selected} direction={direction} country={country} />
          <div className="tc-block">
            <div className="tc-head"><h4 className="tc-subtitle">{L.blocks.domestic.title}</h4></div>
            <div className="ui-hint">{L.blocks.domestic.hint}</div>
            <div className="tc-grid">
              <KrLawSection data={shown} />
              <KrPermitsSection data={shown} />
            </div>
            <KrPermitContextSection cas={cas} />
          </div>
          <div className="tc-block">
            <div className="tc-head"><h4 className="tc-subtitle">{L.blocks.trade.title}</h4></div>
            <div className="tc-phrase">{L.directions[direction].phrase(name, tcCountryName(country))}</div>
            <div className="tc-grid">
              <div>
                <KrObligationsSection data={shown} />
                <ControlledListsSection data={shown} />
              </div>
              <div>
                <HsCodesSection data={shown} />
                <DestinationSection data={shown} />
              </div>
            </div>
          </div>
          <TradeSourcesFooter status={shown.sources_status} />
        </div>
      )}
    </section>
  );
}

Object.assign(window, { TradeControlsTab });
