// 비상대응 기준 · 표 칸 하나 — 값·단위(+ mg/m³ 줄, 계산값은 ≈), NR(자료 부족)·ND(정하지 않음), LEL 표시(*·**·***, title 에 뜻).
// 값 모양: el_helpers.jsx elValue. flagTitles: { "*": 뜻, ... } (AEGL 과 PAC 의 뜻 문구가 조금 다르다).

function ElValueCell({ v, flag, flagTitles }) {
  const L = EL_LABELS;
  if (!v) {
    if (flag === "NR") return <td className="muted pd-el-val" title={L.aegl.nrTitle}>{L.aegl.nr}</td>;
    if (flag === "ND") return <td className="muted pd-el-val" title={L.aegl.ndTitle}>{L.aegl.nd}</td>;
    return <td className="muted pd-el-val">—</td>;
  }
  const star = flag && flag !== "NR" && flag !== "ND" ? flag : "";
  return (
    <td className="pd-el-val">
      <span className="mono tnum">{v.text}</span>
      {star && <sup className="pd-el-flag" title={(flagTitles || {})[star] || ""}>{star}</sup>}{" "}
      <span className="muted">{v.unit}</span>
      {v.mg && <div className="muted pd-el-mg">{v.mg.derived ? "≈ " : ""}{v.mg.text} mg/m³</div>}
    </td>
  );
}

Object.assign(window, { ElValueCell });
