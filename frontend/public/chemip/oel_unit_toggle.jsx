// 노출기준 비교 · 단위 고르기(원문 단위 / ppm / mg/m³). 분자량이 없으면 원문 단위만 고를 수 있다.

function OelUnitToggle({ mode, setMode, canConvert }) {
  const L = OEL_LABELS.unit;
  return (
    <div className="seg" role="group" aria-label={L.label}>
      {OEL_UNIT_MODES.map(m => (
        <button type="button" key={m} aria-pressed={mode === m} disabled={m !== "source" && !canConvert} onClick={() => setMode(m)}>
          {L[m]}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { OelUnitToggle });
