// 경고표지 "인쇄 / PDF 저장" 단추 — 누르면 body.gl-printing 을 켜고 표지 한 장(포털)만 인쇄한다(checklist_print.css).
// 어두운 테마여도 종이에는 밝은 토큰으로 찍고, 인쇄가 끝나면 되돌린다(체크리스트 인쇄와 같은 방식).

function GhsLabelPrintButton({ label }) {
  const L = GHS_LABELS.options;
  const [printing, setPrinting] = React.useState(false);

  React.useEffect(() => {
    if (!printing) return undefined;
    const root = document.documentElement;
    const theme = root.getAttribute("data-theme");
    const restore = () => {
      document.body.classList.remove("gl-printing");
      if (theme) root.setAttribute("data-theme", theme);
    };
    const done = () => { restore(); setPrinting(false); };
    if (theme === "dark") root.removeAttribute("data-theme");
    document.body.classList.add("gl-printing");
    window.addEventListener("afterprint", done);
    const t = setTimeout(() => window.print(), 50); // 포털이 그려진 뒤 인쇄 창을 연다
    return () => { clearTimeout(t); window.removeEventListener("afterprint", done); restore(); };
  }, [printing]);

  return (
    <>
      <button type="button" className="btn sm primary" onClick={() => setPrinting(true)}><Icon name="doc" size={12} /> {L.print}</button>
      {printing && ReactDOM.createPortal(<div className="gl-print-root" data-size={label.size.k}><GhsLabelSheet label={label} /></div>, document.body)}
    </>
  );
}

Object.assign(window, { GhsLabelPrintButton });
