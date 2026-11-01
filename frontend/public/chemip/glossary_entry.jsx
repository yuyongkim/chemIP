// 용어사전 · 항목 하나 — 이름(화면 언어)·다른 언어 이름·분류 배지·정의. 이름을 누르면 자세한 칸(glossary_entry_meta.jsx)을 펼친다.
// 주소로 연 용어(?term=)·관련 용어 단추로 간 용어는 펼치고 화면 가운데로 옮긴다(focus 가 바뀔 때마다).

function GlossaryEntry({ entry, open, onToggle, onOpen, query, focus }) {
  const L = GLOSSARY_LABELS;
  const ref = useRef(null);
  const other = CHEMIP_LANG === "en" ? entry.ko.term : entry.en.term;
  useEffect(() => {
    if (focus && ref.current && ref.current.scrollIntoView) ref.current.scrollIntoView({ block: "center" });
  }, [focus]);
  return (
    <li ref={ref} id={`gl-${entry.key}`} className={`us-item gl-entry${open ? " open" : ""}`}>
      <div className="us-item-head">
        <button type="button" className="us-item-title gl-entry-title" aria-expanded={open} onClick={() => onToggle(entry.key)}
          title={L.showDetail(entry.shown.term)}>
          <UsMark text={entry.shown.term} query={query} />
        </button>
        {other && other !== entry.shown.term && <span className="gl-other">{other}</span>}
        <span className="chip us-badge">{L.cats[entry.cat]}</span>
      </div>
      <p className="us-item-desc"><UsMark text={entry.shown.def} query={query} /></p>
      {open && <GlossaryEntryMeta entry={entry} onOpen={onOpen} />}
    </li>
  );
}

Object.assign(window, { GlossaryEntry });
