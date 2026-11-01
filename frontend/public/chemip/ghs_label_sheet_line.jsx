// 경고표지의 H/P 문구 한 줄 — 코드(굵게) + 문장, 비공식 번역이면 표시(mark).

function GhsLabelSheetLine({ st, mark }) {
  return (
    <li>
      {st.code && <b className="gl-code">{st.code}</b>} {st.text}{st.unofficial && <sup>{mark}</sup>}
    </li>
  );
}

Object.assign(window, { GhsLabelSheetLine });
