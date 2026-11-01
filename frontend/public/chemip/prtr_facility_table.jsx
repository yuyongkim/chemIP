// PRTR 지도 · 사업장 목록(신고 합계 큰 순, 파일 순서 그대로). 사업장 이름·주소는 원문 그대로, 값은 신고 값(kg/년).
// 좁은 화면에서는 소재지 칸을 숨기고 이름 아래 한 줄로 보인다(product_views.css .prtr-addr*).

const PRTR_FACILITY_PREVIEW = 20;

function PrtrFacilityTable({ facilities }) {
  const L = PRTR_MAP_LABELS;
  const C = L.facilityCols;
  const [open, setOpen] = useState(false);
  const rows = open ? facilities : facilities.slice(0, PRTR_FACILITY_PREVIEW);
  return (
    <div className="prtr-facilities">
      <h4 className="prtr-subhead">{L.region.facilities} <span className="muted prtr-sort-note">· {L.sortNote}</span></h4>
      <table className="pat-table prtr-table">
        <thead>
          <tr>
            <th scope="col" className="pd-th-num">#</th>
            <th scope="col">{C.name}</th>
            <th scope="col" className="prtr-addr">{C.address}</th>
            <th scope="col" className="pd-num prtr-col-amt">{C.release}</th>
            <th scope="col" className="pd-num prtr-col-amt">{C.transfer}</th>
            <th scope="col" className="pd-num">{C.total}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f, i) => (
            <tr key={`${f.name}-${f.address}-${i}`}>
              <td className="pid">{i + 1}</td>
              <td className="title-cell">
                <b>{f.name}</b>
                <div className="muted prtr-addr-inline">{f.address}</div>
              </td>
              <td className="muted pd-td-sm prtr-addr">{f.address}</td>
              <td className="tnum pd-num pd-td-sm prtr-col-amt">{fmtKg(f.release_kg)}</td>
              <td className="tnum pd-num pd-td-sm prtr-col-amt">{fmtKg(f.transfer_kg)}</td>
              <td className="tnum pd-num pd-td-sm">{fmtKg(f.reported_total_kg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {facilities.length > PRTR_FACILITY_PREVIEW && (
        <div className="pd-more-row">
          <button type="button" className="btn" onClick={() => setOpen(v => !v)}>
            {open ? L.less : L.more(facilities.length - PRTR_FACILITY_PREVIEW)}
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PrtrFacilityTable });
