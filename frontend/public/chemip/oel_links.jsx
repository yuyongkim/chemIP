// 노출기준 비교 · 값을 싣지 않는 자료(ACGIH TLV, GESTIS-ILV) — 이름·이유·원문 링크만. 목록은 파일의 links(내보내기 config.OEL_LINK_ONLY).

function OelLinks({ links }) {
  const L = OEL_LABELS;
  if (!links || !links.length) return null;
  return (
    <div className="pd-oel-links">
      <div className="muted pd-mini">{L.linksTitle}</div>
      <ul>
        {links.map(l => (
          <li key={l.src}>
            <b>{(L.links[l.src] && L.links[l.src].name) || l.name}</b>{" "}
            <span className="muted">{(L.links[l.src] && L.links[l.src].why) || ""}</span>{" "}
            <SourceLink url={l.url} label={L.open} />
          </li>
        ))}
      </ul>
    </div>
  );
}

Object.assign(window, { OelLinks });
