// 국내 법령 보기 · 차례 — 장·절 제목(깊이대로 들여쓰기)과 조문(누르면 그 조로, 주소 art=). 모양: law_core.jsx lawTocEntries.

function LawToc({ entries, docId, current, q, onOpen }) {
  return (
    <ol className="law-toc" lang="ko">
      {entries.map(e => (
        <li key={e.i} className={`law-toc-item d${Math.min(e.depth, 4)}${e.t === "h" ? " is-heading" : ""}${e.no === current && e.t !== "h" ? " is-current" : ""}`}>
          {e.t === "h"
            ? <span data-source-text="">{e.label}</span>
            : <LawLink law={docId} art={e.no} q={q} onOpen={onOpen}><span className="mono" data-source-text="">{e.label}</span>{e.title && <span data-source-text="">{` ${e.title}`}</span>}</LawLink>}
        </li>
      ))}
    </ol>
  );
}

Object.assign(window, { LawToc });
