// 적용 법규 판정기 · 화면 공용 조각: 판정 배지(AplVerdict), 근거 조문 링크(AplCiteLink, 말뭉치에 있는 법령이면 "ChemIP 에서 보기" — law_corpus_link.jsx), 행별 이유 목록(AplReasonList).
// 문구: APL_LABELS, 스타일: calc.css(.apl-*).

function AplVerdict({ v }) {
  return <span className={`apl-verdict is-${v}`}>{APL_LABELS.verdicts[v] || v}</span>;
}

function AplCiteLink({ k }) {
  const c = aplCite(k);
  if (!c) return null;
  return (
    <>
      <a className="apl-cite" href={c.url} target="_blank" rel="noopener noreferrer">{c.name} <Icon name="ext" size={11} /></a>
      <LawCorpusLink url={c.url} className="apl-cite-local" />
    </>
  );
}

// entries: [{ id, name, reasons: [{k, v}] }] — 이유가 있는 행만
function AplReasonList({ entries }) {
  const L = APL_LABELS;
  const list = (entries || []).filter(e => e.reasons && e.reasons.length);
  if (!list.length) return null;
  return (
    <ul className="apl-reasons">
      {list.map(e => (
        <li key={e.id}><b>{e.name}</b>: {e.reasons.map(r => aplReasonText(r, L)).join(" · ")}</li>
      ))}
    </ul>
  );
}

Object.assign(window, { AplVerdict, AplCiteLink, AplReasonList });
