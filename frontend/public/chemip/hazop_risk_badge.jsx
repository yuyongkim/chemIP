// HAZOP 작성기 · 위험도 배지(점수 + 높음/보통/낮음). 기록지 줄·위험도 행렬·인쇄에서 함께 쓴다. 색은 calc.css .hz-risk.is-*

function HazopRiskBadge({ score, risk }) {
  const band = hzRiskBand(score, risk);
  const B = HAZOP_LABELS.risk.bands;
  return (
    <span className={`hz-risk is-${band}`}>
      {score == null ? B.none : <><b className="mono">{score}</b> {B[band]}</>}
    </span>
  );
}

Object.assign(window, { HazopRiskBadge });
