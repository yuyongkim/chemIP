// 상세 탭 순수 함수 — 응답 → 표시 값. 화면 조각은 product_<탭>.jsx 에 있다.

// Highlight terms: given names/CAS (de-duped, length > 1). "아세톤 (Acetone)" → "아세톤 (Acetone)", "아세톤", "Acetone"
function highlightTerms(values) {
  const seen = new Set();
  const out = [];
  values.forEach(t => {
    if (!t) return;
    const trimmed = String(t).trim();
    if (trimmed.length < 2) return;
    const matches = trimmed.match(/[^\s()]+/g) || [];
    [trimmed, ...matches].forEach(m => {
      const key = m.toLowerCase();
      if (m.length > 1 && !seen.has(key)) { seen.add(key); out.push(m); }
    });
  });
  return out;
}

// 특허 결과 → 연도별 출원 막대(p = 최대 대비 비율)와 주요 출원인 6곳
function patentStats(results) {
  const years = {};
  const apps = {};
  results.forEach(r => {
    const yr = (r.applicationDate || "").slice(0, 4);
    if (yr) years[yr] = (years[yr] || 0) + 1;
    const a = r.applicantName || "—";
    apps[a] = (apps[a] || 0) + 1;
  });
  const sortedYears = Object.entries(years).sort(([a], [b]) => a.localeCompare(b));
  const sortedApps = Object.entries(apps).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(1, ...Object.values(years));
  return {
    yearBars: sortedYears.map(([y, n]) => ({ y, n, p: n / max })),
    topApplicants: sortedApps.map(([n, v]) => ({ n, v, p: v / Math.max(1, sortedApps[0]?.[1] || 1) })),
  };
}

// 가이드 일치도 구간: ≥80 strong, 30–79 moderate, <30 generic(일반 가이드일 수 있음). 숫자가 아니면 null.
function guideTier(score) {
  if (typeof score !== "number") return null;
  return score >= 80 ? "strong" : score >= 30 ? "moderate" : "generic";
}

// 규제 정보 응답 → 출처별 묶음(없으면 빈 묶음)
function intelSources(data) {
  const sources = data?.sources || {};
  const empty = { data: [] };
  return {
    echa: sources.echa || empty, niosh: sources.niosh || empty, comptox: sources.comptox || empty,
    kischem: sources.kischem || empty, ncis: sources.ncis || empty,
    aliases: data?.aliases || [], terms: data?.search_terms || [],
  };
}

// De-dupe REACH statuses across all ECHA records
function reachStatuses(echaData) {
  const out = [], seen = new Set();
  (echaData || []).forEach(it => (it.reach_status || []).forEach(s => {
    if (s && s.code && !seen.has(s.code)) { seen.add(s.code); out.push(s); }
  }));
  return out;
}

Object.assign(window, { highlightTerms, patentStats, guideTier, intelSources, reachStatuses });
