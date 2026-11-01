// 통합 검색 바로 답 카드 · 비상대응 기준 — "<물질> AEGL·ERPG·PAC": 물어본 기준의 단계별 값 줄, 없을 때 안내, 출처 배지, 패널 링크.
// answer 모양: el_helpers.jsx elAnswer. 문구 EL_LABELS. 스타일: product_search.css(.us-answer*, 물성 답과 같은 틀).

function ElAnswerCard({ answer }) {
  const L = EL_LABELS.answer;
  return (
    <section className="us-answer" aria-label={answer.title}>
      <div className="us-answer-head">
        <a className="us-answer-title" href={answer.href}>{answer.title}</a>
        <span className="chip accent us-badge">{answer.source}</span>
        <span className="muted us-answer-cas mono">CAS {answer.cas}</span>
      </div>
      {answer.note && <div className="muted us-answer-meta">{answer.note}</div>}
      {answer.lines.map((l, i) => (
        <div key={i} className="us-answer-row">
          <span className="us-answer-part">{l.part}</span>
          <span className="us-answer-value us-answer-value-sm tnum">{l.text}</span>
        </div>
      ))}
      <a className="us-more" href={answer.href}>{L.more} <Icon name="chev" size={11} /></a>
    </section>
  );
}

Object.assign(window, { ElAnswerCard });
