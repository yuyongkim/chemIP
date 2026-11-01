// 물질 「국내 근거 조문」 카드 · 인용 칩 하나 — 역할(근거 정의·의무 조항·대상 목록) + 약칭 법령·조문("화관법 제11조").
// 칩은 ChemIP 국내 법령 보기(그 조로) 링크, 전체 이름·조문 제목은 툴팁. 별표는 옆에 작은 PDF 링크.
// 표기: law_cite_format.jsx(lawCiteRole·lawShortName·lawShortLabel), 약칭: LAW_SHORT, 문구: LAW_LABELS.panel. 스타일: .pd-law-chip.

function LawCiteChip({ cite }) {
  const P = LAW_LABELS.panel;
  const role = lawCiteRole(cite);
  const ref = cite.t === "doc" ? "" : lawShortLabel(cite.label, LAW_SHORT.label);
  const tip = [cite.name, cite.t === "doc" ? "" : cite.label, cite.title ? `(${cite.title})` : ""].filter(Boolean).join(" ");
  return (
    <span className="pd-law-chip-wrap">
      <a className={`pd-law-chip r-${role}`} href={cite.href} title={tip}>
        <span className="pd-law-role">{P.roles[role]}</span>
        <span className="pd-law-ref" data-source-text="">{lawShortName(cite.name, LAW_SHORT)}{ref ? ` ${ref}` : ""}</span>
      </a>
      {cite.ext && <a className="pd-law-pdf" href={cite.ext} target="_blank" rel="noopener" title={tip}>{P.pdf}</a>}
    </span>
  );
}

Object.assign(window, { LawCiteChip });
