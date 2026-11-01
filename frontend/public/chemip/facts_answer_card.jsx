// 통합 검색 바로 답 카드 · 물성 — 물질·물성 이름, 값(하한/상한이면 두 줄), 조건, 원출처, 출처 배지, 물질 상세 링크.
// 운송(UN 번호) 답이면 UN 번호·등급 칸. answer 모양: factsAnswer(facts_core.jsx). 문구 FACTS_LABELS. 스타일 product_search.css(.us-answer*).

function FactsAnswerValue({ v }) {
  const L = FACTS_LABELS;
  return (
    <div className="us-answer-row">
      {v.part && <span className="us-answer-part">{v.part}</span>}
      <span className="us-answer-value tnum" data-source-text={v.sourceText ? "" : undefined} lang={v.sourceText ? "ko" : undefined}>{v.text}</span>
      {v.condition && <span className="us-answer-meta" data-source-text="">{L.condition}: {v.condition}</span>}
      {v.origin && <span className="us-answer-meta" data-source-text="">{L.origin}: {v.origin}</span>}
    </div>
  );
}

function FactsAnswerTransport({ t }) {
  const L = FACTS_LABELS;
  return (
    <div className="us-answer-row">
      <span className="us-answer-value tnum">{L.transport.title(t.un, "")}</span>
      {t.name && <span className="us-answer-meta" data-source-text="">{t.name}</span>}
      {t.facts.map(f => <span key={f.k} className="chip">{f.label} {f.value}</span>)}
    </div>
  );
}

function FactsAnswerCard({ answer }) {
  const L = FACTS_LABELS;
  return (
    <section className="us-answer" aria-label={answer.title}>
      <div className="us-answer-head">
        <a className="us-answer-title" href={answer.href} data-source-text="">{answer.title}</a>
        <span className="chip accent us-badge">{answer.source || L.msdsSource}</span>
        <span className="muted us-answer-cas mono">CAS {answer.cas}</span>
      </div>
      {answer.transport
        ? <FactsAnswerTransport t={answer.transport} />
        : answer.values.map((v, i) => <FactsAnswerValue key={i} v={v} />)}
      <a className="us-more" href={answer.href}>{L.more} <Icon name="chev" size={11} /></a>
    </section>
  );
}

Object.assign(window, { FactsAnswerCard });
