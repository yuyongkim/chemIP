// 단위 고르기 — 입력 칸·결과 줄 공용. 단위 목록은 CALC_UNITS[dim](calc_units.jsx).

function CalcUnitSelect({ dim, unit, label, onChange }) {
  return (
    <select className="calc-unit" value={unit} aria-label={CALC_LABELS.unitAria(label)} onChange={e => onChange(e.target.value)}>
      {Object.entries(CALC_UNITS[dim]).map(([k, u]) => <option key={k} value={k}>{u.label}</option>)}
    </select>
  );
}

Object.assign(window, { CalcUnitSelect });
