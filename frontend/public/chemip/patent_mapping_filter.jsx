// 특허 매핑 · 관할 고르기(최근 등록 전체 / 관할 한 곳). 목록: pmJurisdictionOptions. 문구: PATENT_MAPPING_LABELS.

function PmFilter({ options, value, onChange }) {
  const L = PATENT_MAPPING_LABELS;
  return (
    <label className="pd-pm-filter">
      <span className="muted">{L.filterLabel}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{L.filterRecent}</option>
        {options.map(o => <option key={o.code} value={o.code}>{L.filterOption(`${o.code} ${o.name}`, o.n)}</option>)}
      </select>
    </label>
  );
}

Object.assign(window, { PmFilter });
