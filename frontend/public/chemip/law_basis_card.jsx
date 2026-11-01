// 물질 「국내 근거 조문」 패널 · 목록 카드 하나 — 목록 이름(+목록 링크), "이 목록이면 할 일" 한 줄(LAW_DUTIES), 역할 붙은 인용 칩,
// 접힌 "조문 보기"(발췌가 있는 인용만, LawExcerpt). 목록 이름: reg_helpers.jsx regListTitle. 문구: LAW_LABELS.panel. 스타일: .pd-law-card.

function LawBasisCard({ list }) {
  const P = LAW_LABELS.panel;
  const duty = (LAW_DUTIES[list.id] || {}).text;
  const withText = list.cites.filter(c => c.snippet);
  return (
    <article className="pd-law-card">
      <div className="pd-law-card-head">
        <b>{regListTitle({ id: list.id, title: list.title })}</b>
        <a className="pd-link-xs" href={`?view=reg&list=${encodeURIComponent(list.id)}`}>{P.listLink}</a>
      </div>
      {duty && <p className="pd-law-duty">{duty}</p>}
      <div className="pd-law-chips">
        {list.cites.map((c, i) => <LawCiteChip key={i} cite={c} />)}
      </div>
      {withText.length > 0 && (
        <details className="pd-law-more">
          <summary>{P.showText(withText.length)}</summary>
          {withText.map((c, i) => <LawExcerpt key={i} cite={c} />)}
        </details>
      )}
    </article>
  );
}

Object.assign(window, { LawBasisCard });
