"""Every visible string of the generated pages (Korean default, English optional), plus fixed vocabularies.

Templates read from here; no page text is written inside render/hub code.
"""
from __future__ import annotations

PICTOGRAMS = {
    "GHS01": ("폭발성", "Explosive"), "GHS02": ("인화성", "Flammable"), "GHS03": ("산화성", "Oxidizing"),
    "GHS04": ("고압가스", "Compressed gas"), "GHS05": ("부식성", "Corrosive"), "GHS06": ("급성 독성", "Acute toxicity"),
    "GHS07": ("경고(자극성 등)", "Harmful / irritant"), "GHS08": ("건강 유해성", "Health hazard"),
    "GHS09": ("수생환경 유해성", "Aquatic hazard"),
}

# intl list directions are the foreign country's own perspective (lists.py docstring)
INTL_DIRECTION = {
    "ko": {"import": "해당국 수입 시(한국에서 수출)", "export": "해당국 수출 시(한국으로 수입)"},
    "en": {"import": "on import into that country (KR export)", "export": "on export from that country (KR import)"},
}
KR_DIRECTION = {"ko": {"import": "수입", "export": "수출", "both": "수출입"},
                "en": {"import": "Import", "export": "Export", "both": "Import/Export"}}

# fixed site-level sources (per-list source URLs come from the data itself)
SOURCES = [
    {"ko": "안전보건공단 물질안전보건자료(MSDS) — 공공데이터포털", "en": "KOSHA MSDS — Korea Public Data Portal",
     "url": "https://www.data.go.kr/"},
    {"ko": "국가법령정보센터(법령 원문)", "en": "Korea Law Information Center (statutes)", "url": "https://www.law.go.kr/"},
    {"ko": "국립환경과학원 화학물질정보시스템(NCIS)", "en": "NIER Chemical Information System (NCIS)",
     "url": "https://ncis.nier.go.kr/"},
    {"ko": "EU ECICS·관세청 HS 부호(품목번호)", "en": "EU ECICS / Korea Customs Service HS codes",
     "url": "https://taxation-customs.ec.europa.eu/online-services/online-services-and-databases-customs/ecics-european-customs-inventory-chemical-substances_en"},
]

KO = {
    "lang": "ko", "locale": "ko_KR",
    "crumb_home": "ChemIP", "crumb_hub": "물질별 규제 요약",
    "cas": "CAS 번호",
    "title": "{name} (CAS {cas}) 규제·수출입·MSDS 조회 | ChemIP",
    "title_short": "{name} CAS {cas} 규제·MSDS | ChemIP",
    "title_min": "CAS {cas} 규제·수출입·MSDS 조회 | ChemIP",
    # pages of substances with no KOSHA MSDS in ChemIP (some live seeds): no MSDS claim in title or button
    "title_nomsds": "{name} (CAS {cas}) 규제 요약 | ChemIP",
    "title_short_nomsds": "{name} CAS {cas} 규제 요약 | ChemIP",
    "title_min_nomsds": "CAS {cas} 규제 요약 | ChemIP",
    "cta": "ChemIP에서 전체 보기 (MSDS 16개 항목·상대국별 수출입 조회)",
    "cta_search": "ChemIP에서 이 물질 검색 (규제·상대국별 수출입 조회)",
    "sec_msds": "MSDS 주요 유해성",
    "signal": "신호어", "pictograms": "그림문자", "hazard_classes": "유해성·위험성 분류", "h_statements": "유해·위험 문구",
    "msds_none": "MSDS에 유해·위험 문구가 기재되어 있지 않습니다.",
    "msds_src": "안전보건공단 MSDS 제2항(유해성·위험성) 기준",
    "msds_absent": "ChemIP가 수집한 안전보건공단 MSDS에는 이 물질(CAS {cas}) 자료가 없습니다. 제조·공급사의 MSDS를 확인하십시오.",
    "sec_kr": "국내 법령별 등재 목록",
    "kr_count": "{laws}개 법령 · {lists}개 목록",
    "amended": "개정", "retrieved": "수집",
    "ncis": "화학물질관리법·화평법 분류(NCIS)",
    "ncis_inventory": "기존화학물질 목록 등재",
    "sec_permits": "인허가·신고 대상",
    "permits_note": "수량·용도·시설 조건은 원문 기준을 확인하십시오.",
    "sec_oblig": "수입·수출 시 한국 의무",
    "oblig_generic": "모든 수입 화학물질 공통: {items}",
    "oblig_none": "이 물질에만 해당하는 수입·수출 의무 규칙은 확인되지 않았습니다.",
    "customs": "세관장 확인 대상",
    "sec_controlled": "수출입 통제 목록 (CWC·호주그룹·마약류 원료물질)",
    "controlled_none": "화학무기금지협약(CWC)·호주그룹·마약류 원료물질 목록에는 등재되어 있지 않습니다.",
    "sec_intl": "상대국 규제 목록 (국가별)",
    "intl_count": "{juris}개국 · {lists}개 규제 목록",
    "intl_none": "ChemIP가 수집한 51개 상대국 규제 목록에는 등재되어 있지 않습니다.",
    "inventories": "기존물질 목록(인벤토리) 등재",
    "sec_hs": "HS 품목번호(HS6)",
    "hs_note": "EU ECICS 기준 참고 분류이며, 실제 품목분류는 세관 판단에 따릅니다.",
    "hs_none": "CAS 기준 HS 품목번호 대응 자료가 없습니다.",
    "sec_related": "같은 법령 목록에 오른 물질",
    "sec_sources": "출처",
    "data_date": "자료 기준일 {date}",
    "disclaimer": ("이 페이지는 공개 자료를 자동으로 정리한 참고용 요약이며 법률 자문이 아닙니다. "
                   "수량·함량·용도·시설 조건에 따라 적용 여부가 달라지므로 법령 원문과 관계 기관에 확인하십시오."),
    "updated": "최종 갱신 {date}",
    "summary": "{name}(CAS {cas})에 대해 확인된 규제: {clauses}.",
    "summary_none": "{name}(CAS {cas})에 대해 ChemIP가 수집한 국내외 규제 목록 등재는 확인되지 않았습니다.",
    "cl_kr": "국내 {laws}개 법령 {kr}개 목록", "cl_permits": "인허가·신고 {permits}건", "cl_oblig": "수입·수출 의무 {oblig}건",
    "cl_foreign": "해외 {juris}개국 {foreign}개 규제 목록", "cl_join": ", ",
    "summary_ctl": " 수출입 통제 목록 {n}건에도 등재되어 있습니다.",
    "summary_msds": " 안전보건공단 MSDS 기준 신호어는 '{signal}'이며 유해·위험 문구 {h}개가 기재되어 있습니다.",
    "desc": "{name}(CAS {cas}) 규제 요약: {clauses}.",
    "desc_none": "{name}(CAS {cas}) 규제 요약: ChemIP가 수집한 국내외 규제 목록에는 등재가 확인되지 않았습니다.",
    "desc_msds": " MSDS 신호어 {signal}, H문구 {h}개.",
    "desc_hs": " HS {hs6}.",
    # hub
    "hub_title": "화학물질별 규제·MSDS 요약 {n}종 | ChemIP",
    "hub_h1": "화학물질별 규제·MSDS 요약",
    "hub_desc": "국내 법령 목록·인허가·상대국 규제가 많은 화학물질 {n}종의 규제·MSDS 요약을 법령별·가나다순으로 찾아보세요. ChemIP 무료.",
    "hub_intro": ("널리 알려진 화학물질과 국내 법령 목록·인허가·상대국 규제 자료가 많은 화학물질 {n}종을 골라 요약했습니다. "
                  "법령 목록별 또는 이름 첫 글자로 찾아보세요. 다른 물질은 ChemIP 검색에서 조회할 수 있습니다."),
    "hub_by_law": "법령 목록별", "hub_by_initial": "이름 첫 글자별", "hub_other_initial": "기타",
    "hub_list_count": "{n}종",
    "hub_search": "ChemIP에서 물질 검색",
    # per-list hub
    "list_title": "{title} 해당 물질 {n}종 | ChemIP",
    "list_title_short": "{law} 목록 해당 물질 {n}종 | ChemIP",
    "list_desc": "{law} '{title}' 목록에 오른 화학물질 가운데 {n}종의 규제·MSDS 요약. 목록 전체 {total}종, 개정 {amended}.",
    "list_intro": "{law}의 '{title}' 목록에는 {total}개 물질(계열 포함)이 있습니다. 그중 ChemIP 요약 페이지가 있는 {n}종입니다.",
    "list_basis": "법적 근거", "list_source": "법령 원문", "col_name": "물질", "col_cas": "CAS",
}

EN = {
    **KO,
    "lang": "en", "locale": "en_US",
    "crumb_home": "ChemIP", "crumb_hub": "Substance summaries",
    "cas": "CAS RN",
    "title": "{name} (CAS {cas}) Korea regulations & MSDS | ChemIP",
    "title_short": "{name} CAS {cas} regulations | ChemIP",
    "title_min": "CAS {cas} Korea regulations & MSDS | ChemIP",
    "title_nomsds": "{name} (CAS {cas}) Korea regulations | ChemIP",
    "title_short_nomsds": "{name} CAS {cas} regulations | ChemIP",
    "title_min_nomsds": "CAS {cas} Korea regulations | ChemIP",
    "cta": "Open the full record in ChemIP (MSDS, trade checks by country)",
    "cta_search": "Search this substance in ChemIP (regulations, trade checks by country)",
    "sec_msds": "Key MSDS hazards", "signal": "Signal word", "pictograms": "Pictograms",
    "hazard_classes": "Hazard classes", "h_statements": "Hazard statements",
    "msds_none": "No hazard statements are listed in the MSDS.", "msds_src": "KOSHA MSDS section 2",
    "msds_absent": "The KOSHA MSDS collection in ChemIP has no record for this substance (CAS {cas}). Check the supplier's MSDS.",
    "sec_kr": "Korean statutory lists", "kr_count": "{laws} laws · {lists} lists",
    "amended": "amended", "retrieved": "retrieved",
    "ncis": "Chemical Control Act / K-REACH categories (NCIS)", "ncis_inventory": "Existing chemical inventory",
    "sec_permits": "Permits and notifications", "permits_note": "Check quantity, use and facility conditions in the source text.",
    "sec_oblig": "Korean import / export obligations",
    "oblig_generic": "All imported chemicals: {items}",
    "oblig_none": "No substance-specific import/export rules were found.", "customs": "customs confirmation",
    "sec_controlled": "Controlled lists (CWC, Australia Group, drug precursors)",
    "controlled_none": "Not on the CWC, Australia Group or drug precursor lists.",
    "sec_intl": "Foreign regulatory lists by country", "intl_count": "{juris} jurisdictions · {lists} lists",
    "intl_none": "Not on any of the 51 foreign lists collected by ChemIP.", "inventories": "Inventory listings",
    "sec_hs": "HS code (HS6)", "hs_note": "Informative EU ECICS classification; customs rulings prevail.",
    "hs_none": "No CAS-to-HS mapping available.",
    "sec_related": "Substances on the same lists", "sec_sources": "Sources", "data_date": "Data as of {date}",
    "disclaimer": ("Automatically compiled from public data for reference only; not legal advice. "
                   "Applicability depends on quantity, concentration, use and facility; check the statutes and authorities."),
    "updated": "Last updated {date}",
    "summary": "Regulatory coverage of {name} (CAS {cas}): {clauses}.",
    "summary_none": "No listing of {name} (CAS {cas}) was found in the lists collected by ChemIP.",
    "cl_kr": "{kr} lists under {laws} Korean laws", "cl_permits": "{permits} permits or notifications",
    "cl_oblig": "{oblig} import/export obligations", "cl_foreign": "{foreign} foreign lists in {juris} jurisdictions", "cl_join": ", ",
    "summary_ctl": " It is also on {n} trade-control lists.",
    "summary_msds": " The KOSHA MSDS signal word is '{signal}' with {h} hazard statements.",
    "desc": "{name} (CAS {cas}) regulations: {clauses}.",
    "desc_none": "{name} (CAS {cas}): no listing found in the regulatory lists collected by ChemIP.",
    "desc_msds": " MSDS: {signal}, {h} H-statements.", "desc_hs": " HS {hs6}.",
}

