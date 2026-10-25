// 요청 게시판 · 관리자 모드 목록 — 연락처를 포함한 전체 글(useFeedbackAdminList)을 한 건씩 FeedbackAdminItem 으로 그린다.
// 토큰이 맞지 않으면(401) onExpired 로 셸에 알려 로그아웃시킨다.

function FeedbackAdminList({ token, meta, nonce, onExpired, onOpen }) {
  const L = FEEDBACK_LABELS;
  const A = L.admin;
  const [reload, setReload] = React.useState(0);
  const [notice, setNotice] = React.useState("");
  const { data: result, loading } = useFeedbackAdminList(token, nonce + reload);
  const err = fbAdminError(result);

  React.useEffect(() => { if (err.expired) onExpired(); }, [err.expired]);

  const deleted = id => { setNotice(A.deleted(id)); setReload(n => n + 1); };
  const items = result?.ok ? result.data.items : [];

  return (
    <div className="fb-admin-list">
      <div className="fb-admin-head">
        <b>{A.listTitle}</b>
        {result?.ok && <span className="muted">{L.total(result.data.total)}</span>}
        <span className="ui-hint">{A.listHint}</span>
      </div>
      {notice && <div className="fb-notice"><Icon name="check" size={13} /> {notice}</div>}
      {loading && <EmptyState card>{L.loading}</EmptyState>}
      {!loading && err.message && !err.expired && <ErrorState card message={err.message} />}
      {!loading && result?.ok && items.length === 0 && <EmptyState card>{L.empty}</EmptyState>}
      {!loading && items.map(item => (
        <FeedbackAdminItem key={`${item.id}-${nonce + reload}`} item={item} statuses={meta?.statuses || []} token={token}
                           onDeleted={deleted} onExpired={onExpired} onOpen={onOpen} />
      ))}
    </div>
  );
}

Object.assign(window, { FeedbackAdminList });
