// 패널 머리(.panel > h3) 한 줄: 한국어 제목 + 작은 영문 보조 + 오른쪽 부가 정보.
// t 는 { ko, en } (product_labels.jsx 등). 문자열을 넘기면 그대로 제목으로 쓴다. 영어 화면에서는 영문 제목 하나만 보인다.

function PanelTitle({ t, children }) {
  const ko = typeof t === "string" ? t : t?.ko;
  const en = typeof t === "string" ? "" : t?.en;
  const main = tr(ko, en || null);
  const sub = tr(en, "");
  return (
    <h3>
      <b>{main}{sub && sub !== main && <span className="title-en" lang="en">{sub}</span>}</b>
      {children}
    </h3>
  );
}

Object.assign(window, { PanelTitle });
