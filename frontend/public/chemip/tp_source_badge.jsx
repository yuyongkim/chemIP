// 온도별 물성 · 출처 배지 — 짧은 이름(원 자료 주소 링크), title 에 정식 이름·라이선스·인용·변경 안내.

function TpSourceBadge({ src, sources }) {
  const L = TP_LABELS;
  const s = (sources && sources[src]) || {};
  const name = tpSourceShort(src, L);
  const title = L.sourceTitle(s);
  const href = s.home || s.url;
  return href
    ? <a className="chip ui-badge pd-tp-badge" href={href} target="_blank" rel="noopener" title={title}>{name}</a>
    : <span className="chip ui-badge pd-tp-badge" title={title}>{name}</span>;
}

Object.assign(window, { TpSourceBadge });
