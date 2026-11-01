// 물질 상세 머리의 "이 물질로 계산하기" 링크 — ppm ↔ mg/m³ 계산기를 MSDS 9항 분자량으로 채워 연다(calcSubstanceHref).
// 옆의 "기체 유량 단위 변환" 링크는 공학 단위 변환기(기체 유량)를 같은 분자량으로 연다(calcSubstanceUnitsHref).

function CalcSubstanceLink({ selected, sections }) {
  const L = CALC_LABELS.substanceLink;
  if (!selected) return null;
  return (
    <>
      <a className="calc-sub-link" href={calcSubstanceHref(selected, sections)} title={L.hint}>
        <Icon name="flask" size={13} /> {L.link}
      </a>
      <a className="calc-sub-link" href={calcSubstanceUnitsHref(selected, sections)} title={L.unitsHint}>
        <Icon name="flask" size={13} /> {L.units}
      </a>
    </>
  );
}

Object.assign(window, { CalcSubstanceLink });
