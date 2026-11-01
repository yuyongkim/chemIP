// 통합 검색 · 어느 묶음에도 결과가 없을 때의 안내(검색 요령).

function UsNoResults({ query }) {
  const L = USEARCH_LABELS;
  return (
    <div className="card us-none">
      <p className="us-none-title">{L.emptyAll(query)}</p>
      <ul className="us-none-tips">{L.emptyTips.map(t => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

Object.assign(window, { UsNoResults });
