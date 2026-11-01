// 규제 목록 · 쪽 넘기기(이전 / 쪽 번호 / 다음). 쪽이 하나면 그리지 않는다. 문구: REG_LABELS.detail.

function RegPager({ page, pages, onPage }) {
  const L = REG_LABELS.detail;
  if (pages <= 1) return null;
  return (
    <div className="reg-pager">
      <button type="button" className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>{L.prev}</button>
      <span className="mono tnum muted">{L.page(page, pages)}</span>
      <button type="button" className="btn sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>{L.next}</button>
    </div>
  );
}

Object.assign(window, { RegPager });
