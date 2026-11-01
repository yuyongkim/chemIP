// 적용 법규 판정기 · 화학물질관리법 패널: 사업장 구간(1군·2군·…)과 설명, 물질별 최대보유량 Q 와 최하위·하위·상위 규정수량 표,
// 영업허가·신고 안내, 행별 이유, 보관시설 R·저확산 안내, 근거. 규정수량 자료가 없으면 그 안내만.

function AplCcaPanel({ cca, names, loading }) {
  const L = APL_LABELS.cca;
  const T = APL_TERMS;
  const R = APL_LABELS.reasons;
  const entries = cca.items.map(i => ({ id: i.id, name: names[i.id] || i.cas || i.id, reasons: i.reasons }));
  const src = (b) => (b.source === "annex3" ? L.source.annex3(b.no) : L.source.annex2(b.no));
  const bname = (g) => {
    const b = g.bands[0];
    return `${names[g.ids[0]] || g.cas} — ${src(b)}${b.band && L.bandNames[b.band] ? ` · ${L.bandNames[b.band]}` : ""}`;
  };
  return (
    <div className="panel calc-panel">
      <h3><b>{L.title}</b> <AplVerdict v={loading ? "check" : cca.verdict} /></h3>
      <div className="body apl-law">
        {loading && <p className="calc-hint">{SAFETY_LABELS.common.loading}</p>}
        {!loading && cca.items.some(i => i.reasons.some(r => r.k === "ccaTableOff")) && <div className="calc-alert is-warn">{L.tableOff}</div>}
        <div className="calc-out">
          <span className="calc-out-k">{L.tiers[cca.tier]}<TermHint term={T.ccaTier} /></span>
          <span className="calc-out-v" />
          <span className="calc-out-u" />
        </div>
        <p className="apl-text">{L.tierText[cca.tier]}</p>
        {cca.groups.length > 0 && (
          <div className="calc-table-wrap">
            <table className="calc-table apl-table">
              <thead><tr>
                <th>{L.cols.name}</th>
                <th className="num">{L.cols.Q}<TermHint term={T.qty} /></th>
                <th className="num">{L.cols.lowest}<TermHint term={T.ccaQty} /></th>
                <th className="num">{L.cols.lower}</th>
                <th className="num">{L.cols.upper}</th>
                <th>{L.cols.tier}</th>
              </tr></thead>
              <tbody>
                {cca.groups.map(g => (
                  <tr key={g.cas}>
                    <td>{bname(g)}</td>
                    <td className="num mono">{aplFmt(g.Q)}</td>
                    <td className="num mono">{aplFmt(g.lowest)}</td>
                    <td className="num mono">{aplFmt(g.lower)}</td>
                    <td className="num mono">{g.upper == null ? L.noUpper : aplFmt(g.upper)}</td>
                    <td><span className={`apl-band is-${g.tier}`}>{L.tierCell[g.tier]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(cca.tier === "tier1" || cca.tier === "tier2" || cca.tier === "lowest") && <p className="apl-text">{L.permit}</p>}
        {cca.flags.map((f, i) => <div key={i} className="calc-alert is-warn">{R[f.k](f.v || {})}</div>)}
        <AplReasonList entries={entries} />
        <p className="calc-hint">{L.note} {L.oldPlans}</p>
        <div className="apl-cites">{cca.cites.map(k => <AplCiteLink key={k} k={k} />)}</div>
      </div>
    </div>
  );
}

Object.assign(window, { AplCcaPanel });
