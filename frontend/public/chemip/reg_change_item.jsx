// 규제 목록 · 변경 한 건(종류 배지·목록·물질·날짜·출처·원문 링크). 표시 값은 regChangeView(reg_helpers.jsx). 문구: REG_LABELS.changes.

function RegChangeItem({ item, listById, onOpen }) {
  const L = REG_LABELS.changes;
  const v = regChangeView(item, L, listById);
  const openList = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    onOpen(item.list);
  };
  return (
    <div className="reg-change">
      <div className="reg-change-head">
        <Badge tone={v.tone}>{v.kind}</Badge>
        <span className="mono tnum muted reg-mini">{v.date}</span>
      </div>
      {v.list && (v.href ? <a className="reg-change-list" href={v.href} onClick={openList}>{v.list}</a> : <div className="reg-change-list">{v.list}</div>)}
      {v.what && v.what !== v.list && <div className="reg-change-what">{v.what}{v.cas && v.what !== v.cas ? <span className="mono muted"> · {v.cas}</span> : null}</div>}
      <div className="muted reg-mini">
        {v.src}{v.url ? <> · <a href={v.url} target="_blank" rel="noopener">{L.link}</a></> : null}
      </div>
    </div>
  );
}

Object.assign(window, { RegChangeItem });
