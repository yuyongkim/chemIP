// 규제 목록 · "최근 변경" 패널(처음 12건, 더 보기, RSS 구독 링크). 자료는 부모(RegView)가 넘긴 changes.json·lists.json.
// 문구: REG_LABELS.changes.

const REG_CHANGES_FIRST = 12;

function RegChangesPanel({ changes, lists, onOpen }) {
  const L = REG_LABELS.changes;
  const [all, setAll] = useState(false);
  const items = changes?.items || [];
  const listById = React.useMemo(() => Object.fromEntries((lists || []).map(m => [m.id, m])), [lists]);
  const shown = all ? items : items.slice(0, REG_CHANGES_FIRST);
  return (
    <aside className="panel reg-changes" aria-label={L.title}>
      <h3><b>{L.title}</b><a className="mono" href={regRssUrl()} target="_blank" rel="noopener" title={L.rssTitle} type="application/rss+xml">{L.rss}</a></h3>
      <div className="body">
        <div className="muted reg-mini">{L.note}</div>
        {!items.length && <EmptyState>{L.none}</EmptyState>}
        {shown.map((it, i) => <RegChangeItem key={`${it.d}|${it.list}|${it.cas}|${it.url}|${i}`} item={it} listById={listById} onOpen={onOpen} />)}
        {items.length > REG_CHANGES_FIRST && (
          <button type="button" className="ui-link-btn" onClick={() => setAll(v => !v)}>{all ? L.less : L.more}</button>
        )}
      </div>
    </aside>
  );
}

Object.assign(window, { RegChangesPanel });
