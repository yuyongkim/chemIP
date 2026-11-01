// 물질 상세 아래 패널의 숫자 표기 — 순수 함수(질량 kg·t, 달러).

// 임계량(kg) → "5 kg" / "50 t"
function fmtMass(kg) {
  const n = Number(kg);
  if (!isFinite(n)) return "—";
  if (n >= 1000) return `${(n / 1000).toLocaleString("ko-KR", { maximumFractionDigits: n >= 100000 ? 0 : 2 })} t`;
  return `${n.toLocaleString("ko-KR", { maximumFractionDigits: n < 10 ? 2 : 0 })} kg`;
}

// PRTR 배출·이동량(kg) → "0" / "12.5kg" / "3.4t"
function fmtKg(kg) {
  const n = Number(kg || 0);
  if (!isFinite(n) || n === 0) return "0";
  if (n >= 1000) return `${(n / 1000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}t`;
  return `${n.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}kg`;
}

// EPA 벌금(달러) → "$1.2M" / "$350K" / "$900"
function fmtUsd(v) {
  const n = Number(v || 0);
  if (n >= 1e6) return `$${(n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  if (n >= 1e3) return `$${(n / 1e3).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
  return `$${n.toLocaleString("en-US")}`;
}

Object.assign(window, { fmtMass, fmtKg, fmtUsd });
