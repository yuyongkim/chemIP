// 상단 바의 작은 "사이트 이동 / Sites" 메뉴 — 패밀리 사이트 네 곳, 지금 사이트(self)는 표시만.
// 열기: 단추(aria-expanded). 닫기: Esc(단추로 초점 복귀)·바깥 누르기·Tab·링크 누르기. 위/아래·Home/End 로 항목 이동.
// 목록: FAMILY_SITES(family_sites.jsx), 문구: FAMILY_LABELS. 스타일: app.css .fam-menu*

const FAM_MENU_ID = "fam-menu-list";

function famMenuItems(root) {
  return root ? [...root.querySelectorAll('[role="menuitem"]')] : [];
}

function FamilySitesMenu() {
  const L = FAMILY_LABELS;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      if (btnRef.current) btnRef.current.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    const first = famMenuItems(wrapRef.current)[0];
    if (first) first.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onMenuKey = (e) => {
    if (e.key === "Tab") { setOpen(false); return; }
    const items = famMenuItems(wrapRef.current);
    const i = items.indexOf(document.activeElement);
    const go = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (go === undefined || !items.length) return;
    e.preventDefault();
    items[(go + items.length) % items.length].focus();
  };

  return (
    <div className="fam-menu" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="btn sm ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={FAM_MENU_ID}
        title={L.menuAria}
        onClick={() => setOpen(v => !v)}
      >
        <Icon name="globe" size={12} /> <span className="topbar-btn-text">{L.menuButton}</span>
      </button>
      {open && (
        <ul id={FAM_MENU_ID} className="fam-menu-list" role="menu" aria-label={L.menuAria} onKeyDown={onMenuKey}>
          {FAMILY_SITES.map(s => (
            <li key={s.key} role="none">
              {s.self ? (
                <span role="menuitem" tabIndex={-1} aria-current="page" aria-disabled="true" className="fam-menu-item is-current">
                  <span className="fam-name">{s.name} <span className="fam-current">{L.current}</span></span>
                  <span className="fam-desc">{familySiteDesc(s)}</span>
                </span>
              ) : (
                <a role="menuitem" tabIndex={-1} className="fam-menu-item" href={s.url} target="_blank" rel="noopener"
                  title={`${s.name} (${L.newTab})`} onClick={() => setOpen(false)}>
                  <span className="fam-name">{s.name}</span>
                  <span className="fam-desc">{familySiteDesc(s)}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

Object.assign(window, { FamilySitesMenu });
