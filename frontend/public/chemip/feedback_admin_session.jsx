// 요청 게시판 · 관리자 토큰 보관 — sessionStorage 에만 둔다(탭을 닫거나 로그아웃하면 사라진다).
// localStorage·주소(URL)·쿠키에는 절대 두지 않는다. 저장소를 못 쓰는 환경이면 메모리에만 들고 있는다.

const FB_ADMIN_KEY = "chemip.feedback.adminToken";

function fbAdminTokenLoad() {
  try { return window.sessionStorage.getItem(FB_ADMIN_KEY) || ""; } catch (e) { return ""; }
}

function fbAdminTokenSave(token) {
  try { window.sessionStorage.setItem(FB_ADMIN_KEY, token); } catch (e) { /* 메모리 상태만 쓴다 */ }
}

function fbAdminTokenClear() {
  try { window.sessionStorage.removeItem(FB_ADMIN_KEY); } catch (e) { /* 없음 */ }
}

Object.assign(window, { fbAdminTokenLoad, fbAdminTokenSave, fbAdminTokenClear });
