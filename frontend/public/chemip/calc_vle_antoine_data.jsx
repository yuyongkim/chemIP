// VLE 사전 설정 물질의 Antoine 상수 — CoolProp 포화압력(ln P[Pa] = A − B/(T[K] + C))에 맞춘 값. React 없음(자료만).
// 만든 곳: frontend/scripts/build_coolprop_data.mjs — CoolProp 8.0.0 (ae81610e7d), MIT 라이선스(vendor/coolprop/LICENSE). 손으로 고치지 않는다.
// Tmin·Tmax [K] = 맞춘 범위(포화압력 1–500 kPa), maxErr = 그 범위에서 CoolProp 대비 최대 상대 오차.
const CALC_VLE_ANTOINE_DATA = {
  "Water": {"A":23.319527,"B":3897.068,"C":-42.7198,"Tmin":280.12,"Tmax":424.98,"maxErr":0.0039},
  "Methanol": {"A":23.57204,"B":3687.679,"C":-31.5338,"Tmin":252.78,"Tmax":384.52,"maxErr":0.0037},
  "Ethanol": {"A":23.693489,"B":3755.428,"C":-42.9889,"Tmin":266.64,"Tmax":398.42,"maxErr":0.0061},
  "Acetone": {"A":21.313425,"B":2800.119,"C":-43.1536,"Tmin":237.48,"Tmax":385.03,"maxErr":0.0034},
  "Benzene": {"A":20.785892,"B":2783.483,"C":-52.6215,"Tmin":279.17,"Tmax":415.8,"maxErr":0.00061},
  "Toluene": {"A":20.93588,"B":3115.499,"C":-52.6795,"Tmin":274.72,"Tmax":451.42,"maxErr":0.0033},
  "EthylBenzene": {"A":20.952746,"B":3307.116,"C":-58.521,"Tmin":293.93,"Tmax":480.9,"maxErr":0.0036},
  "o-Xylene": {"A":21.058152,"B":3430.652,"C":-57.6504,"Tmin":300.03,"Tmax":489.99,"maxErr":0.0036},
  "m-Xylene": {"A":21.077867,"B":3397.81,"C":-56.5108,"Tmin":296.25,"Tmax":483.61,"maxErr":0.0029},
  "p-Xylene": {"A":21.02069,"B":3368.728,"C":-56.6903,"Tmin":295.34,"Tmax":483.2,"maxErr":0.0031},
  "n-Pentane": {"A":20.755146,"B":2493.71,"C":-39.0198,"Tmin":219.07,"Tmax":365.71,"maxErr":0.0027},
  "n-Hexane": {"A":20.787942,"B":2728.273,"C":-47.309,"Tmin":243.83,"Tmax":403.2,"maxErr":0.0029},
  "n-Heptane": {"A":20.839242,"B":2949.071,"C":-54.8954,"Tmin":266.53,"Tmax":437.04,"maxErr":0.0032},
  "n-Octane": {"A":20.88965,"B":3154.214,"C":-61.9505,"Tmin":287.49,"Tmax":468,"maxErr":0.0032},
  "CycloHexane": {"A":20.658018,"B":2773.646,"C":-50.1393,"Tmin":279.97,"Tmax":418.18,"maxErr":0.00064},
  "DiethylEther": {"A":20.849144,"B":2445.618,"C":-45.2879,"Tmin":270.5,"Tmax":361.78,"maxErr":0.00042},
  "Tetrahydrofuran": {"A":21.035515,"B":2788.082,"C":-45.9155,"Tmin":243.21,"Tmax":398.29,"maxErr":0.0039},
  "Dichloroethane": {"A":21.257133,"B":3018.214,"C":-46.5303,"Tmin":256.8,"Tmax":417.64,"maxErr":0.0046},
};

Object.assign(window, { CALC_VLE_ANTOINE_DATA });
