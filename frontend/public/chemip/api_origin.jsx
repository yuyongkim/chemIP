// API 층 · 집 PC(원 서버) 전용 /api 경로의 공용 관문 — originGet.
// 정적 자료가 켜진 배포(Cloudflare, static_config.jsx)에서만 동작한다. PC 사이트(CHEMIP_STATIC 없음)는 apiGet 그대로다.
//
// 정적 배포에서 PC 전용 경로(해외 규제 정보·근거 조문·정적 파일에 없는 물질 등)를 부르기 전에, 이 페이지에서
// 한 번만 가벼운 확인 요청(ORIGIN_PROBE)을 보낸다. 확인이 실패했거나 PC 전용 요청이 한 번이라도 "연결할 수 없음"
// 으로 끝나면, 이후 PC 전용 요청은 보내지 않고 곧바로 apiLiveOnlyError(중립 안내 문구)로 끝낸다.
// → 화면마다 503 을 기다리지 않고, 콘솔에 실패 요청이 쌓이지 않는다.
// Worker 가 직접 답하는 경로(게시판·이용 집계·AI·의약품·KOTRA·네이버)는 PC 와 무관하므로 여기를 거치지 않는다.

const ORIGIN_PROBE = { path: "/guides/status", timeoutMs: 6000 }; // PC 전용, 가볍고 부작용 없음

const ORIGIN_STATE = { probe: null, down: false };

function originGateActive() {
  return staticEnabled("pages");
}

// 확인 요청은 페이지마다 한 번. 응답이 오면(4xx 포함) 살아 있음, 연결 실패·시간 초과·오프라인 상태 코드는 꺼짐.
function originProbe() {
  if (!ORIGIN_STATE.probe) {
    ORIGIN_STATE.probe = apiGetTimeout(ORIGIN_PROBE.path, ORIGIN_PROBE.timeoutMs)
      .then(() => true, e => Boolean(e && !e.offline && !/^timeout/.test(String(e.message || ""))))
      .then(up => { if (!up) ORIGIN_STATE.down = true; return up; });
  }
  return ORIGIN_STATE.probe;
}

async function originReachable() {
  if (!originGateActive()) return true;
  if (ORIGIN_STATE.down) return false;
  return originProbe();
}

// PC 전용 GET. ms 를 주면 apiGetTimeout, 아니면 apiGet. 정적 배포에서 PC 가 꺼져 있으면 요청 없이 중립 안내 오류.
async function originGet(path, ms) {
  const call = () => (ms ? apiGetTimeout(path, ms) : apiGet(path));
  if (!originGateActive()) return call();
  if (!(await originReachable())) throw apiLiveOnlyError();
  try {
    return await call();
  } catch (e) {
    if (e && e.offline) {
      ORIGIN_STATE.down = true;
      throw apiLiveOnlyError(e.detail);
    }
    throw e;
  }
}

Object.assign(window, { originGet, originReachable });
