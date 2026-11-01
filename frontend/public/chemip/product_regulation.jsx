// 상세 탭 "해외 규제" — 셸(요청·배치만). 규제 정보(ECHA·NIOSH·CompTox·KISCHEM·NCIS)는 한 번에 요청하고,
// 하위 패널은 요청 중·실패면 건수 대신 상태를 보인다(product_regulation_state.jsx).
// REACH 등록 현황은 따로 그때그때 조회한다(useReachRegistration — PC 가 꺼져도 Worker 가 답함).
// 패널: product_regulation_eu.jsx(REACH·ECHA) · product_regulation_us.jsx(NIOSH·CompTox) · product_regulation_side.jsx.

function RegulationTab({ selected }) {
  const name = selected?.name_en || selected?.name || "";
  const [nonce, setNonce] = useState(0);
  const intel = useRegulatoryIntelligence(selected?.chem_id, nonce);
  const kotra = useKotraReach(name);
  const reach = useReachRegistration(selected?.cas_no || "");
  const src = intelSources(intel.data);

  return (
    <div className="layout-2col">
      <div>
        <ReachStatusPanel reach={reach} />
        <EchaRecordsPanel intel={intel} echa={src.echa} onRetry={() => setNonce(n => n + 1)} />
        <NioshPanel intel={intel} niosh={src.niosh} />
        <CompToxPanel intel={intel} comptox={src.comptox} />
      </div>
      <aside>
        <KotraReachPanel kotra={kotra} />
        <KrClassificationPanel intel={intel} kischem={src.kischem} ncis={src.ncis} />
        <IntelTermsPanel intel={intel} aliases={src.aliases} terms={src.terms} />
      </aside>
    </div>
  );
}

Object.assign(window, { RegulationTab });
