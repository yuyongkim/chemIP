// 경고표지 입력 · 그림문자 고르기 — 9종을 그림 단추로(누르면 넣기/빼기). 순서는 GHS_PICTOGRAM_CODES.

function GhsPictPicker({ value, onChange }) {
  const L = GHS_LABELS;
  const picked = value || [];
  const toggle = (code) => {
    const next = picked.includes(code) ? picked.filter(c => c !== code) : [...picked, code];
    onChange(GHS_PICTOGRAM_CODES.filter(c => next.includes(c)));
  };
  return (
    <div className="calc-field gl-field-wide">
      <span className="calc-label">{L.form.pictograms}</span>
      <div className="gl-pick" role="group" aria-label={L.form.pictograms}>
        {GHS_PICTOGRAM_CODES.map(code => (
          <button key={code} type="button" className="gl-pick-btn" aria-pressed={picked.includes(code)} onClick={() => toggle(code)}>
            <img src={ghsPictogramSrc(code)} alt="" />
            <span><span className="mono">{code}</span> {L.pictograms[code]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { GhsPictPicker });
