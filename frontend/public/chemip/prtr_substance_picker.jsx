// PRTR 지도 · 물질 고르기 — 이름·CAS 거르기 칸, 고르기 상자(거른 목록), 사업장 많은 물질 바로가기.
// 목록은 usePrtrIndex 결과(prtrSubstances)를 받아 그리기만 한다. 문구: PRTR_MAP_LABELS.picker. 스타일: product_views.css(.prtr-*).

const PRTR_POPULAR_N = 6;

function PrtrSubstancePicker({ substances, cas, onPick }) {
  const L = PRTR_MAP_LABELS.picker;
  const [q, setQ] = useState("");
  const list = prtrFilterSubstances(substances, q);
  const current = substances.find(s => s.cas === cas);
  const options = current && !list.includes(current) ? [current, ...list] : list;
  const pickFirst = (e) => { if (e.key === "Enter" && list[0]) { e.preventDefault(); onPick(list[0].cas); } };
  return (
    <div className="prtr-picker">
      <div className="prtr-picker-row">
        <label className="prtr-field">
          <span className="prtr-field-label">{L.filter}</span>
          <input type="search" className="prtr-input" value={q} placeholder={L.placeholder}
            onChange={(e) => setQ(e.target.value)} onKeyDown={pickFirst} />
        </label>
        <label className="prtr-field">
          <span className="prtr-field-label">{L.select}</span>
          <select className="prtr-select" value={cas || ""} onChange={(e) => e.target.value && onPick(e.target.value)}>
            {!current && <option value="">{L.choose}</option>}
            {options.map(s => (
              <option key={s.cas} value={s.cas}>{L.option(prtrSubstanceName(s, CHEMIP_LANG), s.cas, s.facilities)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="muted prtr-picker-meta" aria-live="polite">{q && !list.length ? L.none : L.count(list.length)}</div>
      <div className="prtr-popular" aria-label={L.popular}>
        <span className="muted prtr-popular-label">{L.popular}</span>
        {substances.slice(0, PRTR_POPULAR_N).map(s => (
          <button key={s.cas} type="button" className={`chip prtr-chip${s.cas === cas ? " on" : ""}`} aria-pressed={s.cas === cas}
            onClick={() => onPick(s.cas)}>
            {prtrSubstanceName(s, CHEMIP_LANG)}
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { PrtrSubstancePicker });
