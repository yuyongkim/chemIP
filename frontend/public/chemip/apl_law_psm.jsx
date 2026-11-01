// 적용 법규 판정기 · 산업안전보건법 PSM 패널: 별표 13 줄별 규정량 T·최대량 C·C/T 표, R 합계, 해석 차이·업종 안내, 행별 이유, 제외 설비, 근거.

function AplPsmPanel({ psm, names }) {
  const L = APL_LABELS.psm;
  const T = APL_TERMS;
  const name = (g) => (g.key.startsWith("flam_") ? `${g.ref.no}. ${tr(g.ref.ko, g.ref.en)}` : `${g.ref.no}. ${tr(g.ref.ko, g.ref.en)}`);
  const entries = psm.items.map(i => ({ id: i.id, name: names[i.id] || i.id, reasons: i.reasons }));
  return (
    <div className="panel calc-panel">
      <h3><b>{L.title}</b> <AplVerdict v={psm.verdict} /></h3>
      <div className="body apl-law">
        {psm.groups.length > 0
          ? <div className="calc-table-wrap">
              <table className="calc-table apl-table">
                <thead><tr>
                  <th>{L.cols.name}</th>
                  <th className="num">{L.cols.T}<TermHint term={T.psmQty} /></th>
                  <th className="num">{L.cols.C}</th>
                  <th className="num">{L.cols.ratio}</th>
                </tr></thead>
                <tbody>
                  {psm.groups.map(g => (
                    <tr key={g.key}>
                      <td>{name(g)}</td>
                      <td className="num mono">{typeof g.T === "object" ? L.flamT(g.T) : aplFmt(g.T)}</td>
                      <td className="num mono">{g.key.startsWith("flam_") ? L.flamC(g) : aplFmt(g.handle + g.store)}</td>
                      <td className="num mono">{aplFmt(g.ratio, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          : <p className="calc-hint">{L.none}</p>}
        <div className="calc-out">
          <span className="calc-out-k">{L.R(psm)}<TermHint term={T.psmR} /></span>
          <span className="calc-out-v mono tnum">{aplFmt(psm.R, 3)}</span>
          <span className="calc-out-u" />
        </div>
        <p className="apl-text">{psm.industry ? L.industry(tr(psm.industry.ko, psm.industry.en)) : L.applies}</p>
        {(psm.R >= 1) !== (psm.Ralt >= 1) && <div className="calc-alert is-warn">{L.alt(psm)}</div>}
        <AplReasonList entries={entries} />
        <p className="calc-hint">{L.note}</p>
        <Collapsible summary={L.excludedTitle}>
          <ul className="calc-list">{APL_PSM.excluded.map((x, i) => <li key={i}>{tr(x.ko, x.en)}</li>)}</ul>
        </Collapsible>
        <div className="apl-cites">{psm.cites.map(k => <AplCiteLink key={k} k={k} />)}</div>
      </div>
    </div>
  );
}

Object.assign(window, { AplPsmPanel });
