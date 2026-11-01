// 화학사고 소식 · 출처와 이용 조건(자료 파일 sources: 이름·주소·라이선스 원문·건수). 문구: FEED_LABELS.attribution.

function FeedAttribution({ sources }) {
  const A = FEED_LABELS.attribution;
  const rows = Object.entries(sources || {});
  if (!rows.length) return null;
  return (
    <Collapsible className="feed-attr" summary={A.title}>
      <p className="muted feed-mini">{A.note}</p>
      <ul className="feed-attr-list">
        {rows.map(([sid, s]) => (
          <li key={sid}>
            <b>{feedSourceName(sid, FEED_LABELS, sources)}</b>{" "}
            {s.url ? <a href={s.url} target="_blank" rel="noopener">{s.name}</a> : s.name}
            <span className="muted"> · {A.items(s.n || 0)}</span>
            <div className="muted feed-mini">{s.license}</div>
          </li>
        ))}
      </ul>
    </Collapsible>
  );
}

Object.assign(window, { FeedAttribution });
