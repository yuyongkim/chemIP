// Pure helpers for the 요청 게시판 — no React, no fetch.

// ISO(UTC) → 한국 날짜 "2026. 10. 24."
function fbDate(iso, withTime = false) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const opts = { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" };
  if (withTime) Object.assign(opts, { hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toLocaleString("ko-KR", opts);
}

function fbStatusTone(status) {
  return FEEDBACK_LABELS.statusTone[status] || "";
}

// 딥링크(?view=board&write=1&cas=..&name=..) → 글쓰기 초기값. 자료 오류 제보 링크가 만든다.
function fbPrefillFromLink(link) {
  if (!link?.compose) return null;
  const R = FEEDBACK_LABELS.report;
  return { category: R.category, cas: link.cas || "", title: R.title(link.name, link.cas) };
}

// 물질 상세 → 게시판 글쓰기 주소.
function fbReportHref(selected) {
  const p = new URLSearchParams({ view: "board", write: "1" });
  if (selected?.cas_no) p.set("cas", selected.cas_no);
  const name = selected?.name_en || selected?.name || "";
  if (name) p.set("name", name);
  return `?${p.toString()}`;
}

// 서버 오류 응답 → 칸별 오류 문구와 전체 문구.
function fbSubmitErrors(result) {
  const F = FEEDBACK_LABELS.form;
  if (result.ok) return { fields: {}, message: "" };
  if (result.status === 400) return { fields: result.data?.errors || {}, message: F.invalid };
  if (result.status === 429) return { fields: {}, message: F.tooMany };
  return { fields: {}, message: F.failed };
}

// 관리자 요청 결과 → 화면 문구. 401(토큰 불일치)은 expired=true 로 알려 로그아웃시킨다.
function fbAdminError(result, fallback) {
  const A = FEEDBACK_LABELS.admin;
  if (!result || result.ok) return { message: "", expired: false };
  if (result.status === 401) return { message: A.badToken, expired: true };
  if (result.status === 503) return { message: A.disabled, expired: false };
  if (result.status === 0) return { message: A.failed, expired: false };
  return { message: result.data?.message || fallback || A.failed, expired: false };
}

Object.assign(window, { fbDate, fbStatusTone, fbPrefillFromLink, fbReportHref, fbSubmitErrors, fbAdminError });
