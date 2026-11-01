// 공학 계산기 목록 — 묶음(CALC_GROUPS)별 계산기 버튼. 목록은 CALC_REGISTRY 에서만 나온다.
// 좁은 화면(CALC_NAV_NARROW, calc.css 의 860px 와 같은 값)에서는 묶음을 접어 두고 지금 계산기가 든 묶음만 펼친다.

const CALC_NAV_NARROW = "(max-width: 860px)";

function CalcNav({ current, onPick }) {
  const L = CALC_LABELS;
  const narrow = useMediaQuery(CALC_NAV_NARROW);
  const curGroup = (calcFind(current) || {}).group;
  const [open, setOpen] = useState(() => new Set(curGroup ? [curGroup] : []));
  useEffect(() => { if (curGroup) setOpen(s => (s.has(curGroup) ? s : new Set([...s, curGroup]))); }, [curGroup]);
  const toggle = (g) => setOpen(s => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; });
  return (
    <nav className={`calc-nav${narrow ? " is-narrow" : ""}`} aria-label={L.navAria}>
      {CALC_GROUPS.map(g => {
        const items = CALC_REGISTRY.filter(d => d.group === g);
        const shown = !narrow || open.has(g);
        const head = <>{L.groups[g].name}{L.groups[g].sub && <> <span className="title-en">{L.groups[g].sub}</span></>}</>;
        return (
          <div key={g} className="calc-nav-group">
            {narrow
              ? <button type="button" className="calc-nav-head calc-nav-toggle" aria-expanded={shown} onClick={() => toggle(g)}>
                  <span>{head}</span><span className="calc-nav-count">{items.length}</span><Icon name="chev" size={14} />
                </button>
              : <div className="calc-nav-head">{head}</div>}
            {shown && (
              <div className="calc-nav-items">
                {items.map(d => (
                  <button key={d.key} type="button" className="calc-nav-item" aria-pressed={current === d.key} onClick={() => onPick(d.key)}>
                    {d.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

Object.assign(window, { CalcNav, CALC_NAV_NARROW });
