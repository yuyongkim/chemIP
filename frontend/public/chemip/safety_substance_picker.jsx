// 안전 도구 공용 · 물질 고르기 — 이름·CAS 를 넣으면 물질 검색 결과 8건(useSubstanceSuggest)을 보이고, 고르면 onPick(검색 항목).
// 위/아래 키로 옮기고 Enter 로 고른다. 문구: SAFETY_LABELS.picker. 스타일: calc.css .sft-pick*

function SubstancePicker({ onPick, disabled, max, label }) {
  const L = SAFETY_LABELS.picker;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const sug = useSubstanceSuggest(open ? q : "");
  const items = (sug.data?.items || []).slice(0, 8);
  const listId = React.useId ? React.useId() : "sft-pick-list";
  const pick = (it) => { onPick(it); setQ(""); setOpen(false); setCursor(0); };
  const onKey = (e) => {
    if (!items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(items.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(items[cursor]); }
    else if (e.key === "Escape") setOpen(false);
  };
  const busy = open && q.trim().length >= 2 && sug.loading;
  return (
    <div className="sft-pick">
      <label className="calc-label" htmlFor={`${listId}-in`}>{label || L.label}</label>
      <input id={`${listId}-in`} className="calc-input" type="search" autoComplete="off" placeholder={L.placeholder}
        value={q} disabled={disabled} aria-expanded={open && items.length > 0} aria-controls={listId} role="combobox"
        onChange={e => { setQ(e.target.value); setOpen(true); setCursor(0); }} onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKey} />
      {disabled && max ? <div className="calc-hint">{L.full(max)}</div> : null}
      {open && q.trim().length >= 2 && (
        <ul id={listId} className="sft-pick-list" role="listbox">
          {busy && <li className="sft-pick-note">{L.searching}</li>}
          {!busy && sug.error && <li className="sft-pick-note">{L.failed}</li>}
          {!busy && !sug.error && items.length === 0 && <li className="sft-pick-note">{L.none}</li>}
          {!busy && items.map((it, i) => (
            <li key={`${it.chem_id}-${i}`} role="option" aria-selected={i === cursor}
              className={`sft-pick-item${i === cursor ? " is-cursor" : ""}`}
              onMouseDown={e => { e.preventDefault(); pick(it); }}>
              <span className="sft-pick-name">{chemPrimaryName(it)}</span>
              <span className="sft-pick-meta mono">{it.cas_no || L.noCas}{it.has_msds ? ` · ${L.msds}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

Object.assign(window, { SubstancePicker });
