// 규제 목록 · 목록 전체(거르기 칸·나라 고르기·묶음별 카드). 자료는 부모(RegView)가 넘긴 lists.json. 문구: REG_LABELS.

function RegIndex({ data, onOpen }) {
  const L = REG_LABELS;
  const [q, setQ] = useState("");
  const [jur, setJur] = useState("");
  const lists = data?.lists || [];
  const shown = React.useMemo(() => regFilterLists(lists, q, jur), [lists, q, jur]);
  const groups = regGroupLists(shown, data?.groups);
  const rows = lists.reduce((s, m) => s + m.n, 0);
  return (
    <div className="reg-index">
      <div className="reg-tools">
        <div className="pv-box reg-box">
          <Icon name="search" size={14} />
          <input className="pv-input" value={q} onChange={e => setQ(e.target.value)} placeholder={L.filter} aria-label={L.filterAria} />
        </div>
        <select className="tc-select" value={jur} onChange={e => setJur(e.target.value)} aria-label={L.allJur}>
          <option value="">{L.allJur}</option>
          {regJurisdictions(lists).map(({ j, n }) => <option key={j} value={j}>{`${jurisdictionName(j)} (${n})`}</option>)}
        </select>
      </div>
      <div className="muted mono reg-mini">{L.summary(lists.length.toLocaleString("ko-KR"), rows.toLocaleString("ko-KR"))}</div>
      {!groups.length && <EmptyState card>{L.noLists}</EmptyState>}
      {groups.map(({ g, lists: ls }) => (
        <section key={g} className="reg-group">
          <h2 className="reg-group-title">{L.groups[g] || g} <span className="muted mono reg-mini">{L.groupCount(ls.length)}</span></h2>
          <div className="reg-grid">
            {ls.map(m => <RegListCard key={m.id} meta={m} onOpen={onOpen} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

Object.assign(window, { RegIndex });
