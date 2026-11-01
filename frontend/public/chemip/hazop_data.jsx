// HAZOP 워크시트 작성기 자료(문구 없음 — 이름·제안 문장은 hazop_labels.jsx·_en.jsx). React 없음.
// 열 구성은 KOSHA GUIDE C-C-37-2026(연속공정)·C-C-41-2026(회분식) 의 위험성평가 결과기록지·조치계획 서식 순서를 따른다(문구는 직접 씀).
//   기록지: 이탈번호 · 이탈 · 원인 · 결과 · 현재안전조치 · 위험도 · 개선번호 · 개선권고사항 / 조치계획: 책임부서 · 일정 · 진행
// 가이드워드 7개(없음·증가·감소·반대·부가·부분·기타)는 HAZOP 공통어(IEC 61882)이다. "gen" = 일반 변수(가이드워드 없이 단독 이탈).

const HAZOP_GUIDES = ["no", "more", "less", "reverse", "asWell", "partOf", "otherThan"];

// 변수 → 쓸 만한 가이드워드. batch: 회분식에서만 보이는 변수(시간·순서)
const HAZOP_PARAMS = [
  { k: "flow", guides: ["no", "more", "less", "reverse", "asWell", "otherThan"] },
  { k: "pressure", guides: ["more", "less"] },
  { k: "temperature", guides: ["more", "less"] },
  { k: "level", guides: ["no", "more", "less"] },
  { k: "composition", guides: ["asWell", "partOf", "otherThan"] },
  { k: "reaction", guides: ["no", "more", "less", "reverse", "asWell"] },
  { k: "mixing", guides: ["no", "more", "less"] },
  { k: "phase", guides: ["more", "less", "otherThan"] },
  { k: "time", guides: ["more", "less", "no"], batch: true },
  { k: "sequence", guides: ["no", "reverse", "partOf", "asWell", "otherThan"], batch: true },
  { k: "utilities", guides: ["gen"] },
  { k: "relief", guides: ["gen"] },
  { k: "instrument", guides: ["gen"] },
  { k: "corrosion", guides: ["gen"] },
  { k: "maintenance", guides: ["gen"] },
  { k: "sampling", guides: ["gen"] },
  { k: "ignition", guides: ["gen"] },
];

const HAZOP_PROCESS_TYPES = ["continuous", "batch"];
const HAZOP_EQUIPMENT = ["pipe", "pump", "vessel", "tank", "hx", "reactor", "column", "compressor", "other"];
const HAZOP_STATUS = ["open", "doing", "done"];

// GHS H 문구 → 결과 제안 key(hazop_labels hazards[k]). 앞 3자리 숫자로 고른다.
const HAZOP_H_HAZARDS = [
  { k: "flammable", codes: ["H220", "H221", "H222", "H223", "H224", "H225", "H226", "H228"] },
  { k: "selfReactive", codes: ["H240", "H241", "H242", "H200", "H201", "H202", "H203", "H204", "H205"] },
  { k: "pyrophoric", codes: ["H250", "H251", "H252"] },
  { k: "waterReactive", codes: ["H260", "H261"] },
  { k: "oxidizer", codes: ["H270", "H271", "H272"] },
  { k: "pressGas", codes: ["H280", "H281"] },
  { k: "corrodeMetal", codes: ["H290"] },
  { k: "acuteFatal", codes: ["H300", "H310", "H330"] },
  { k: "acuteToxic", codes: ["H301", "H311", "H331"] },
  { k: "corrosive", codes: ["H314", "H318"] },
  { k: "sensitizer", codes: ["H317", "H334"] },
  { k: "cmr", codes: ["H340", "H341", "H350", "H351", "H360", "H361"] },
  { k: "organ", codes: ["H370", "H372"] },
  { k: "aquatic", codes: ["H400", "H410", "H411"] },
];

// 위험도 기본 설정: 강도 S 1–4 · 빈도 L 1–3(KOSHA 예시의 단계 수), 위험도 = S × L, 구간 경계(이상이면 그 구간)
const HAZOP_RISK_DEFAULT = { sMax: 4, lMax: 3, high: 8, mid: 4 };
const HAZOP_RISK_SCALES = [
  { k: "4x3", sMax: 4, lMax: 3, high: 8, mid: 4 },
  { k: "3x3", sMax: 3, lMax: 3, high: 6, mid: 3 },
  { k: "5x5", sMax: 5, lMax: 5, high: 15, mid: 6 },
];

// 기록지 열(화면·CSV·인쇄 순서). label 은 hazop_labels cols[k]
const HAZOP_COLUMNS = ["no", "deviation", "causes", "consequences", "safeguards", "S", "L", "risk", "recNo", "rec", "owner", "due", "status"];

const HAZOP_STORE_KEY = "chemip-hazop-v1";
const HAZOP_MAX_NODES = 60;
const HAZOP_MAX_ROWS = 200;

Object.assign(window, {
  HAZOP_GUIDES, HAZOP_PARAMS, HAZOP_PROCESS_TYPES, HAZOP_EQUIPMENT, HAZOP_STATUS, HAZOP_H_HAZARDS,
  HAZOP_RISK_DEFAULT, HAZOP_RISK_SCALES, HAZOP_COLUMNS, HAZOP_STORE_KEY, HAZOP_MAX_NODES, HAZOP_MAX_ROWS,
});
