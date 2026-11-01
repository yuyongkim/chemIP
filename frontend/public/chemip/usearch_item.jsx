// 통합 검색 · 결과 한 건 — 제목(링크)·배지·보조 줄·설명. 외부 문서(KOSHA 원문)는 새 창. 모양은 item(usearch_core.jsx 머리 주석).

function UsItem({ item, query }) {
  const L = USEARCH_LABELS;
  const title = <UsMark text={item.title} query={query} />;
  return (
    <li className="us-item">
      <div className="us-item-head">
        {item.href
          ? <a className="us-item-title" href={item.href} {...(item.external ? { target: "_blank", rel: "noopener", title: L.external } : {})}>
              {title}{item.external && <Icon name="ext" size={11} className="us-ext" />}
            </a>
          : <span className="us-item-title">{title}</span>}
        {item.badge && <span className="chip us-badge">{item.badge}</span>}
      </div>
      {item.sub && <div className="us-item-sub"><UsMark text={item.sub} query={query} /></div>}
      {item.desc && <p className="us-item-desc"><UsMark text={item.desc} query={query} /></p>}
    </li>
  );
}

Object.assign(window, { UsItem });
