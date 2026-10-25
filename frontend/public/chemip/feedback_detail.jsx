// 요청 게시판 · 글 한 건 — 본문, 메타(분류·CAS·회사 규모·등록일), 운영자 답변. 연락처는 서버가 내보내지 않는다.

function FeedbackDetail({ id, onBack }) {
  const L = FEEDBACK_LABELS;
  const { data, loading, error } = useFeedbackItem(id);
  return (
    <div>
      <button className="btn sm ghost fb-back" onClick={onBack}>{L.backToList}</button>
      {loading && <EmptyState card>{L.loading}</EmptyState>}
      {!loading && (error || !data) && <EmptyState kind="error" card>{L.notFound}</EmptyState>}
      {!loading && data && (
        <article className="panel fb-panel">
          <div className="body">
            <div className="fb-detail-tags">
              <Badge>{data.category}</Badge>
              <Badge tone={fbStatusTone(data.status)}>{data.status}</Badge>
              <span className="mono tnum muted">#{data.id}</span>
            </div>
            <h2 className="fb-detail-title">{data.title}</h2>
            <dl className="fb-meta">
              {data.cas && <><dt>{L.detail.cas}</dt><dd className="mono">{data.cas}</dd></>}
              {data.company_size && <><dt>{L.detail.companySize}</dt><dd>{data.company_size}</dd></>}
              <dt>{L.detail.created}</dt><dd className="mono tnum">{fbDate(data.created_at, true)}</dd>
            </dl>
            <div className="fb-body">{data.body}</div>
            <div className="fb-reply">
              <div className="fb-reply-head">
                <b>{L.detail.reply}</b>
                {data.reply_at && <span className="mono tnum muted">{L.detail.replyAt} {fbDate(data.reply_at, true)}</span>}
              </div>
              {data.admin_reply ? <div className="fb-body">{data.admin_reply}</div> : <EmptyState>{L.detail.noReply}</EmptyState>}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

Object.assign(window, { FeedbackDetail });
