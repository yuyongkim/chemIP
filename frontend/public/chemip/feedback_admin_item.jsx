// 요청 게시판 · 관리자 모드의 글 한 건 — 본문·연락처 보기, 처리 상태·답변 저장, 삭제(확인 후).
// 서버 호출은 api.jsx(updateFeedbackAdmin · deleteFeedbackAdmin), 문구는 FEEDBACK_LABELS.admin.

function FeedbackAdminItem({ item, statuses, token, onDeleted, onExpired, onOpen }) {
  const L = FEEDBACK_LABELS;
  const A = L.admin;
  const [status, setStatus] = React.useState(item.status);
  const [reply, setReply] = React.useState(item.admin_reply || "");
  const [saved, setSaved] = React.useState(item);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState({ tone: "", text: "" });
  const dirty = status !== saved.status || reply.trim() !== (saved.admin_reply || "");

  const fail = (result, fallback) => {
    const err = fbAdminError(result, fallback);
    if (err.expired) { onExpired(); return; }
    setNote({ tone: "error", text: err.message });
  };

  const save = async () => {
    setBusy(true);
    const result = await updateFeedbackAdmin(item.id, token, { status, admin_reply: reply });
    setBusy(false);
    if (!result.ok) return fail(result, A.saveFailed);
    setSaved(result.data);
    setReply(result.data.admin_reply || "");
    setNote({ tone: "ok", text: A.saved });
  };

  const remove = async () => {
    if (!window.confirm(A.deleteConfirm(item.id))) return;
    setBusy(true);
    const result = await deleteFeedbackAdmin(item.id, token);
    setBusy(false);
    if (!result.ok) return fail(result, A.deleteFailed);
    onDeleted(item.id);
  };

  return (
    <article className="panel fb-panel fb-admin-item" data-id={item.id}>
      <div className="body">
        <div className="fb-detail-tags">
          <Badge>{item.category}</Badge>
          <Badge tone={fbStatusTone(saved.status)}>{saved.status}</Badge>
          <span className="mono tnum muted">#{item.id}</span>
          <span className="mono tnum muted">{fbDate(item.created_at, true)}</span>
          <button type="button" className="fb-admin-link fb-admin-open" onClick={() => onOpen(item.id)}>{A.viewPublic}</button>
        </div>
        <h2 className="fb-admin-title">{item.title}</h2>
        <dl className="fb-meta">
          <dt>{A.contact}</dt>
          <dd className="fb-admin-contact">{item.contact ? <a href={`mailto:${item.contact}`}>{item.contact}</a> : <span className="muted">{A.noContact}</span>}</dd>
          {item.cas && <><dt>{L.detail.cas}</dt><dd className="mono">{item.cas}</dd></>}
          {item.company_size && <><dt>{L.detail.companySize}</dt><dd>{item.company_size}</dd></>}
        </dl>
        <div className="fb-body">{item.body}</div>
        <div className="fb-admin-edit">
          <FbField label={A.status}>
            <select className="fb-input fb-admin-status" value={status} onChange={e => setStatus(e.target.value)}>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FbField>
          <FbField label={A.reply}>
            <textarea className="fb-input fb-textarea fb-admin-reply" value={reply} onChange={e => setReply(e.target.value)}
                      rows={4} placeholder={A.replyPlaceholder} />
          </FbField>
          <div className="fb-actions">
            {note.text && <span className={note.tone === "error" ? "fb-field-error" : "fb-admin-saved"}>{note.text}</span>}
            <button type="button" className="btn fb-admin-delete" onClick={remove} disabled={busy}>{A.del}</button>
            <button type="button" className="btn primary fb-admin-save" onClick={save} disabled={busy || !dirty}>{busy ? A.saving : A.save}</button>
          </div>
        </div>
      </div>
    </article>
  );
}

Object.assign(window, { FeedbackAdminItem });
