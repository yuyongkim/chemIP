// 통합 검색 · 결과가 없거나 불러오지 못한 묶음을 한 줄로("결과 없음 공학 계산기 · 용어 설명").

function UsEmptyLine({ groups, label }) {
  if (!groups.length) return null;
  const L = USEARCH_LABELS;
  return (
    <div className="muted us-empty-line">
      <b>{label}</b> {groups.map(g => L.groups[g.k]).join(" · ")}
    </div>
  );
}

Object.assign(window, { UsEmptyLine });
