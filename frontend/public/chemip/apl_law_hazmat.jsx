// 적용 법규 판정기 · 위험물안전관리법 패널: 행별 품명·양·지정수량·배수 표, 시설(제조소등)별 배수 합계와 허가·안전관리자 자격·
// 예방규정·정기점검(·이행 실태 평가·정기검사 확인), 사업소 자체소방대, 행별 이유, 근거.

function AplHazmatItems({ items, names }) {
  const L = APL_LABELS.hz;
  const T = APL_TERMS;
  const shown = items.filter(i => i.item);
  if (!shown.length) return <p className="calc-hint">{L.none}</p>;
  return (
    <div className="calc-table-wrap">
      <table className="calc-table apl-table">
        <thead><tr>
          <th>{L.cols.name}</th><th>{L.cols.item}</th>
          <th className="num">{L.cols.amount}</th>
          <th className="num">{L.cols.qty}<TermHint term={T.hzQty} /></th>
          <th className="num">{L.cols.mult}<TermHint term={T.hzMult} /></th>
        </tr></thead>
        <tbody>
          {shown.map(i => (
            <tr key={i.id}>
              <td>{names[i.id] || i.id}</td>
              <td>{tr(i.item.ko, i.item.en)}</td>
              <td className="num mono">{i.amount == null ? "—" : `${aplFmt(i.amount)} ${i.item.unit}`}</td>
              <td className="num mono">{aplFmt(i.item.qty)} {i.item.unit}</td>
              <td className="num mono">{i.status === "belowConc" ? "—" : aplFmt(i.mult, 3)}{i.status === "conditional" ? ` (${L.conditional})` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AplHazmatFacilities({ facilities }) {
  const L = APL_LABELS.hz;
  if (!facilities.length) return null;
  const mark = (v, maybe) => (maybe ? L.maybe : v ? L.yes : L.no);
  return (
    <div className="calc-table-wrap">
      <table className="calc-table apl-table">
        <thead><tr>
          <th>{L.facCols.fac}</th><th className="num">{L.facCols.mult}</th><th>{L.facCols.permit}</th>
          <th>{L.facCols.manager}</th><th>{L.facCols.prevention}</th><th>{L.facCols.inspection}</th>
        </tr></thead>
        <tbody>
          {facilities.map(f => {
            const fac = APL_HAZMAT.facilities[f.fac];
            return (
              <tr key={f.fac}>
                <td>{tr(fac.ko, fac.en)}</td>
                <td className="num mono">{aplFmt(f.mult, 3)}</td>
                <td>{f.permit ? <AplVerdict v="applies" /> : null} {f.permit ? L.permitYes : L.permitNo}</td>
                <td>{f.permit ? (f.managerLow ? L.managerLow : L.managerHigh) : L.no}</td>
                <td>{mark(f.prevention, f.preventionMaybe)}{f.audit ? ` · ${L.audit}` : ""}</td>
                <td>{mark(f.inspection, f.preventionMaybe && f.inspection)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AplHazmatPanel({ hazmat, names }) {
  const L = APL_LABELS.hz;
  const entries = hazmat.items.map(i => ({ id: i.id, name: names[i.id] || i.id, reasons: i.reasons }));
  const tank = hazmat.facilities.find(f => f.fac === "tank_out");
  return (
    <div className="panel calc-panel">
      <h3><b>{L.title}</b> <AplVerdict v={hazmat.verdict} /></h3>
      <div className="body apl-law">
        <AplHazmatItems items={hazmat.items} names={names} />
        <AplHazmatFacilities facilities={hazmat.facilities} />
        <p className="apl-text">{hazmat.brigade.required ? L.brigade(hazmat.brigade) : L.brigadeNo(hazmat.brigade)}</p>
        {hazmat.facilities.some(f => f.preventionMaybe) && <div className="calc-alert is-warn">{L.preventionMaybe}</div>}
        {tank && tank.regularMaybe && <div className="calc-alert is-warn">{L.regular(tank.liquidL)}</div>}
        <AplReasonList entries={entries} />
        <p className="calc-hint">{L.place}</p>
        <div className="apl-cites">{hazmat.cites.map(k => <AplCiteLink key={k} k={k} />)}</div>
      </div>
    </div>
  );
}

Object.assign(window, { AplHazmatItems, AplHazmatFacilities, AplHazmatPanel });
