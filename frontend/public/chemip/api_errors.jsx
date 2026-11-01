// API 층 오류 분류 — 순수 함수. 서버(집 PC)가 꺼졌거나 터널이 끊긴 경우를 "연결할 수 없음"으로 묶는다.
// 그런 오류는 message 가 API_LABELS.offline 이고 offline=true 다. 화면은 message 만 보인다.

// Next 프록시가 백엔드에 닿지 못하면 500, Cloudflare 가 원 서버에 닿지 못하면 502·503·504·52x·530.
const API_OFFLINE_STATUSES = new Set([500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530]);

function apiOfflineError(detail) {
  const err = new Error(API_LABELS.offline);
  err.offline = true;
  err.detail = detail || "";
  return err;
}

// 응답은 왔지만 실패한 경우
function apiStatusError(response) {
  if (API_OFFLINE_STATUSES.has(response.status)) return apiOfflineError(String(response.status));
  return new Error(`${response.status} ${response.statusText}`);
}

// fetch 자체가 실패한 경우(네트워크 끊김은 TypeError). 시간 초과는 기존 문구를 그대로 둔다.
function apiNetworkError(e) {
  if (e && e.offline) return e;
  if (e && e.name === "TypeError") return apiOfflineError(e.message);
  return e;
}

// 정적 배포에서 집 PC 전용 요청을 보내지 않거나 실패했을 때(api_origin.jsx). offline 으로도 표시해
// apiKeepOffline 을 쓰는 훅도 "0건"이 아니라 이 안내를 보이게 한다.
function apiLiveOnlyError(detail) {
  const err = new Error(API_LABELS.liveOnly);
  err.offline = true;
  err.liveOnly = true;
  err.detail = detail || "";
  return err;
}

// 화면은 오류 문구(문자열)만 받는다. 이 문구면 오류가 아니라 중립 안내로 그린다(ui_common.jsx ErrorState 등).
function apiIsNotice(message) {
  return message === API_LABELS.liveOnly;
}

// 실패해도 빈 결과로 넘기던 훅용: 연결 끊김만은 오류로 올려 화면이 "0건"이 아니라 연결 안내를 보이게 한다.
function apiKeepOffline(fallback) {
  return e => {
    if (e && e.offline) throw e;
    return fallback(e);
  };
}

Object.assign(window, { apiOfflineError, apiStatusError, apiNetworkError, apiKeepOffline, apiLiveOnlyError, apiIsNotice });
