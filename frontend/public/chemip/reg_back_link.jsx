// 규제 목록 · 목록 화면 맨 위 "← 규제 목록" 링크(주소 ?view=reg, 누르면 화면 안에서 돌아감). 문구: REG_LABELS.detail.back.

function RegBackLink({ onBack }) {
  return (
    <a className="ui-link-btn reg-back" href={regHref("")} onClick={(e) => { e.preventDefault(); onBack(); }}>{REG_LABELS.detail.back}</a>
  );
}

Object.assign(window, { RegBackLink });
