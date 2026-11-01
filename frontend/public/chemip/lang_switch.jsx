// 상단 바의 화면 언어 전환 "한 / EN". 누르면 setChemipLang(lang.jsx)이 저장하고 ?lang= 을 붙여 다시 연다.
// 단추 이름은 APP_LANG_NAMES·APP_LANG_TITLES, 묶음 이름은 APP_LABELS.langAria(app_labels*.jsx). 스타일: app.css .seg · .lang-seg

function LangSwitch() {
  return (
    <div className="seg lang-seg" role="group" aria-label={APP_LABELS.langAria}>
      {CHEMIP_LANGS.map(l => (
        <button key={l} type="button" lang={l} aria-pressed={CHEMIP_LANG === l} title={APP_LANG_TITLES[l]} onClick={() => setChemipLang(l)}>
          {APP_LANG_NAMES[l]}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { LangSwitch });
