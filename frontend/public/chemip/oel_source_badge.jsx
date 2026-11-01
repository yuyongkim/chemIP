// 노출기준 비교 · 출처 배지 — 관할 이름 + 출처 이름(원문 링크, 라이선스는 title). 출처 이름은 OEL_LABELS.sources, 없으면 파일의 이름.

function OelSourceBadge({ j, src, source }) {
  const L = OEL_LABELS;
  const name = L.sources[src] || (source && source.name) || src;
  const title = L.sourceTitle((source && source.name) || name, source && source.license);
  return (
    <div className="pd-oel-src">
      <b>{jurisdictionName(j)}</b>
      {source && source.url
        ? <a className="chip ui-badge pd-oel-badge" href={source.url} target="_blank" rel="noopener" title={title}>{name}</a>
        : <span className="chip ui-badge pd-oel-badge" title={title}>{name}</span>}
    </div>
  );
}

Object.assign(window, { OelSourceBadge });
