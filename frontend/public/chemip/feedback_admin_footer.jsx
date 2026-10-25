// 요청 게시판 · 바닥글의 작은 "관리자" 링크. 관리자 모드일 때는 상태 표시와 "로그아웃".

function FeedbackAdminFooter({ admin, onLogin, onLogout }) {
  const A = FEEDBACK_LABELS.admin;
  return (
    <div className="fb-admin-footer">
      {admin ? (
        <>
          <span className="fb-admin-on"><Icon name="check" size={12} /> {A.modeOn}</span>
          <button type="button" className="fb-admin-link" onClick={onLogout}>{A.logout}</button>
        </>
      ) : (
        <button type="button" className="fb-admin-link" onClick={onLogin}>{A.link}</button>
      )}
    </div>
  );
}

Object.assign(window, { FeedbackAdminFooter });
