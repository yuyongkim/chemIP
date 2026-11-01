// 용어사전 · 항목 하나를 펼쳤을 때의 자세한 칸 — 다른 이름·단위·근거 조문(국가법령정보센터 링크)·참고·시험·관련 용어·계산기·화면·정의 출처·주소 복사.

function GlossaryEntryMeta({ entry, onOpen }) {
  const L = GLOSSARY_LABELS;
  const s = entry.shown;
  const [copied, setCopied] = useState(false);
  // 다른 이름: 한국어 화면은 한·영 모두, 영어 화면은 영어 쪽만.
  const aliases = usUnique([...(CHEMIP_LANG === "en" ? [] : entry.ko.alias || []), ...(entry.en.alias || [])]);
  const see = (entry.see || []).map(k => glFind(GLOSSARY_ENTRIES, k)).filter(Boolean);
  const calc = entry.calc ? calcFind(entry.calc) : null;
  const copy = () => {
    const url = new URL(glossaryHref(entry.key), location.href).toString();
    try { navigator.clipboard.writeText(url).then(() => setCopied(true), () => {}); } catch (e) {}
  };
  const row = (label, body) => (body ? <div className="gl-meta-row"><dt>{label}</dt><dd>{body}</dd></div> : null);
  const law = s.law && (entry.lawUrl
    ? <a href={entry.lawUrl} target="_blank" rel="noopener" title={L.lawOpen}>{s.law} <Icon name="ext" size={11} /></a>
    : s.law);
  const seeChips = see.length ? (
    <span className="gl-see">
      {see.map(e => <button key={e.key} type="button" className="chip gl-see-chip" onClick={() => onOpen(e.key)}>{e.shown.term}</button>)}
    </span>
  ) : "";
  return (
    <dl className="gl-meta">
      {row(L.field.alias, aliases.join(" · "))}
      {row(L.field.unit, s.unit)}
      {row(L.field.law, law)}
      {row(L.field.ref, s.ref)}
      {row(L.field.exams, (entry.exams || []).map(x => L.exams[x]).filter(Boolean).join(" · "))}
      {row(L.field.see, seeChips)}
      {row(L.field.calc, calc ? <a href={calcHref(calc.key)}>{calc.title}</a> : "")}
      {row(L.field.view, entry.view && L.screens[entry.view] ? <a href={`?view=${entry.view}`}>{L.screens[entry.view]}</a> : "")}
      {row(L.field.src, L.src[entry.src] || L.src.own)}
      <div className="gl-meta-row gl-meta-actions">
        <button type="button" className="btn ghost gl-copy" onClick={copy}>{copied ? L.copied : L.copyLink}</button>
      </div>
    </dl>
  );
}

Object.assign(window, { GlossaryEntryMeta });
