// 규제 목록 · 목록 한 장(이름·법령·나라·건수·개정일). 누르면 목록 화면(주소 ?view=reg&list=<id>). 문구: REG_LABELS.

function RegListCard({ meta, onOpen }) {
  const L = REG_LABELS;
  const open = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // 새 탭은 브라우저에 맡긴다
    e.preventDefault();
    onOpen(meta.id);
  };
  return (
    <a className="card reg-card" href={regHref(meta.id)} onClick={open}>
      <div className="reg-card-head">
        <span className="chip pd-chip-10">{jurisdictionName(meta.j)}</span>
        <span className="mono tnum muted reg-mini">{L.count(meta.n.toLocaleString("ko-KR"), meta.cas.toLocaleString("ko-KR"))}</span>
      </div>
      <b className="reg-card-title">{regListTitle(meta)}</b>
      <div className="muted reg-mini">
        {[meta.law, meta.amended_on ? L.amended(meta.amended_on) : ""].filter(Boolean).join(" · ")}
      </div>
    </a>
  );
}

Object.assign(window, { RegListCard });
