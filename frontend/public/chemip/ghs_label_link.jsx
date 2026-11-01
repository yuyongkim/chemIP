// 물질 상세 머리의 "경고표지 만들기" 링크 — 이 물질의 MSDS 2항으로 채운 경고표지 만들기 화면(?view=ghslabel&chem=)을 연다.

function GhsLabelLink({ selected }) {
  const L = GHS_LABELS.link;
  if (!selected?.chem_id) return null;
  return (
    <a className="calc-sub-link" href={ghsLabelHref({ chem: selected.chem_id })} title={L.hint}>
      <Icon name="shield" size={13} /> {L.make}
    </a>
  );
}

Object.assign(window, { GhsLabelLink });
