// "KORA 입력 준비표" 인쇄 단추 — 누르면 body.kora-printing 을 켜고 준비표 한 벌(포털)만 인쇄한다(calc.css 의 @media print).
// 어두운 테마여도 종이에는 밝은 토큰으로 찍고, 인쇄가 끝나면 되돌린다(체크리스트·경고표지 인쇄와 같은 방식).

function KoraSheetPrintButton({ model, made }) {
  const L = KORA_SHEET;
  const [printing, setPrinting] = React.useState(false);

  React.useEffect(() => {
    if (!printing) return undefined;
    const root = document.documentElement;
    const theme = root.getAttribute("data-theme");
    const restore = () => {
      document.body.classList.remove("kora-printing");
      if (theme) root.setAttribute("data-theme", theme);
    };
    const done = () => { restore(); setPrinting(false); };
    if (theme === "dark") root.removeAttribute("data-theme");
    document.body.classList.add("kora-printing");
    window.addEventListener("afterprint", done);
    const t = setTimeout(() => window.print(), 50); // 포털이 그려진 뒤 인쇄 창을 연다
    return () => { clearTimeout(t); window.removeEventListener("afterprint", done); restore(); };
  }, [printing]);

  return (
    <>
      <button type="button" className="btn sm primary" onClick={() => setPrinting(true)}><Icon name="doc" size={12} /> {L.print}</button>
      {printing && ReactDOM.createPortal(
        <div className="kora-print-root">
          <h1 className="kora-print-title">{L.title}</h1>
          <p className="kora-disclaimer">{L.disclaimer}</p>
          <KoraSheetTable model={model} />
          <p className="kora-print-foot">{made}</p>
        </div>, document.body)}
    </>
  );
}

Object.assign(window, { KoraSheetPrintButton });
