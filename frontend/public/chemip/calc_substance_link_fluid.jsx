// 물질 상세 머리의 "실유체 물성(CoolProp)" 링크 — 그 물질 CAS 가 CoolProp 유체 목록(calc_fluid_data.jsx)에 있을 때만 보인다.
// 누르면 fluid_props 계산기를 그 유체로 연다(calcFluidForCas → calcHref). 문구: CALC_LABELS.fluidLink.

function CalcFluidLink({ selected }) {
  const L = CALC_LABELS.fluidLink;
  const id = calcFluidForCas(selected?.cas_no);
  if (!id) return null;
  const name = (CHEMIP_LANG === "en" ? selected?.name_en || selected?.name : selected?.name || selected?.name_en) || "";
  return (
    <a className="calc-sub-link" href={calcHref("fluid_props", { fluid: id }, name)} title={L.hint}>
      <Icon name="flask" size={13} /> {L.link}
    </a>
  );
}

Object.assign(window, { CalcFluidLink });
