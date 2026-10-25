// 요청 게시판 · 목록 — 분류·상태 거르기, 쪽 넘기기, 글 한 줄씩. 데이터는 useFeedbackList(api.jsx).

const FB_PAGE_SIZE = 20;

function FeedbackFilterSelect({ label, value, options, onChange }) {
  const L = FEEDBACK_LABELS;
  return (
    <label className="fb-filter">
      <span className="muted">{label}</span>
      <select className="fb-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{L.filterAll}</option>
        {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function FeedbackList({ meta, nonce, onOpen }) {
  const L = FEEDBACK_LABELS;
  const [category, setCategory] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const { data, loading, error } = useFeedbackList({ category, status, limit: FB_PAGE_SIZE, offset }, nonce);
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / FB_PAGE_SIZE));
  const page = Math.floor(offset / FB_PAGE_SIZE) + 1;
  const pick = setter => v => { setter(v); setOffset(0); };

  return (
    <div className="panel fb-panel">
      <div className="fb-toolbar">
        <FeedbackFilterSelect label={L.filterCategory} value={category} options={meta?.categories} onChange={pick(setCategory)} />
        <FeedbackFilterSelect label={L.filterStatus} value={status} options={meta?.statuses} onChange={pick(setStatus)} />
        <span className="muted fb-total">{L.total(total)}</span>
      </div>
      {loading && <div className="body"><EmptyState>{L.loading}</EmptyState></div>}
      {error && <div className="body"><ErrorState message={error} /></div>}
      {!loading && !error && total === 0 && <div className="body"><EmptyState>{L.empty}</EmptyState></div>}
      {!loading && !error && total > 0 && (
        <table className="fb-table">
          <thead>
            <tr>
              <th className="fb-col-id">{L.columns.id}</th>
              <th className="fb-col-cat">{L.columns.category}</th>
              <th>{L.columns.title}</th>
              <th className="fb-col-status">{L.columns.status}</th>
              <th className="fb-col-date">{L.columns.created}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map(it => (
              <tr key={it.id} onClick={() => onOpen(it.id)} tabIndex={0} onKeyDown={e => { if (e.key === "Enter") onOpen(it.id); }}>
                <td className="mono tnum fb-col-id">{it.id}</td>
                <td className="fb-col-cat"><Badge>{it.category}</Badge></td>
                <td className="fb-title-cell">
                  {it.title}
                  {it.cas && <span className="mono fb-cas"> · {it.cas}</span>}
                  {it.admin_reply && <span className="fb-replied"> · {L.detail.reply}</span>}
                </td>
                <td className="fb-col-status"><Badge tone={fbStatusTone(it.status)}>{it.status}</Badge></td>
                <td className="mono tnum fb-col-date">{fbDate(it.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pages > 1 && (
        <div className="fb-pager">
          <button className="btn sm" disabled={page <= 1} onClick={() => setOffset(offset - FB_PAGE_SIZE)}>{L.prev}</button>
          <span className="mono tnum">{L.pageOf(page, pages)}</span>
          <button className="btn sm" disabled={page >= pages} onClick={() => setOffset(offset + FB_PAGE_SIZE)}>{L.next}</button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { FeedbackList });
