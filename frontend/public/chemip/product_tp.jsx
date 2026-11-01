// 물질 상세 · 온도별 물성(섹션 id="tp", ?anchor=tp) — 증기압·액체 밀도·Cp(이상기체·액체)·증발열·점도 등의 온도 곡선,
// 고른 온도의 값, 임계·기준 상수, 출처 배지. 자료: 정적 tp/<CAS>.json(useTpProps, api_tp.jsx; 화면에 다가오면 요청).
// 계산: tp_forms.jsx(상관식) · tp_helpers.jsx(표시). 문구: tp_labels*.jsx. 하위: TpPropPicker · TpUnitToggle · TpTempInput ·
// CalcChart(calc_chart.jsx) · TpPointTable · TpConstTable · TpSourceBadge. 스타일: product_detail.css(.pd-tp-*).

function TpPanel({ selected }) {
  const ref = React.useRef(null);
  const inView = useInView(ref);
  const cas = selected?.cas_no || "";
  const { data, loading, error } = useTpProps(cas, inView);
  const [mode, setMode] = React.useState("molar");
  const [propKey, setPropKey] = React.useState(TP_DEFAULT_PROP);
  const [tK, setTK] = React.useState(TP_DEFAULT_T);
  const [raw, setRaw] = React.useState(String(TP_DEFAULT_T));

  const L = TP_LABELS;
  const ST = PRODUCT_LABELS.status;
  const props = data ? tpAvailableProps(data) : [];
  const prop = props.find(p => p.k === propKey) || props[0] || null;
  const mw = tpMw(data);
  const n = tpCurveCount(data);
  const statusText = !cas ? ST.noCas : !inView ? ST.scrollToLoad : loading ? ST.loading : error ? ST.error(error) : data ? L.count(n) : L.count(0);
  const tUnit = L.units[tpUnitKey("temperature", mode)];

  const onMode = (m) => {
    setMode(m);
    if (tK != null) setRaw(String(Number(tpTempShow(tK, m).toFixed(2))));
  };
  const onRaw = (s) => {
    setRaw(s);
    setTK(tpParseT(s, mode));
  };
  const chart = data && prop ? tpChartProps(data, prop, mode, tK, L) : null;
  const curves = data && prop ? tpPropCurves(data, prop) : [];
  const hint = curves[0] ? L.tHint(tpFmt(tpTempShow(curves[0].Tmin, mode), 4), tpFmt(tpTempShow(curves[0].Tmax, mode), 4), tUnit) : "";
  const antoine = data ? tpAntoineLink(data) : null;
  const name = data?.name || selected?.name_en || "";

  return (
    <section ref={ref} id="tp" className="pd-lower">
      <SectionHeading t={L.heading} meta={`${L.sourceNote} · ${statusText}`} />
      {inView && !loading && error && <ErrorState message={error} card />}
      {inView && !loading && !error && !data && <EmptyState card>{L.none}</EmptyState>}
      {data && (
        <>
          {props.length > 0 && (
            <div className="pd-tp-bar">
              <TpPropPicker props={props} value={prop?.k} onChange={setPropKey} />
              <TpUnitToggle mode={mode} setMode={onMode} canMass={mw > 0} />
              {!(mw > 0) && <span className="muted pd-mini">{L.unitNoMw}</span>}
            </div>
          )}
          {props.length > 0 && <TpTempInput raw={raw} setRaw={onRaw} unit={tUnit} error={tK == null ? L.tBad : ""} hint={hint} />}
          {chart && <div className="pd-tp-chart"><CalcChart x={chart.x} y={chart.y} series={chart.series} markers={chart.markers} vlines={chart.vlines}
            hlines={chart.hlines} height={280} ariaLabel={chart.ariaLabel} /></div>}
          {props.length > 0 && <TpPointTable rows={tpPointRows(data, tK, mode, L)} sources={data.sources || {}} />}
          <TpConstTable rows={tpConstRows(data, mode, L)} sources={data.sources || {}} />
          {antoine && <a className="mono pd-link-xs pd-tp-calc" href={calcHref("antoine", antoine, name)}>{L.calcAntoine}</a>}
          <div className="muted pd-foot-note-sm">
            {L.disclaimer}{data.exported_at ? ` ${L.exportedAt(data.exported_at)}` : ""}
          </div>
        </>
      )}
    </section>
  );
}

Object.assign(window, { TpPanel });
