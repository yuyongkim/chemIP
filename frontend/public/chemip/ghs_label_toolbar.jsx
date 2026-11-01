// 경고표지 조작 줄 — 크기(A4·A5·소형)·표지 언어(한국어·English)·예방조치문구 줄이기·인쇄.

const GHS_LABEL_LANG_CHOICES = ["ko", "en"];

function GhsLabelToolbar({ size, onSize, lang, onLang, abbreviate, onAbbreviate, label }) {
  const O = GHS_LABELS.options;
  return (
    <div className="gl-toolbar">
      <div className="gl-tool">
        <span className="calc-label">{O.size}</span>
        <div className="seg calc-seg" role="group" aria-label={O.size}>
          {GHS_LABEL_SIZES.map(s => <button key={s.k} type="button" aria-pressed={size === s.k} onClick={() => onSize(s.k)}>{O.sizes[s.k]}</button>)}
        </div>
      </div>
      <div className="gl-tool">
        <span className="calc-label">{O.lang}</span>
        <div className="seg calc-seg" role="group" aria-label={O.lang}>
          {GHS_LABEL_LANG_CHOICES.map(l => <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => onLang(l)}>{O.langs[l]}</button>)}
        </div>
      </div>
      <label className="gl-check">
        <input type="checkbox" checked={abbreviate} onChange={e => onAbbreviate(e.target.checked)} /> {O.abbreviate}
      </label>
      <div className="gl-tool gl-tool-print">
        <GhsLabelPrintButton label={label} />
        <span className="calc-hint">{O.printHint}</span>
      </div>
    </div>
  );
}

Object.assign(window, { GhsLabelToolbar });
