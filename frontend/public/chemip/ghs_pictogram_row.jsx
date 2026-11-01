// GHS 그림문자 줄 — 코드 목록을 그림(assets/ghs/GHSnn.svg)으로. 대체 글·제목은 "GHS02 인화성"(lang, 없으면 화면 언어).
// caption 이면 그림 아래 코드·이름. 알 수 없는 코드(예: GHS11)는 글자로 한 줄. 스타일: product_detail.css(.ghs-*).

function GhsPictogramRow({ codes, unknown = [], lang, caption = false, className = "" }) {
  const names = ghsSheetLabels(lang || CHEMIP_LANG).pictograms;
  const list = (codes || []).filter(c => GHS_PICTOGRAM_CODES.includes(c));
  if (list.length === 0 && unknown.length === 0) return null;
  return (
    <div className={`ghs-row ${className}`.trim()} role="list" aria-label={GHS_LABELS.row.aria}>
      {list.map(code => {
        const alt = `${code} ${names[code] || ""}`.trim();
        return (
          <figure key={code} className="ghs-fig" role="listitem">
            <img className="ghs-pict" src={ghsPictogramSrc(code)} alt={alt} title={alt} />
            {caption && <figcaption className="ghs-cap"><span className="mono">{code}</span> {names[code]}</figcaption>}
          </figure>
        );
      })}
      {unknown.length > 0 && <span className="muted ghs-unknown">{GHS_LABELS.row.unknown(unknown.join(", "))}</span>}
    </div>
  );
}

Object.assign(window, { GhsPictogramRow });
