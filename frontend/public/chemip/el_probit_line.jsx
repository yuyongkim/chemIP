// 비상대응 기준 · RIVM 치사 probit 한 줄 — 식·상태·확정일·원문, 독성 probit 계산기(이 물질로 채움) 링크.

function ElProbitLine({ file, name }) {
  const L = EL_LABELS.probit;
  const p = file && file.probit;
  if (!p) return null;
  const href = calcHref("toxic_probit", { src: "rivm", sub: file.cas }, name || "");
  return (
    <div className="pd-el-block">
      <div className="pd-el-sub">
        <b>{L.title}</b>
        <span className="chip">{L.status[p.status] || p.status}{p.established ? ` · ${p.established}` : ""}</span>
        {p.page && <SourceLink url={p.page} label={EL_LABELS.open} />}
      </div>
      <div className="mono pd-el-probit">{L.line(p.a, p.b, p.n)}</div>
      <a className="mono pd-link-xs" href={href}>{L.calc}</a>
    </div>
  );
}

Object.assign(window, { ElProbitLine });
