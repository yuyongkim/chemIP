// 비상대응 기준 · 작업장 노출기준과 견주기 — TWA·IDLH(노출기준 비교 자료, api_oel.jsx) 옆에 AEGL-2 60분·PAC-2·독성 끝점,
// 그리고 노출기준 비교 표(#oel)로 가는 링크. 칩 모양: el_helpers.jsx elOelCompare / elEndpoint.

function ElOelCompare({ file, oel }) {
  const L = EL_LABELS;
  const chips = elOelCompare(file, oel, L, src => (OEL_LABELS.sources[src] || src));
  const ep = elEndpoint(file);
  return (
    <div className="pd-el-block pd-el-compare">
      <div className="pd-el-sub">
        <b>{L.oel.title}</b>
        <a className="mono pd-link-xs" href="#oel">{L.oel.link}</a>
      </div>
      {ep && (
        <div className="pd-el-endpoint">
          <span className="muted">{L.endpoint.title}</span>{" "}
          <b className="mono tnum">{oelFmt(ep.value)} {elUnitName(ep.unit)}</b>{" "}
          <span className="chip">{L.endpoint.via[ep.via]}</span>
          {ep.mg != null && <span className="muted"> ({oelFmt(ep.mg)} mg/m³)</span>}
        </div>
      )}
      {chips.length > 0 && (
        <div className="pd-el-chips">
          {chips.map(c => <span key={c.k} className="chip"><span className="muted">{c.label}</span> <span className="mono tnum">{c.text}</span></span>)}
        </div>
      )}
      <div className="muted pd-mini">{L.oel.hint} {L.endpoint.hint}</div>
    </div>
  );
}

Object.assign(window, { ElOelCompare });
