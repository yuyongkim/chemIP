// 최상위 화면 "경고표지 만들기"(?view=ghslabel, 등록은 app.jsx APP_SCREENS 한 줄) 셸 — 상태와 배치만.
// 자료: useGhsLabelSource(물질 상세, 정적 먼저)·useGhsPhrases(H/P 문구표). 계산: ghs_helpers.jsx·ghs_label_build.jsx.
// 문구: GHS_LABELS. 스타일: calc.css(.gl-* 화면), checklist_print.css(표지·인쇄).

function GhsLabelView() {
  const V = GHS_LABELS.view;
  const [link] = useState(() => ghsLabelReadLink(window.location.search));
  const [lang, setLang] = useState(link.lang || CHEMIP_LANG);
  const [size, setSize] = useState(link.size || GHS_LABEL_DEFAULT_SIZE);
  const [abbreviate, setAbbreviate] = useState(() => ghsDefaultAbbreviate(link.size || GHS_LABEL_DEFAULT_SIZE));
  const phrases = useGhsPhrases();
  const source = useGhsLabelSource(link.chem);
  const [supplier, setSupplier] = useGhsSupplier();
  const s2 = React.useMemo(() => (source.data ? ghsSection2(source.data.sections) : null), [source.data]);
  const [form, setForm] = useState(() => ({ ...ghsEmptyForm(), pictograms: link.pict }));
  const [filled, setFilled] = useState(false);

  // MSDS 원문은 한국어 — 다른 언어 표지면 문구표로 바꿔 채운다
  const sourceForm = (l) => {
    const f = ghsFormFromSection2(s2, source.data, l);
    return l === "ko" ? f : ghsTranslateForm(f, l, phrases.data);
  };
  useEffect(() => {
    if (filled || !s2 || !s2.has || (lang !== "ko" && phrases.loading)) return;
    setForm(sourceForm(lang));
    setFilled(true);
  }, [s2, phrases.loading]);

  const onLang = (l) => {
    if (l === lang) return;
    setForm(f => {
      const t = ghsTranslateForm(f, l, phrases.data);
      const keepName = source.data && f.product === ghsProductName(source.data, lang);
      return keepName ? { ...t, product: ghsProductName(source.data, l) } : t;
    });
    setLang(l);
  };
  const onSize = (k) => { setSize(k); setAbbreviate(ghsDefaultAbbreviate(k)); };
  const label = React.useMemo(
    () => ghsBuildLabel({ form, supplier, lang, size, abbreviate, phrases: phrases.data }),
    [form, supplier, lang, size, abbreviate, phrases.data],
  );

  return (
    <div className="calc-view gl-view">
      <h1 className="calc-title">{V.title}{V.titleSub && <> <span className="title-en">{V.titleSub}</span></>}</h1>
      <p className="calc-lede">{V.lede}</p>
      <GhsLabelStatus chem={link.chem} source={source} s2={s2} name={source.data ? ghsProductName(source.data, CHEMIP_LANG) : ""}
        phrasesError={Boolean(phrases.error)} hasUnofficial={label.hasUnofficial} />
      <GhsLabelToolbar size={size} onSize={onSize} lang={lang} onLang={onLang} abbreviate={abbreviate} onAbbreviate={setAbbreviate} label={label} />
      <div className="gl-layout">
        <GhsLabelForm form={form} onChange={setForm} supplier={supplier} onSupplier={setSupplier}
          onReset={s2 && s2.has ? () => setForm(sourceForm(lang)) : null} onClear={() => setForm(ghsEmptyForm())} />
        <div className="gl-side">
          <GhsLabelPreview label={label} />
          <ul className="calc-list gl-notes">{V.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GhsLabelView });
