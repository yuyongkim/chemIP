// 온도별 물성 · 단위 고르기(K·몰 기준 / °C·질량 기준). 분자량이 없으면 몰 기준만 고를 수 있다.

function TpUnitToggle({ mode, setMode, canMass }) {
  const L = TP_LABELS.unit;
  return (
    <div className="seg" role="group" aria-label={L.label}>
      {TP_UNIT_MODES.map(m => (
        <button type="button" key={m} aria-pressed={mode === m} disabled={m === "mass" && !canMass} onClick={() => setMode(m)}>
          {L[m]}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { TpUnitToggle });
