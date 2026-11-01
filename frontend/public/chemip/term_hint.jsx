// 공용 용어 설명 — 용어 옆 작은 "?" 단추. 마우스를 올리거나(hover) 키보드로 초점을 주면 정의가 뜨고,
// 누르면(터치) 고정·해제, Esc·바깥 누르기·스크롤로 닫는다. 정의는 TERM_GLOSSARY(term_glossary.jsx) 한 곳에서 읽는다.
//   <TermHint term="reynolds" />   — 없는 key 면 아무것도 그리지 않는다. 스타일: term_hint.css(.th-*)
// 설명 상자는 화면 기준(position: fixed)으로 띄운다 — 가로 스크롤 표(overflow) 안에서도 잘리지 않게.
// 넓은 화면은 단추 아래(모자라면 위)에 화면 안으로 맞추고, 좁은 화면(TERM_HINT_NARROW)은 CSS 가 화면 아래쪽에 폭 맞춰 띄운다.

const TERM_HINT_NARROW = "(max-width: 560px)";
const TERM_HINT_GAP = 6;      // 단추와 상자 사이, 화면 가장자리 여백 [px]

// 단추 위치·상자 크기·화면 크기 → 상자 왼쪽 위 좌표(순수 함수)
function termHintPlace(btn, box, vw, vh) {
  const g = TERM_HINT_GAP;
  const left = Math.min(Math.max(btn.left - g, g), Math.max(g, vw - box.width - g));
  const below = btn.bottom + g;
  const top = below + box.height + g <= vh ? below : Math.max(g, btn.top - g - box.height);
  return { top: Math.round(top), left: Math.round(left) };
}

function TermHint({ term }) {
  const entry = TERM_GLOSSARY[term];
  const id = `th-${React.useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState(null);
  const wrap = useRef(null);
  const btn = useRef(null);
  const tip = useRef(null);
  const open = hover || focus || pinned;
  const close = () => { setHover(false); setFocus(false); setPinned(false); };

  // 열려 있는 동안: 바깥 누르기·스크롤·크기 바뀜이면 닫는다(상자가 단추에서 떨어지지 않게)
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrap.current && !wrap.current.contains(e.target)) close(); };
    const onMove = (e) => { if (!tip.current || !tip.current.contains(e.target)) close(); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  React.useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    if (window.matchMedia(TERM_HINT_NARROW).matches) { setPos({ narrow: true }); return; }
    setPos(termHintPlace(btn.current.getBoundingClientRect(), tip.current.getBoundingClientRect(), window.innerWidth, window.innerHeight));
  }, [open]);

  if (!entry) return null;
  const L = TERM_HINT_LABELS;
  const placed = pos && !pos.narrow ? { top: pos.top, left: pos.left } : undefined;
  return (
    <span className="th" ref={wrap}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onKeyDown={e => { if (e.key === "Escape" && open) { e.stopPropagation(); close(); } }}>
      <button type="button" ref={btn} className="th-btn" aria-label={L.button(entry.term)} aria-describedby={id} aria-expanded={open}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onClick={() => (pinned ? close() : setPinned(true))}>?</button>
      <span id={id} role="tooltip" ref={tip} className={`th-tip${pos ? "" : " is-placing"}`} style={placed} hidden={!open}>
        <b className="th-term">{entry.term}</b>
        <span className="th-def">{entry.def}</span>
        {entry.unit && <span className="th-meta">{L.unit}: {entry.unit}</span>}
        {entry.ref && <span className="th-meta">{L.ref}: {entry.ref}</span>}
        <a className="th-meta th-more" href={glossaryHref(term)}>{L.more}</a>
      </span>
    </span>
  );
}

Object.assign(window, { TermHint, termHintPlace });
