// 계산기 그래프 CalcChart — 순수 SVG. 폭은 감싼 칸에 맞춘다(ResizeObserver), 색은 tokens.css(--chart-1…) → calc.css 클래스.
// 사용: <CalcChart x={{label, unit, min?, max?, log?}} y={{…}} series={[{key, label, points:[[x,y],…], kind?, dashed?}]}
//        markers={[{x, y, label}]} vlines={[{x, label}]} hlines={[{y, label}]} height={260} ariaLabel="…" />
// 가리키기·누르기(터치)·좌우 화살표 키로 말풍선(CalcChartTip), 아래에 자료 표(CalcChartTable). 계산: calc_chart_scale.jsx.
// 계산기 정의의 chart(values, outputs) → 이 속성들을 돌려주면 calc_results.jsx 가 결과 아래에 그린다.

function useCalcChartWidth(ref, fallback = 600) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => { const w = Math.floor(el.clientWidth); if (w > 0) setWidth(w); };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function CalcChart({ x, y, series = [], markers = [], vlines = [], hlines = [], height = 260, ariaLabel }) {
  const wrapRef = useRef(null);
  const width = useCalcChartWidth(wrapRef);
  const [hover, setHover] = useState(null);   // { px, py } 또는 { stop: x 값 순번 } 또는 { marker: 순번 }
  const model = useMemo(() => calcChartModel({ x, y, series, markers, vlines, hlines, width, height }), [x, y, series, markers, vlines, hlines, width, height]);
  const stops = useMemo(() => calcChartXStops(model), [model]);
  if (!model) return <div className="calc-chart-box is-empty" ref={wrapRef} />;

  const at = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { px: e.clientX - r.left, py: e.clientY - r.top };
  };
  const hits = !hover || hover.marker != null ? []
    : hover.stop != null ? calcChartNearest(model, model.sx(stops[hover.stop]), model.top)
      : calcChartNearest(model, hover.px, hover.py);
  const marker = hover?.marker != null ? model.markers[hover.marker] : null;
  const onKey = (e) => {
    if (!stops.length || !["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(e.key)) return;
    e.preventDefault();
    if (e.key === "Escape") { setHover(null); return; }
    const cur = hover?.stop ?? (e.key === "ArrowLeft" ? stops.length : -1);
    const next = e.key === "Home" ? 0 : e.key === "End" ? stops.length - 1 : cur + (e.key === "ArrowLeft" ? -1 : 1);
    setHover({ stop: Math.max(0, Math.min(stops.length - 1, next)) });
  };
  const crossX = hits.length ? hits[0].px : null;

  return (
    <figure className="calc-chart">
      <div className="calc-chart-box" ref={wrapRef}>
        <svg
          className="calc-chart-svg"
          width={model.width}
          height={model.height}
          viewBox={`0 0 ${model.width} ${model.height}`}
          role="img"
          aria-label={ariaLabel || `${model.yTitle} — ${model.xTitle}`}
          tabIndex={0}
          onPointerMove={e => setHover(at(e))}
          onPointerDown={e => setHover(at(e))}
          onPointerLeave={e => { if (e.pointerType === "mouse") setHover(null); }}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          <CalcChartAxes model={model} />
          <g className="calc-chart-plot">
            {model.lines.map(l => (l.kind === "scatter"
              ? <g key={l.key} className={`calc-chart-dots calc-chart-s${l.slot}`}>{l.dots.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={4} />)}</g>
              : <path key={l.key} d={l.d} className={`calc-chart-line calc-chart-s${l.slot}${l.kind === "area" ? " is-area" : ""}${l.dashed ? " is-dashed" : ""}`} />))}
          </g>
          {crossX != null && <line className="calc-chart-cross" x1={crossX} x2={crossX} y1={model.top} y2={model.bottom} />}
          {hits.map(h => <circle key={h.line.key} className={`calc-chart-hit calc-chart-s${h.line.slot}`} cx={h.px} cy={h.py} r={4.5} />)}
          {model.markers.map((m, i) => (
            <g key={`m${i}`} className="calc-chart-marker"
              onPointerEnter={() => setHover({ marker: i })} onPointerDown={e => { e.stopPropagation(); setHover({ marker: i }); }}>
              <circle cx={m.px} cy={m.py} r={12} className="calc-chart-marker-hit" />
              <circle cx={m.px} cy={m.py} r={5} />
              {m.label && <text x={m.px + (m.px > (model.left + model.right) / 2 ? -9 : 9)} y={m.py - 9}
                textAnchor={m.px > (model.left + model.right) / 2 ? "end" : "start"}>{m.label}</text>}
            </g>
          ))}
        </svg>
        <CalcChartTip hits={hits} x={x} y={y} width={model.width} marker={marker} />
      </div>
      <CalcChartLegend lines={model.lines} />
      <CalcChartTable x={x} y={y} series={series} />
    </figure>
  );
}

Object.assign(window, { CalcChart, useCalcChartWidth });
