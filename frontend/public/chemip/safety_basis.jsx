// 안전 도구 공용 · 근거·자료 출처와 "참고용 선별 도구" 안내 패널. 항목 글은 각 도구 문구(SAFETY_LABELS.compat/mix 의 basis·disclaimer).

function SafetyBasis({ basis, disclaimer, asOf }) {
  const L = SAFETY_LABELS.common;
  return (
    <div className="panel calc-panel sft-basis">
      <h3><b>{L.disclaimerTitle}</b></h3>
      <div className="body">
        <ul className="calc-list sft-disclaimer">{disclaimer.map((t, i) => <li key={i}>{t}</li>)}</ul>
        <div className="calc-sub">{L.basisTitle}{asOf ? <span className="muted"> · {asOf}</span> : null}</div>
        <ul className="calc-list calc-refs">{basis.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </div>
    </div>
  );
}

Object.assign(window, { SafetyBasis });
