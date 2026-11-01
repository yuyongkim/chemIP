// API · 요청 게시판(/api/feedback, 관리자 경로 포함)과 익명 이용 집계(/api/usage).

function useFeedbackMeta() {
  return useApi(() => apiGet(`/feedback/meta`), []);
}

// filters: { category, status, limit, offset }. nonce 를 올리면 다시 읽는다(새 글 등록 뒤).
function useFeedbackList(filters = {}, nonce = 0) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") params.set(k, v); });
  const qs = params.toString();
  return useApi(() => apiGet(`/feedback${qs ? `?${qs}` : ""}`), [qs, nonce]);
}

function useFeedbackItem(id, nonce = 0) {
  return useApi(() => (id ? apiGet(`/feedback/${encodeURIComponent(id)}`) : Promise.resolve(null)), [id, nonce]);
}

// 오류 본문(칸별 errors)을 화면에 보여 줘야 해서 apiPost 와 달리 던지지 않고 { ok, status, data } 를 돌려준다.
async function submitFeedback(body) {
  try {
    const r = await fetch(`${API_BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data = null;
    try { data = await r.json(); } catch (e) { data = null; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { message: String(e.message || e) } };
  }
}

// 관리자(운영자) 경로 — 토큰은 헤더 X-Admin-Token 으로만 보낸다(주소·로그에 남기지 않는다).
// 토큰 보관은 feedback_admin_session.jsx(sessionStorage). 여기서는 받은 값을 실어 보내기만 한다.
async function feedbackAdminRequest(method, path, token, body) {
  try {
    const headers = { "X-Admin-Token": token || "" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const r = await fetch(`${API_BASE}/feedback${path}`, {
      method, headers, cache: "no-store", body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try { data = await r.json(); } catch (e) { data = null; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { message: String(e.message || e) } };
  }
}

// { ok, status, data } 를 그대로 돌려준다(401 이면 화면이 로그아웃시킨다).
function useFeedbackAdminList(token, nonce = 0) {
  return useApi(() => (token ? feedbackAdminRequest("GET", "/admin/list", token) : Promise.resolve(null)), [token, nonce]);
}

function checkFeedbackAdminToken(token) {
  return feedbackAdminRequest("GET", "/admin/list?limit=1", token);
}

function updateFeedbackAdmin(id, token, changes) {
  return feedbackAdminRequest("PATCH", `/${encodeURIComponent(id)}`, token, changes);
}

function deleteFeedbackAdmin(id, token) {
  return feedbackAdminRequest("DELETE", `/${encodeURIComponent(id)}`, token);
}

function useUsageSummary(days = 30) {
  return useApi(() => apiGet(`/usage/summary?days=${days}&top=0`), [days]);
}

Object.assign(window, {
  useFeedbackMeta, useFeedbackList, useFeedbackItem, submitFeedback, useUsageSummary,
  useFeedbackAdminList, checkFeedbackAdminToken, updateFeedbackAdmin, deleteFeedbackAdmin,
});
