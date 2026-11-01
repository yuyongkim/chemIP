// API 층 문구(API_LABELS_KO, 영어: api_labels_en.jsx) — 서버(/api)에 닿지 못했을 때 화면에 보일 말. 화면들은 이 문구를 오류 메시지로 받아
// 기존 ErrorState / "오류: …" 자리에 그대로 보인다. liveOnly 는 같은 자리에 오류 표시 없이 안내로 보인다.

const API_LABELS_KO = {
  offline: "지금 연결할 수 없습니다. 잠시 후 다시 시도해 주십시오.",
  // 정적 배포에서 집 PC 전용 자료(실시간 조회)를 부를 수 없을 때. 오류가 아니라 안내로 보인다(apiIsNotice).
  liveOnly: "이 항목은 실시간 조회 자료라 지금은 표시하지 않습니다.",
};

Object.assign(window, { API_LABELS_KO });
