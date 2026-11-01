// Pure helpers for the 요청 게시판 — no React, no fetch.

// 자료 오류 제보 글의 분류 값 — 서버 CATEGORIES(backend/feedback/schema.py)의 값과 같아야 한다(표시 이름은 FEEDBACK_LABELS.values).
const FB_REPORT_CATEGORY = "자료 오류";

// 서버 값(분류·회사 규모·상태) → 화면 표시 이름.
function fbValueName(value) {
  return (FEEDBACK_LABELS.values && FEEDBACK_LABELS.values[value]) || value;
}

// ISO(UTC) → 한국 시간 날짜 "2026. 10. 24." (영어 화면은 en-US 형식)
function fbDate(iso, withTime = false) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const opts = { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" };
  if (withTime) Object.assign(opts, { hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toLocaleString(tr("ko-KR", "en-US"), opts);
}

function fbStatusTone(status) {
  return FEEDBACK_LABELS.statusTone[status] || "";
}

// 딥링크(?view=board&write=1&cas=..&name=..) → 글쓰기 초기값. 자료 오류 제보 링크가 만든다.
function fbPrefillFromLink(link) {
  if (!link?.compose) return null;
  const R = FEEDBACK_LABELS.report;
  return { category: FB_REPORT_CATEGORY, cas: link.cas || "", title: R.title(link.name, link.cas) };
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
  if (result.status === 400) return { fields: fbFieldErrors(result.data?.errors, F.fieldErrors), message: F.invalid };
  if (result.status === 429) return { fields: {}, message: F.tooMany };
  return { fields: {}, message: F.failed };
}

// 서버 칸별 오류 → 이 화면 언어의 문구가 있으면 그것으로 바꾼다.
function fbFieldErrors(errors, local) {
  const out = {};
  for (const [k, v] of Object.entries(errors || {})) out[k] = (local && local[k]) || v;
  return out;
}

// 관리자 요청 결과 → 화면 문구. 401(토큰 불일치)은 expired=true 로 알려 로그아웃시킨다.
function fbAdminError(result, fallback) {
  const A = FEEDBACK_LABELS.admin;
  if (!result || result.ok) return { message: "", expired: false };
  if (result.status === 401) return { message: A.badToken, expired: true };
  if (result.status === 503) return { message: A.disabled, expired: false };
  if (result.status === 0) return { message: A.failed, expired: false };
  return { message: (A.serverMessages && result.data?.message) || fallback || A.failed, expired: false };
}

Object.assign(window, { FB_REPORT_CATEGORY, fbValueName, fbFieldErrors, fbDate, fbStatusTone, fbPrefillFromLink, fbReportHref, fbSubmitErrors, fbAdminError });
