// 모든 화면 맨 아래 한 줄 "패밀리 사이트" — 자기 자신(self)을 뺀 세 사이트, 이름 + 작은 설명, 새 탭.
// 목록: FAMILY_SITES(family_sites.jsx), 문구: FAMILY_LABELS. 스타일: app.css .fam-footer*

function FamilyFooter() {
  const L = FAMILY_LABELS;
  const others = FAMILY_SITES.filter(s => !s.self);
  return (
    <footer className="fam-footer" aria-labelledby="fam-footer-title">
      <div className="fam-footer-inner">
        <h2 id="fam-footer-title" className="fam-footer-title">{L.title}</h2>
        <ul className="fam-footer-list">
          {others.map(s => (
            <li key={s.key}>
              <a href={s.url} target="_blank" rel="noopener" title={`${s.name} (${L.newTab})`}>
                <span className="fam-name">{s.name}</span>
                <span className="fam-desc">{familySiteDesc(s)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

Object.assign(window, { FamilyFooter });
