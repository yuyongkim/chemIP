// PRTR 지도 · 고른 물질의 합계 한 줄(신고 사업장·배출량·이동량·자료 연도). 값은 파일의 totals 그대로.

function PrtrMapStats({ body }) {
  const S = PRTR_MAP_LABELS.stats;
  const t = body.totals || {};
  const cells = [
    [S.facilities, Number(t.facilities || 0).toLocaleString("ko-KR")],
    [S.release, fmtKg(t.release_kg)],
    [S.transfer, fmtKg(t.transfer_kg)],
    [S.year, body.year || "—"],
  ];
  return (
    <div className="stats-mini prtr-stats">
      {cells.map(([m, v]) => (
        <div key={m}>
          <div className="m">{m}</div>
          <div className="v tnum">{v}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { PrtrMapStats });
