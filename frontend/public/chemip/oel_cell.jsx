// 노출기준 비교 · 표 칸 하나(한 출처의 TWA·STEL·C·IDLH 중 하나) — 값·단위, 값마다 다른 표시, 계산값은 ≈ 와 title.

function OelCell({ values }) {
  const L = OEL_LABELS;
  if (!values.length) return <td className="muted pd-oel-val">{L.empty}</td>;
  return (
    <td className="pd-oel-val">
      {values.map((v, i) => (
        <div key={i} className="pd-oel-line" title={v.derived ? L.derivedTitle : undefined}>
          <span className="mono tnum">{v.derived ? `${L.derivedMark} ` : ""}{oelFmt(v.value, v.derived)}</span>{" "}
          <span className="muted">{oelUnitName(v.unit)}</span>
          {v.note && <div className="muted pd-oel-note">{v.note}</div>}
        </div>
      ))}
    </td>
  );
}

Object.assign(window, { OelCell });
