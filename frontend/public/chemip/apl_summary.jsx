// 적용 법규 판정기 · 법별 판정 요약 표(산안법 PSM · 화관법 · 위험물법): 판정 배지 · 핵심 값 · 대표 근거 링크. 인쇄·CSV 단추는 AplExport.

function AplSummary({ result, ccaLoading, children }) {
  const L = APL_LABELS;
  const S = L.summary;
  if (!result.filled.length) return <EmptyState card>{S.empty}</EmptyState>;
  const lines = [
    { k: "psm", r: result.psm, key: S.psmKey(result.psm), cite: "psm_dec43_1" },
    { k: "cca", r: result.cca, key: ccaLoading ? SAFETY_LABELS.common.loading : S.ccaKey(result.cca, L), cite: "cca_r_b4n2" },
    { k: "hazmat", r: result.hazmat, key: S.hazmatKey(result.hazmat), cite: "hz_act5" },
  ];
  return (
    <div className="panel calc-panel apl-summary">
      <h3><b>{S.title}</b></h3>
      <div className="body">
        <div className="calc-table-wrap">
          <table className="calc-table apl-table">
            <thead><tr><th>{S.cols.law}</th><th>{S.cols.verdict}</th><th>{S.cols.key}</th><th>{S.cols.basis}</th></tr></thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.k}>
                  <th scope="row">{S.laws[l.k]}</th>
                  <td><AplVerdict v={l.k === "cca" && ccaLoading ? "check" : l.r.verdict} /></td>
                  <td className="mono">{l.key}</td>
                  <td><AplCiteLink k={l.cite} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { AplSummary });
