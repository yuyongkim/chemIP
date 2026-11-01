// 법제처 주소(law.go.kr/법령/<이름>/제N조, 행정규칙/<이름>) 옆에 붙이는 "ChemIP 에서 보기" — 그 법령이 말뭉치(law/index.json)에 있을 때만.
// 적용 법규 판정기 근거 조문(apl_common.jsx AplCiteLink)이 쓴다. 주소 읽기: law_core.jsx lawFromGoKrUrl·lawResolveDoc. 문구: LAW_LABELS.corpusLink.

function LawCorpusLink({ url, className = "" }) {
  const parsed = lawFromGoKrUrl(url);
  const index = useLawIndex(Boolean(parsed));
  const meta = parsed && index.data ? lawResolveDoc(index.data, parsed.name) : null;
  if (!meta) return null;
  return <a className={`law-corpus-link${className ? ` ${className}` : ""}`} href={lawViewHref(meta.id, parsed.art)}>{LAW_LABELS.corpusLink}</a>;
}

Object.assign(window, { LawCorpusLink });
