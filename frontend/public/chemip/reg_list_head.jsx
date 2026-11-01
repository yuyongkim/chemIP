// 규제 목록 · 목록 화면 머리(이름·나라·법령·개정일·원문 판·라이선스·건수·원문 링크). 문구: REG_LABELS.

function RegListHead({ head, license }) {
  const L = REG_LABELS;
  const line = [head.law, head.amended_on ? L.amended(head.amended_on) : "", head.retrieved ? L.retrieved(head.retrieved) : ""];
  return (
    <div className="panel">
      <h3><b>{regListTitle(head)}</b><span className="muted">{jurisdictionName(head.j)}</span></h3>
      <div className="body reg-meta">
        <div>{line.filter(Boolean).join(" · ")}</div>
        {head.version && <div className="muted reg-mini">{L.detail.version(head.version)}</div>}
        {license && <div className="muted reg-mini">{L.detail.license(license)}</div>}
        <div className="mono tnum reg-mini">
          {L.count((head.n || 0).toLocaleString("ko-KR"), (head.cas || 0).toLocaleString("ko-KR"))}{" "}
          <SourceLink url={head.url} label={L.detail.source} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RegListHead });
