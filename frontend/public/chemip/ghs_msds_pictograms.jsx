// MSDS 2항 "그림문자" 값(원문 "GHS02.gif|GHS07.gif")을 그림 줄로. 코드를 못 읽으면 원문 글자 그대로.

function GhsMsdsPictograms({ text }) {
  const { codes, unknown } = ghsParsePictograms(text);
  if (codes.length === 0 && unknown.length === 0) return <span className="muted">{text}</span>;
  return <GhsPictogramRow codes={codes} unknown={unknown} caption className="ghs-row-msds" />;
}

Object.assign(window, { GhsMsdsPictograms });
