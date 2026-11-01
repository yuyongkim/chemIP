// 화학사고 소식 · 한 건: 종류 배지·날짜·출처·나라 / 제목(원문 새 창) / 요약 / 물질(→ 물질 화면 사고 사례 패널) / 설비·설계 분야.
// 표시 값은 feedItemView(feed_helpers.jsx). 문구: FEED_LABELS. 스타일: product_views.css(.feed-*).

const FEED_KIND_TONE = { incident: "hazard", news: "accent", press: "" };

function FeedItem({ item, sources, disciplines }) {
  const L = FEED_LABELS;
  const v = feedItemView(item, L, sources, jurisdictionName);
  const discNames = (typeof PRODUCT_LABELS !== "undefined" && PRODUCT_LABELS.disciplineNames) || null;
  return (
    <article className="feed-item">
      <div className="feed-item-head">
        <Badge tone={FEED_KIND_TONE[v.kind]}>{v.kindLabel}</Badge>
        <span className="mono tnum muted feed-mini">{v.date}</span>
        <span className="muted feed-mini">{[v.source, v.country].filter(Boolean).join(" · ")}</span>
      </div>
      <h4 className="feed-item-title">
        {v.url ? <a href={v.url} target="_blank" rel="noopener" title={L.openTitle}>{v.title}</a> : v.title}
      </h4>
      {v.summary && <p className="feed-item-summary">{v.summary}</p>}
      {(v.chems.length > 0 || v.disciplines.length > 0) && (
        <div className="feed-item-tags">
          {v.chems.map(c => (
            <a key={c.cas} className="chip accent feed-chem" href={c.href} title={L.substanceLinkTitle}>
              {c.name} <span className="mono muted">{c.cas}</span>
            </a>
          ))}
          {v.disciplines.map(d => <span key={d} className="chip feed-disc">{feedDisciplineName(d, discNames, disciplines)}</span>)}
        </div>
      )}
      {v.equipment.length > 0 && <div className="muted feed-mini">{L.equipment}: {v.equipment.join(", ")}</div>}
    </article>
  );
}

Object.assign(window, { FeedItem });
