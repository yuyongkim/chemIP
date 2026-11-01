// 적용 법규 판정기 · 방유제(방류벽) 필요 용량·최대보유량 도우미 — 순수 함수. 비율은 APL_HAZMAT.dike(apl_hazmat_data.jsx).
//   basis "tank"         위험물 옥외탱크저장소(인화성 액체): 최대 탱크 × 110 %   (시행규칙 별표 6 Ⅸ제1호가목)
//   basis "tank_nonflam" 위험물 옥외탱크저장소(인화성이 없는 액체): 최대 탱크 × 100 % (같은 별표 Ⅸ제2호)
//   basis "process"      위험물 제조소 옥외 취급탱크: 최대 × 50 % + 나머지 합 × 10 % (시행규칙 별표 4 Ⅸ제1호나목)
// 방유제 용량 = 방유제 내용적 − (최대 탱크 외 탱크의 방유제 높이 이하 부분 + 기초 체적 + 간막이 둑 + 배관 등) — 같은 가목 후단.
// 화학물질관리법 방류벽(시행규칙 별표 5)은 용량 비율을 고시에서 정한다 → 판정기는 위험물 기준만 계산하고 화관법은 "확인 필요"로 둔다.

function aplDikeRequired(basis, tanks) {
  const vs = (tanks || []).filter(v => Number.isFinite(v) && v > 0).sort((a, b) => b - a);
  if (!vs.length) return null;
  const D = APL_HAZMAT.dike;
  const largest = vs[0];
  const rest = vs.slice(1).reduce((s, v) => s + v, 0);
  if (basis === "process") return { largest, rest, required: largest * D.process.first / 100 + rest * D.process.rest / 100 };
  const pct = basis === "tank_nonflam" ? D.tank.pctNonFlam : D.tank.pct;
  return { largest, rest, required: largest * pct / 100 };
}

// 방유제 크기(바닥 면적 m², 높이 m, 빼는 체적 m³)를 주면 유효 용량과 충족 여부(참고)
function aplDike({ basis, tanks, area, height, displacement }) {
  const req = aplDikeRequired(basis, tanks);
  if (!req) return null;
  const out = { ...req, effective: null, ok: null };
  if (Number.isFinite(area) && area > 0 && Number.isFinite(height) && height > 0) {
    out.effective = area * height - (Number.isFinite(displacement) && displacement > 0 ? displacement : 0);
    out.ok = out.effective >= req.required;
    out.minHeight = (req.required + (displacement > 0 ? displacement : 0)) / area;   // 같은 면적에서 필요한 높이(빼는 체적이 높이와 무관하다고 볼 때)
  }
  return out;
}

// 저장탱크 최대보유량(고시 별표 4 제3호가목: 설계용량 × 상온 비중) — m³ × (kg/L) = t
function aplHolding(volumeM3, density) {
  return Number.isFinite(volumeM3) && volumeM3 > 0 && Number.isFinite(density) && density > 0 ? volumeM3 * density : null;
}

Object.assign(window, { aplDikeRequired, aplDike, aplHolding });
