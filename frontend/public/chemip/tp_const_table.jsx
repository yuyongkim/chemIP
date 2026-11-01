// 온도별 물성 · 임계·기준 상수 표(줄 = 상수 하나, 출처가 여럿이면 값·배지를 나란히). 줄 모양: tpConstRows(tp_helpers.jsx).

function TpConstTable({ rows, sources }) {
  const L = TP_LABELS;
  if (!rows.length) return null;
  return (
    <div className="pd-tp-wrap">
      <table className="pat-table pd-tp-table pd-tp-consts">
        <caption className="pd-tp-cap">{L.constTitle}</caption>
        <tbody>
          {rows.map(r => (
            <tr key={r.k}>
              <th scope="row">{r.label}</th>
              <td>
                {r.items.map((it, i) => (
                  <span key={i} className="pd-tp-cval"><span className="mono tnum">{it.text}</span> <TpSourceBadge src={it.src} sources={sources} /></span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { TpConstTable });
