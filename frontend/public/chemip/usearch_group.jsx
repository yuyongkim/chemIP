// 통합 검색 · 묶음 하나 — 머리(이름·건수), 위쪽 몇 건, "더 보기"(다른 화면 주소가 있으면 그 화면, 없으면 이 자리에서 펼침).
// group 모양: usGroupView(usearch_core.jsx).

function UsGroup({ group, query }) {
  const L = USEARCH_LABELS;
  const [open, setOpen] = useState(false);
  const items = open ? [...group.items, ...group.extra] : group.items;
  const canExpand = !group.moreHref && group.extra.length > 0;
  return (
    <section className="us-group" aria-labelledby={`us-g-${group.k}`}>
      <header className="us-group-head">
        <Icon name={group.icon} size={14} className="us-group-icon" />
        <h2 id={`us-g-${group.k}`} className="us-group-title">{L.groups[group.k]}</h2>
        {group.status === "done" && <span className="us-group-count">{L.count(group.total)}</span>}
        {group.status === "loading" && <span className="muted us-group-count">{L.loading}</span>}
      </header>
      {items.length > 0 && <ul className="us-list">{items.map(it => <UsItem key={it.id} item={it} query={query} />)}</ul>}
      {group.moreHref && group.hidden > 0 && (
        <a className="us-more" href={group.moreHref}>{L.moreAll} · {L.more(group.hidden)} <Icon name="chev" size={11} /></a>
      )}
      {canExpand && (
        <button className="us-more" onClick={() => setOpen(v => !v)} aria-expanded={open}>
          {open ? L.less : L.more(group.extra.length)} <Icon name="down" size={11} />
        </button>
      )}
    </section>
  );
}

Object.assign(window, { UsGroup });
