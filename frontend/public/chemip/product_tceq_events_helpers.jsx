// 텍사스 배출사고 패널 순수 함수 — 응답(/api/integrations/tceq-events/{cas}) → 표시 값. 화면은 product_tceq_events.jsx.

// 배출점 종류 막대 줄: [{kind, label, n, pct, p, discipline}] (많은 순). discipline 은 응답 disciplines 의 한 항목 또는 null.
function tceqKindRows(data) {
  const kinds = Object.entries(data?.point_kinds || {});
  const total = kinds.reduce((s, [, n]) => s + n, 0);
  const max = Math.max(1, ...kinds.map(([, n]) => n));
  const byKind = {};
  (data?.disciplines || []).forEach(d => d.kinds.forEach(k => { byKind[k] = d; }));
  return kinds
    .sort((a, b) => b[1] - a[1])
    .map(([kind, n]) => ({
      kind, n, label: TCEQ_EVENTS_LABELS.pointKindNames?.[kind] || data.point_kind_labels?.[kind] || kind,
      pct: total ? Math.round((n / total) * 1000) / 10 : 0, p: n / max, discipline: byKind[kind] || null,
    }));
}

function tceqPointTotal(data) {
  return Object.values(data?.point_kinds || {}).reduce((s, n) => s + n, 0);
}

// 파운드 → "1,234" / "873,610" (소수는 작은 값에만)
function tceqFmtLbs(v) {
  const n = Number(v || 0);
  if (!isFinite(n)) return "—";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: n < 10 ? 2 : 0 });
}

Object.assign(window, { tceqKindRows, tceqPointTotal, tceqFmtLbs });
