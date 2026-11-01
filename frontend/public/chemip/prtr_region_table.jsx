// PRTR 지도 · 시도별 표 — 지도와 같은 값(사업장 수·배출·이동·합계)을 표로. 화면 읽기 프로그램과 좁은 화면(390px)의 대안이고,
// 지역 이름 단추로 지도와 같이 지역을 고른다. 행 순서는 파일의 regions(시도 목록 순서), 신고 없는 시도도 0 으로 보인다.

function PrtrRegionTable({ regions, names, active, onSelect }) {
  const L = PRTR_MAP_LABELS.table;
  const byIso = Object.fromEntries((regions || []).map(r => [r.iso, r]));
  const order = Object.keys(names);
  return (
    <table className="pat-table prtr-table">
      <caption className="prtr-caption">{L.caption}</caption>
      <thead>
        <tr>
          <th scope="col">{L.region}</th>
          <th scope="col" className="pd-num">{L.facilities}</th>
          <th scope="col" className="pd-num prtr-col-amt">{L.release}</th>
          <th scope="col" className="pd-num prtr-col-amt">{L.transfer}</th>
          <th scope="col" className="pd-num">{L.total}</th>
        </tr>
      </thead>
      <tbody>
        {order.map(iso => {
          const r = byIso[iso] || { facilities: 0, release_kg: 0, transfer_kg: 0, reported_total_kg: 0 };
          const name = prtrRegionName(names, iso, CHEMIP_LANG);
          return (
            <tr key={iso} className={iso === active ? "prtr-row-on" : ""}>
              <th scope="row">
                <button type="button" className="ui-link-btn prtr-region-btn" aria-pressed={iso === active}
                  aria-label={L.select(name)} onClick={() => onSelect(iso === active ? "" : iso)}>{name}</button>
              </th>
              <td className="tnum pd-num">{Number(r.facilities).toLocaleString("ko-KR")}</td>
              <td className="tnum pd-num pd-td-sm prtr-col-amt">{fmtKg(r.release_kg)}</td>
              <td className="tnum pd-num pd-td-sm prtr-col-amt">{fmtKg(r.transfer_kg)}</td>
              <td className="tnum pd-num pd-td-sm">{fmtKg(r.reported_total_kg)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

Object.assign(window, { PrtrRegionTable });
