// 온도별 물성 · 그래프 물성 고르기(파일에 있는 묶음만, TP_PROPS 순서).

function TpPropPicker({ props, value, onChange }) {
  const L = TP_LABELS;
  return (
    <div className="seg pd-tp-props" role="group" aria-label={L.propLabel}>
      {props.map(p => (
        <button type="button" key={p.k} aria-pressed={value === p.k} onClick={() => onChange(p.k)}>{L.props[p.k]}</button>
      ))}
    </div>
  );
}

Object.assign(window, { TpPropPicker });
