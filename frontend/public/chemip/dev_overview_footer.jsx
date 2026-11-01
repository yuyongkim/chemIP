// 개발자용 소개 바닥글 — 소개 한 줄과 링크 묶음(PRODUCT·DOCS·COMMUNITY). 문구: DEV_OVERVIEW.footer.

function DevFooter({ setView }) {
  const F = DEV_OVERVIEW.footer;
  const goProduct = (e) => { e.preventDefault(); setView && setView("product"); };
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="brand dvo-brand">
            <div className="mark">Ch</div>
            <span>ChemIP</span>
            <span className="sub">{F.version}</span>
          </div>
          <p className="muted dvo-blurb">{F.blurb}</p>
        </div>
        {F.columns.map(col => (
          <div key={col.h}>
            <h6>{col.h}</h6>
            {col.links.map(l => l.ext
              ? <a key={l.label} href={l.href} target="_blank" rel="noopener">{l.label}</a>
              : <a key={l.label} href={l.href} onClick={l.product ? goProduct : undefined}>{l.label}</a>)}
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        {F.bottom.map(t => <span key={t}>{t}</span>)}
      </div>
    </footer>
  );
}

Object.assign(window, { DevFooter });
