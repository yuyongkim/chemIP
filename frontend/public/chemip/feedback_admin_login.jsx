// 요청 게시판 · 관리자 토큰 입력. 서버(/api/feedback/admin/list)에 한 번 확인한 뒤에만 onLogin(token) 을 부른다.
// 토큰 보관은 셸이 feedback_admin_session.jsx 로 한다. 여기서는 입력·확인만 맡는다.

function FeedbackAdminLogin({ onLogin, onCancel }) {
  const A = FEEDBACK_LABELS.admin;
  const [token, setToken] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const submit = async e => {
    e.preventDefault();
    const value = token.trim();
    if (!value) return;
    setChecking(true);
    const result = await checkFeedbackAdminToken(value);
    setChecking(false);
    if (result.ok) { setToken(""); onLogin(value); return; }
    setMessage(fbAdminError(result).message);
  };

  return (
    <form className="panel fb-panel fb-form fb-admin-login" onSubmit={submit}>
      <h3><b>{A.loginTitle}</b><span className="muted">{A.loginHint}</span></h3>
      <div className="body">
        <FbField label={A.tokenField} error={message}>
          <input className="fb-input mono" type="password" value={token} onChange={e => setToken(e.target.value)}
                 autoComplete="off" autoFocus name="fb-admin-token" />
        </FbField>
        <div className="fb-actions">
          <button type="button" className="btn" onClick={onCancel}>{A.cancel}</button>
          <button type="submit" className="btn primary" disabled={checking || !token.trim()}>{checking ? A.checking : A.login}</button>
        </div>
      </div>
    </form>
  );
}

Object.assign(window, { FeedbackAdminLogin });
