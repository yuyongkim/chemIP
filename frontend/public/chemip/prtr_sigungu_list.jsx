// PRTR 지도 · 고른 지역의 시군구별 사업장 수(많은 순). 자료: prtrSigunguIn(파일의 sigungu). 시군구 이름은 원문(한국어) 그대로.

const PRTR_SIGUNGU_PREVIEW = 12;

function PrtrSigunguList({ items, showRegion, names }) {
  const L = PRTR_MAP_LABELS.region;
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const rows = open ? items : items.slice(0, PRTR_SIGUNGU_PREVIEW);
  return (
    <div className="prtr-sigungu">
      <h4 className="prtr-subhead">{L.sigungu}</h4>
      <ul className="prtr-sigungu-list">
        {rows.map(s => (
          <li key={`${s.iso}-${s.name}`} className="prtr-sigungu-item">
            <span>{showRegion ? `${prtrRegionName(names, s.iso, CHEMIP_LANG)} ` : ""}{s.name}</span>
            <span className="tnum muted">{L.sigunguCount(s.facilities)}</span>
          </li>
        ))}
      </ul>
      {items.length > PRTR_SIGUNGU_PREVIEW && (
        <button type="button" className="ui-link-btn" onClick={() => setOpen(v => !v)}>
          {open ? PRTR_MAP_LABELS.less : PRTR_MAP_LABELS.more(items.length - PRTR_SIGUNGU_PREVIEW)}
        </button>
      )}
    </div>
  );
}

Object.assign(window, { PrtrSigunguList });
