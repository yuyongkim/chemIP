// 물질 상세 머리 아래 "주요 물성" 한 줄 — 인화점·끓는점·녹는점·폭발 범위·자연발화온도·증기압·비중·분자량·UN 번호 가운데 값 있는 것만.
// 자료 useFacts(api_facts.jsx: 정적 f/<CAS>.json), 모양 factsStripItems(facts_core.jsx), 문구 FACTS_LABELS, 스타일 product_detail.css(.pd-facts*).
// 파일이 없거나(값 없음) 정적 자료가 꺼져 있으면 아무것도 그리지 않는다.

function KeyFactsStrip({ selected }) {
  const L = FACTS_LABELS;
  const facts = useFacts(selected?.cas_no || "");
  const items = factsStripItems(facts.data, L, CHEMIP_LANG);
  if (!items.length) return null;
  return (
    <section className="pd-facts" aria-label={L.strip.title}>
      <div className="pd-facts-head">
        <span className="pd-facts-title">{L.strip.title}</span>
        <span className="muted pd-facts-note">{L.strip.note}</span>
      </div>
      <dl className="pd-facts-list">
        {items.map(it => (
          <div key={it.k} className="pd-facts-item" title={[it.condition, it.origin].filter(Boolean).join(" · ") || undefined}>
            <dt>{it.label}</dt>
            <dd className="tnum" data-source-text={it.sourceText ? "" : undefined} lang={it.sourceText ? "ko" : undefined}>{it.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

Object.assign(window, { KeyFactsStrip });
