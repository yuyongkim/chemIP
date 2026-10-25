// 요청 게시판 화면 셸 — 목록/글 보기/글쓰기/관리자 로그인 전환과 딥링크(?view=board&write=1&cas=..) 처리만 한다.
// 조각: feedback_list.jsx · feedback_detail.jsx · feedback_form.jsx, 문구: feedback_labels.jsx, 순수 함수: feedback_helpers.jsx.
// 관리자 모드: feedback_admin_*.jsx (토큰은 feedback_admin_session.jsx 의 sessionStorage 에만). 토큰이 없으면 공개 화면 그대로.

function FeedbackBoardView({ link }) {
  const L = FEEDBACK_LABELS;
  const meta = useFeedbackMeta();
  const [prefill] = React.useState(() => fbPrefillFromLink(link));
  const [mode, setMode] = React.useState(() => (prefill ? "write" : link?.item ? "detail" : "list"));
  const [itemId, setItemId] = React.useState(() => link?.item || "");
  const [nonce, setNonce] = React.useState(0);
  const [notice, setNotice] = React.useState("");
  const [adminToken, setAdminToken] = React.useState(() => fbAdminTokenLoad());

  const open = id => { setItemId(String(id)); setMode("detail"); setNotice(""); };
  const done = item => {
    setNonce(n => n + 1);
    setItemId(item?.id ? String(item.id) : "");
    setMode(item?.id ? "detail" : "list");
    setNotice(L.form.done);
  };
  const adminLogin = token => { fbAdminTokenSave(token); setAdminToken(token); setMode("list"); setNotice(""); };
  const adminLogout = (message = "") => {
    fbAdminTokenClear();
    setAdminToken("");
    setMode(m => (m === "adminLogin" ? "list" : m));
    setNotice(typeof message === "string" ? message : "");
  };
  const adminExpired = () => adminLogout(L.admin.expired);

  return (
    <div className="fb-view">
      <div className="fb-head">
        <div>
          <h1 className="fb-title">{L.title}</h1>
          <p className="fb-lede">{L.lede}</p>
        </div>
        {mode !== "write" && (
          <button className="btn primary" onClick={() => { setMode("write"); setNotice(""); }}><Icon name="plus" size={14} /> {L.write}</button>
        )}
      </div>
      {notice && <div className="fb-notice"><Icon name="check" size={13} /> {notice}</div>}
      {meta.error && <ErrorState card message={meta.error} />}
      {mode === "list" && !adminToken && <FeedbackList meta={meta.data} nonce={nonce} onOpen={open} />}
      {mode === "list" && adminToken && (
        <FeedbackAdminList token={adminToken} meta={meta.data} nonce={nonce} onExpired={adminExpired} onOpen={open} />
      )}
      {mode === "detail" && <FeedbackDetail id={itemId} onBack={() => { setMode("list"); setNotice(""); }} />}
      {mode === "write" && !meta.loading && meta.data && (
        <FeedbackForm meta={meta.data} prefill={prefill} onDone={done} onCancel={() => setMode("list")} />
      )}
      {mode === "adminLogin" && <FeedbackAdminLogin onLogin={adminLogin} onCancel={() => setMode("list")} />}
      {mode !== "adminLogin" && (
        <FeedbackAdminFooter admin={!!adminToken} onLogin={() => { setMode("adminLogin"); setNotice(""); }} onLogout={() => adminLogout()} />
      )}
    </div>
  );
}

Object.assign(window, { FeedbackBoardView });
