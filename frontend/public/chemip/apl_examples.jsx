// 적용 법규 판정기 · 예시 취급량 표(데이터만). 이름은 불러올 때 CAS 로 물질 검색 결과에서 채운다(apl_view.jsx). 밀도는 kg/L(대략값, 사용자가 고칠 수 있음).
// 손계산 시험(frontend/scripts/tests/test_applicability.cjs)이 같은 행을 쓴다.

const APL_EXAMPLES = {
  mixed: [
    { cas: "108-88-3", qty: "30000", unit: "L", density: "0.867", conc: "100", state: "liquid", use: "tank_out" },   // 톨루엔
    { cas: "67-56-1", qty: "4000", unit: "L", density: "0.792", conc: "100", state: "liquid", use: "general" },      // 메탄올
    { cas: "7782-50-5", qty: "1000", unit: "kg", density: "", conc: "100", state: "gas", use: "warehouse" },         // 염소(용기)
    { cas: "7647-01-0", qty: "25", unit: "t", density: "1.18", conc: "35", state: "solution", use: "tank_out" },     // 염산 35 %
  ],
  chlorine: [
    { cas: "7782-50-5", qty: "2500", unit: "kg", density: "", conc: "100", state: "gas", use: "warehouse" },
  ],
};

Object.assign(window, { APL_EXAMPLES });
