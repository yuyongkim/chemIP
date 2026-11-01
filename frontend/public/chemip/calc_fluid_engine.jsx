// CoolProp 8.0.0(MIT, vendor/coolprop/) 불러오기와 상태 계산 — 실유체 물성 계산기(calc_fluid_props.jsx)만 쓴다. React 없음.
// 불러오기: 계산기를 열 때만(calc_form_engine.jsx 의 useCalcEngine → 정의의 engine.load). 다른 화면에서는 9.2 MB wasm 을 받지 않는다.
//   coolprop.js 는 ES 모듈(export default 비동기 공장 함수). 빌드(Babel env)가 import() 를 바꾸지 않도록 Function 으로 부른다.
//   주소는 이미 실린 vendor 스크립트(react)의 주소에서 잡는다 — 운영(chemip.yule.pics)에서 vendor 가 Pages 쪽에서 오기 때문.
// 계산: 유체마다 AbstractState("HEOS") 하나를 만들어 두고 update 한다(PropsSI 는 부를 때마다 5 ms, AbstractState 는 0.01 ms).
// 단위는 SI 기준값: T [K], P [Pa], D [kg/m³], H [J/kg], S·Cp·Cv [J/(kg·K)], V [Pa·s], L [W/(m·K)], W [m/s], Q [0–1].

const CALC_FLUID_ENGINE_STATE = { cp: null, promise: null, states: {} };

function calcFluidVendorBase() {
  const doc = typeof document !== "undefined" ? document : null;
  const s = doc && doc.querySelector('script[src*="vendor/react"]');
  if (s && s.src) return s.src.replace(/vendor\/[^/]*$/, "vendor/");
  return new URL("vendor/", doc ? doc.baseURI : "http://localhost/").href;
}

function calcFluidEngineReady() {
  return Boolean(CALC_FLUID_ENGINE_STATE.cp);
}

// 시험(Node)에서 미리 불러 둔 모듈을 넣을 때도 쓴다
function calcFluidEngineUse(cp) {
  CALC_FLUID_ENGINE_STATE.cp = cp;
  CALC_FLUID_ENGINE_STATE.states = {};
}

function calcFluidEngineLoad() {
  const st = CALC_FLUID_ENGINE_STATE;
  if (st.cp) return Promise.resolve(st.cp);
  if (!st.promise) {
    const importer = new Function("u", "return import(u)");
    st.promise = importer(`${calcFluidVendorBase()}coolprop/coolprop.js`)
      .then(m => m.default())
      .then(cp => { calcFluidEngineUse(cp); return cp; });
    st.promise.catch(() => { st.promise = null; });
  }
  return st.promise;
}

// 계산기 정의의 engine 칸(calc_form_engine.jsx 가 읽는다)
const CALC_FLUID_ENGINE = { id: "coolprop", name: "CoolProp 8.0.0", size: "9.2 MB", load: calcFluidEngineLoad, ready: calcFluidEngineReady };

function calcFluidAbstract(id) {
  const st = CALC_FLUID_ENGINE_STATE;
  if (!st.states[id]) st.states[id] = st.cp.factory("HEOS", id);
  return st.states[id];
}

// C++ 예외(CppException) → 글자. 예외 메모리는 풀어 준다.
function calcFluidErrorText(e) {
  const msg = String((e && e.message) || e || "").replace(/^CoolProp::[^:]*:\s*/, "");
  try { CALC_FLUID_ENGINE_STATE.cp.decrementExceptionRefcount?.(e); } catch (x) { /* 이미 풀림 */ }
  return msg.slice(0, 160);
}

// 입력 쌍 → CoolProp input_pairs 이름과 값 순서(CoolProp 의 쌍 이름 순서를 따른다)
const CALC_FLUID_PAIRS = {
  TP: { cp: "PT_INPUTS", order: ["P", "T"] },
  TS: { cp: "SmassT_INPUTS", order: ["S", "T"] },
  TQ: { cp: "QT_INPUTS", order: ["Q", "T"] },
  PQ: { cp: "PQ_INPUTS", order: ["P", "Q"] },
  PH: { cp: "HmassP_INPUTS", order: ["H", "P"] },
  PS: { cp: "PSmass_INPUTS", order: ["P", "S"] },
  HS: { cp: "HmassSmass_INPUTS", order: ["H", "S"] },
};

// CoolProp 상(phase) 번호 → key
const CALC_FLUID_PHASE_KEYS = ["liquid", "supercritical", "supercritical_gas", "supercritical_liquid", "critical_point", "gas", "twophase"];

// 상태 하나: given = { T?, P?, H?, S?, Q? } 가운데 pair 의 두 값 → 성질 묶음 또는 { error }
function calcFluidState(id, pair, given) {
  const st = CALC_FLUID_ENGINE_STATE;
  const p = CALC_FLUID_PAIRS[pair];
  if (!st.cp || !p) return { error: "engine" };
  const AS = calcFluidAbstract(id);
  try {
    AS.update(st.cp.input_pairs[p.cp], given[p.order[0]], given[p.order[1]]);
  } catch (e) {
    return { error: calcFluidErrorText(e) };
  }
  const K = st.cp.parameters;
  const phase = CALC_FLUID_PHASE_KEYS[AS.keyed_output(K.iPhase)] || "unknown";
  const Q = AS.Q();
  const two = phase === "twophase" && Q > 0 && Q < 1;   // 2상 안쪽에서는 cp·cv·음속·수송 성질을 정의하지 않는다
  const safe = (f) => { try { const v = f(); return Number.isFinite(v) ? v : null; } catch (e) { calcFluidErrorText(e); return null; } };
  return {
    T: AS.T(), P: AS.p(), D: AS.rhomass(), H: AS.hmass(), S: AS.smass(), Q: Q >= 0 && Q <= 1 ? Q : null, phase,
    Cp: two ? null : safe(() => AS.cpmass()), Cv: two ? null : safe(() => AS.cvmass()), W: two ? null : safe(() => AS.speed_sound()),
    V: two ? null : safe(() => AS.viscosity()), L: two ? null : safe(() => AS.conductivity()),
  };
}

// 포화 액체·증기 한 쌍 — 온도 T [K] 또는 압력 P [Pa] 기준. 유사순수 혼합 냉매는 액(기포점)·증기(이슬점) 압력이 조금 다르다.
function calcFluidSaturation(id, by, value) {
  const pair = by === "T" ? "TQ" : "PQ";
  const l = calcFluidState(id, pair, { [by]: value, Q: 0 });
  const v = calcFluidState(id, pair, { [by]: value, Q: 1 });
  return l.error || v.error ? { error: l.error || v.error } : { l, v };
}

Object.assign(window, {
  CALC_FLUID_ENGINE, CALC_FLUID_PAIRS, CALC_FLUID_PHASE_KEYS,
  calcFluidEngineLoad, calcFluidEngineReady, calcFluidEngineUse, calcFluidState, calcFluidSaturation,
});
