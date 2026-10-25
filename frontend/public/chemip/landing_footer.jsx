// 처음 화면 · 바닥글. 이용 링크 / 오픈소스 링크 / 연구·개발 화면 입구. 문구: LANDING_LABELS.footer

function LandingFooter({ setView }) {
  const F = LANDING_LABELS.footer;
  const L = F.links;
  const REPO = LANDING_LABELS.repoUrl;
  const go = (k) => (e) => { e.preventDefault(); setView && setView(k); };
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="brand ld-footer-brand"><div className="mark">Ch</div><span>ChemIP</span></div>
          <p className="ld-footer-about">{F.about}</p>
        </div>
        <div>
          <h6>{F.colUse}</h6>
          <a href="#" onClick={(e) => { e.preventDefault(); landingOpenSearch("", setView); }}>{L.search}</a>
          <a href="?view=board" onClick={go("board")}>{L.board}</a>
          <a href="?view=sources" onClick={go("sources")}>{L.sources}</a>
        </div>
        <div>
          <h6>{F.colOpen}</h6>
          <a href={REPO} target="_blank" rel="noopener">{L.repo}</a>
          <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noopener">{L.license}</a>
          <a href={`${REPO}/blob/main/README.md`} target="_blank" rel="noopener">{L.readme}</a>
        </div>
        <div>
          <h6>{F.colDev}</h6>
          <a href="?view=dev" onClick={go("dev")}>{L.dev}</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>{F.bottom}</span>
        <span>{F.notAdvice}</span>
      </div>
    </footer>
  );
}

Object.assign(window, { LandingFooter });
