// 계산기 그래프 말풍선 — 가리킨(또는 누른) x 에서 계열마다 가장 가까운 점의 값. 위치는 그래프 폭 안으로 맞춘다.
// hits: calcChartNearest 결과, x·y: 축 정의(이름·단위). 숫자 표기는 calcFormatNumber(calc_engine.jsx).

function CalcChartTip({ hits, x, y, width, marker }) {
  if (!hits.length && !marker) return null;
  const anchor = marker ? { px: marker.px, py: marker.py } : hits[0];
  const flip = anchor.px > width * 0.6;
  const unit = (s) => (s?.unit && s.unit !== "—" ? ` ${s.unit}` : "");
  const style = flip ? { right: Math.max(0, width - anchor.px + 10) } : { left: anchor.px + 10 };
  const xVal = marker ? marker.x : hits[0].pt[0];
  return (
    <div className="calc-chart-tip" style={{ ...style, top: Math.max(0, anchor.py - 12) }} role="status">
      {marker?.label && <div className="calc-chart-tip-head">{marker.label}</div>}
      <div className="calc-chart-tip-x">{x?.label} = <b className="mono tnum">{calcFormatNumber(xVal, 4)}</b>{unit(x)}</div>
      {marker
        ? <div className="calc-chart-tip-row">{y?.label} = <b className="mono tnum">{calcFormatNumber(marker.y, 4)}</b>{unit(y)}</div>
        : hits.map(h => (
          <div key={h.line.key} className="calc-chart-tip-row">
            <span className={`calc-chart-swatch calc-chart-s${h.line.slot}`} aria-hidden="true" />
            {h.line.label ? `${h.line.label}: ` : `${y?.label} = `}<b className="mono tnum">{calcFormatNumber(h.pt[1], 4)}</b>{unit(y)}
          </div>
        ))}
    </div>
  );
}

Object.assign(window, { CalcChartTip });
