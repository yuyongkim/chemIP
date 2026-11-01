// 물질 「국내 근거 조문」 패널 · 조문 글자에 이 물질 이름(국내 목록 표기)·CAS 가 한 낱말로 나오는 곳 — 처음엔 접어 두고 개수만 보인다.
// 펼치면 발췌(LawExcerpt, 찾은 말 표시). 자료: 내보낼 때 미리 찾은 cas_<n>.json 의 m(scripts/portal_build/law_mentions.py). 문구: LAW_LABELS.panel.

function LawMentionList({ mentions, total }) {
  const P = LAW_LABELS.panel;
  return (
    <details className="pd-law-mentions">
      <summary>
        <span className="pd-law-subhead">{P.mentionsHead}</span> <span className="muted mono pd-meta">{P.mentionsShown(mentions.length, total)}</span>
      </summary>
      <p className="muted pd-law-note">{P.mentionsNote}</p>
      {mentions.map((m, i) => <LawExcerpt key={i} cite={m} q={m.term} />)}
    </details>
  );
}

Object.assign(window, { LawMentionList });
