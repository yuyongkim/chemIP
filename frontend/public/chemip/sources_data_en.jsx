// English text for the data-sources list (DATA_SOURCE_GROUPS_KO / DATA_SOURCES_KO in sources_data.jsx).
// Only the text fields live here, keyed by the same id; url, group and recorded stay in sources_data.jsx (one place).
// Quoted provider notices that are in Korean are given as English translations and marked "(translated)".

const DATA_SOURCE_EN_GROUP_TITLES = {
  msds: "Safety data sheets and chemical information",
  law: "Korean laws and permits",
  trade: "Trade, tariff classification and control lists",
  intl: "International regulatory lists",
  incident: "Incidents and enforcement",
  patent: "Patents, markets and drugs",
};

const DATA_SOURCE_EN_TEXT = {
  kosha_msds: {
    name: "KOSHA Material Safety Data Sheet (MSDS) OpenAPI",
    provider: "Korea Occupational Safety and Health Agency (via the Public Data Portal, data.go.kr)",
    used: "Substance search, all 16 SDS sections",
    license: "Public Data Portal licence scope: unrestricted (data.go.kr 15157612)",
    attribution: "Source: Korea Occupational Safety and Health Agency, MSDS lookup service (Public Data Portal)",
    note: "Provider notice (checked 2026-10-25, translated): \"Chemical information provided by the Agency may be used only as a reference when preparing and reviewing an MSDS; under Articles 110 and 11 of the Occupational Safety and Health Act, preparing and providing an MSDS is the duty of the chemical's manufacturer or importer.\" Review type: automatic approval for development / reviewed approval for operation; development-account traffic 2,000. ChemIP calls this dataset's endpoint (apis.data.go.kr/B552468/msdschem1) by default (switched 2026-10-25).",
  },
  kosha_guide: {
    name: "KOSHA GUIDE technical guidelines",
    provider: "Korea Occupational Safety and Health Agency",
    used: "Guide recommendations",
    license: "Subject to the provider's terms of use",
  },
  ncis: {
    name: "NCIS chemical information (classification as toxic substance, accident-precaution substance, etc.)",
    provider: "Korea Environment Corporation · National Institute of Environmental Research (data.go.kr OpenAPI)",
    used: "Korean chemical classification, basis for regulation and permit decisions",
    license: "Public Data Portal licence scope: unrestricted (Korea Environment Corporation chemical information service, data.go.kr 15149420)",
    attribution: "Source: Korea Environment Corporation chemical information service (Public Data Portal)",
    note: "Checked on the Public Data Portal dataset page on 2026-10-25. The terms of use of the ncis.nier.go.kr website itself were not confirmed separately.",
  },
  kischem_prtr: {
    name: "Chemical information (KISChem) · Pollutant Release and Transfer Register (PRTR)",
    provider: "National Institute of Chemical Safety (data.go.kr, icis.mcee.go.kr)",
    used: "Substance information, handling sites (PRTR)",
    license: "Public Data Portal licence scope: unrestricted (chemical safety management information 15072442 · chemical release and transfer information 15024756)",
    attribution: "Source: National Institute of Chemical Safety, Ministry of Climate, Energy and Environment (Public Data Portal)",
    note: "Checked on the Public Data Portal dataset pages on 2026-10-25.",
  },
  kr_boundaries: {
    name: "Korean province boundaries (geoBoundaries gbOpen KOR ADM1)",
    provider: "geoBoundaries (William & Mary geoLab) · source data Natural Earth",
    used: "Province boundaries of the facility map (17, simplified)",
    license: "Public Domain — Natural Earth terms of use: may be used in any manner without permission; credit is appreciated",
    attribution: "Boundaries: geoBoundaries (Natural Earth), Public Domain",
    note: "Checked on 2026-10-31 against the geoBoundaries API (gbOpen/KOR/ADM1: boundarySource Natural Earth, boundaryLicense Public Domain) and the Natural Earth terms of use. The pinned release (9469f09) was simplified with scripts/geo/build_kr_sido_topo.py and ships inside the UI bundle.",
  },
  echa: {
    name: "ECHA CLP Annex VI harmonised classification · ECHA CHEM",
    used: "EU classification and registration information",
    license: "ECHA Legal Notice 5.1.1: reproduction and distribution for commercial and non-commercial purposes are permitted (provided the disclaimer is acknowledged, the meaning is not altered and the source is credited). Copying all or a substantial part of the databases and systematic automated harvesting are prohibited without ECHA's prior written permission. CAS information is owned by the American Chemical Society (ACS)",
    note: "ECHA notice: \"ECHA is acknowledged as the source ... Such acknowledgement must be included in each copy of the material.\" On 2026-10-25 the live page was blocked (Azure WAF), so it was checked against the 2026-05-01 web archive copy. Terms of use specific to ECHA CHEM were not confirmed.",
  },
  comptox: {
    used: "US toxicity and exposure information",
    license: "EPA notice: \"These data are free of all copyright restrictions, and are fully and freely available for both non-commercial and commercial use.\"",
    note: "Checked on the EPA CTX API page on 2026-10-25. API keys are issued per person (ccte_api@epa.gov).",
  },
  niosh: {
    used: "Occupational exposure limits",
    license: "CDC notice: most material on CDC websites is in the public domain and may be used and copied without permission. Credit to the originating agency is required, and use must not suggest endorsement by CDC, HHS or the US government",
    attribution: "Source: CDC/NIOSH. Use of this material by this service does not imply endorsement by CDC, ATSDR, HHS or the US government.",
    note: "Checked on the CDC \"Using CDC Materials\" page on 2026-10-25.",
  },
  law_go_kr: {
    name: "Korean Law Information Center — statutes and administrative rules",
    provider: "Ministry of Government Legislation (law.go.kr)",
    used: "Substance lists by Korean law, permit and notification requirements, legal basis and excerpts for import/export obligations",
    license: "Statutes and notices are works not protected under Article 7 of the Korean Copyright Act",
    note: "Each list shows its legal provision, source URL and retrieval date (2026-10-24).",
  },
  law_go_kr_corpus: {
    name: "Korea Law Information Center Open API — current texts and history of statutes and administrative rules",
    provider: "Ministry of Government Legislation (open.law.go.kr)",
    used: "Korean law texts screen (?view=law): full articles, annex titles and history; the substance \"Korean legal basis\" panel",
    license: "Statutes and notices are works not protected under Article 7 of the Korean Copyright Act. Source credit: Korea Law Information Center",
    note: "A copy of the current versions of the 70 laws ChemIP cites, fetched on 2026-10-31. Annex and form contents open as law.go.kr files.",
  },
  customs_226: {
    name: "Customs Act Article 226 notice designating goods subject to customs confirmation and confirmation methods",
    provider: "Korea Customs Service (law.go.kr administrative rule)",
    used: "Deciding whether customs confirmation applies",
    license: "Statutory text (Korean Copyright Act Article 7)",
  },
  hs_customs: {
    name: "Korea Customs Service HS codes · new-nature/nature classification by HSK",
    provider: "Korea Customs Service (data.go.kr 15049722 · 15049720)",
    used: "Korean HSK10 candidates",
    license: "Korea Open Government License (KOGL) Type 1 (attribution)",
    attribution: "Source: Korea Customs Service, Public Data Portal",
  },
  ecics: {
    used: "CAS → HS6 / CN8 codes",
    note: "ECICS classifications are for reference and are not legally binding (binding classification requires an advance ruling from the Korea Customs Service).",
  },
  cn2026: {
    provider: "European Commission (Implementing Regulation (EU) 2025/1926), distributed by Statistics Denmark",
    used: "CN8 descriptions",
    license: "CC BY 4.0 (EUR-Lex reuse, Commission Decision 2011/833/EU)",
  },
  cwc: {
    name: "Chemical Weapons Convention (CWC) Annex on Chemicals, Schedules 1, 2 and 3",
    provider: "OPCW · Ministry of Trade and Industry (Chemical and Biological Weapons Act)",
    used: "Control-list listing",
    license: "OPCW public treaty text · Korean statutory text (Copyright Act Article 7)",
  },
  australia_group: {
    name: "Australia Group Chemical Weapons Precursors control list (2025-10-01 edition)",
    provider: "Australia Group / Australian Department of Foreign Affairs and Trade (DFAT) · Strategic Items Import/Export Notice 1C350",
    used: "Strategic (dual-use) item listing",
    license: "Public document published by DFAT · Korean notice text (Copyright Act Article 7)",
  },
  incb: {
    name: "INCB Red List, 23rd edition (2025-07) · Enforcement Decree of the Narcotics Control Act, Annex 8",
    provider: "International Narcotics Control Board · Ministry of Food and Drug Safety",
    used: "Narcotic precursor listing",
    license: "INCB public document · Korean statutory text (Copyright Act Article 7)",
  },
  kotra: {
    name: "KOTRA overseas market news and import regulation information",
    provider: "Korea Trade-Investment Promotion Agency (data.go.kr B410001)",
    used: "Partner-country import regulations, market news",
    license: "Overseas market news (15034831), import-regulated items (15088467) and trade fraud cases (15034754): KOGL Type 4 (attribution + no commercial use + no derivatives). Country information (15034830) and corporate success stories (15034755): KOGL Type 1 (attribution). Entry strategies (15116867) and price information by country (15122665): unrestricted",
    attribution: "Source: Korea Trade-Investment Promotion Agency (KOTRA), Public Data Portal",
    note: "Type 4 material is shown only non-commercially and verbatim, without summarizing, translating or editing. Commercial use is not permitted when reusing it either (checked on the Public Data Portal dataset pages on 2026-10-25).",
  },
  epa_lol: {
    name: "US EPA List of Lists (EPCRA 302, 304, 313, CERCLA, CAA 112(r)), CWA 311, TSCA SNUR",
    used: "US regulatory list listings",
    license: "US federal government work (17 U.S.C. 105)",
  },
  osha_psm: {
    name: "OSHA PSM Appendix A · PEL Table Z-1",
    used: "US process safety and exposure limits",
    license: "US federal regulation text (17 U.S.C. 105)",
  },
  seveso: {
    name: "EU Seveso III Directive Annex I",
    used: "EU major-accident threshold quantities",
    license: "EUR-Lex reuse conditions (Commission Decision 2011/833/EU)",
  },
  conventions: {
    name: "Montreal Protocol · Rotterdam Convention (PIC) · Stockholm Convention (POPs)",
    provider: "UNEP convention secretariats",
    used: "International convention listings",
    license: "Public treaty texts from the convention secretariats",
  },
  intl_national: {
    name: "Vietnam Decree 24/2026 · Mexico NOM-028-STPS · India Chemical Accidents Rules 1996 · Pakistan Sindh Hazardous Substances Rules 2014 · Netherlands Bal",
    provider: "National government gazettes",
    used: "National regulatory lists and threshold quantities",
    license: "Subject to the terms of use of each country's official publication",
  },
  emars: {
    used: "Incident cases",
  },
  csb: {
    name: "U.S. CSB investigation reports",
    used: "Incident cases",
    license: "Public domain (US federal government work, 17 U.S.C. 105)",
  },
  rmp: {
    name: "EPA RMP five-year accident history (Data Liberation Project, FOIA)",
    used: "Incident cases (structured fields only, facility contacts excluded)",
    license: "Public domain (US EPA records, 17 U.S.C. 105)",
  },
  kosha_accidents: {
    name: "KOSHA domestic accident cases (data.go.kr 15121001)",
    provider: "Korea Occupational Safety and Health Agency",
    used: "Korean process safety incident cases",
    license: "Public Data Portal licence scope: unrestricted",
  },
  nics_accidents: {
    name: "National Institute of Chemical Safety chemical accident information (data.go.kr 15069200)",
    provider: "National Institute of Chemical Safety",
    used: "Korean chemical accident cases",
    license: "Public Data Portal licence scope: unrestricted",
  },
  echo: {
    name: "EPA ECHO enforcement and compliance data",
    used: "US enforcement cases",
    license: "US federal government public data (subject to EPA terms of use)",
  },
  kipris: {
    name: "KIPRIS Plus patent and utility model search",
    provider: "Korea Institute of Patent Information",
    used: "Korean patents",
    license: "KIPRIS Plus Terms of Use Article 19(1): providing or reselling the original information to third parties, and copying, processing, translating, displaying or distributing it beyond the purpose of using the service, are prohibited (fair use permitted under copyright law is excepted). Copyright policy: unauthorized copying and distribution are prohibited; when publishing with permission, state that the source is the Korea Institute of Patent Information",
    attribution: "Source: Korea Institute of Patent Information, KIPRIS Plus",
    note: "Checked against the KIPRIS Plus terms of use and copyright policy on 2026-10-25. Showing search results in a public service requires consultation with and permission from the Korea Institute of Patent Information. Operators can set KIPRIS_PUBLIC_DISPLAY=false to show only a \"View on KIPRIS\" link instead of result lists, and KIPRIS_IN_AI=false to exclude KIPRIS from AI analysis evidence (no code change needed).",
  },
  global_patents: {
    name: "Local index of published overseas patents (USPTO, EPO, WIPO, JPO, CNIPA)",
    provider: "Public data from each patent office",
    used: "Overseas patent search",
    license: "Subject to each patent office's open-data terms",
  },
  mfds: {
    name: "Ministry of Food and Drug Safety drug approval and e-Drug (easy drug information) data",
    provider: "Ministry of Food and Drug Safety (data.go.kr 1471000)",
    used: "Drug information",
    license: "Public Data Portal licence scope: unrestricted (drug product approval information 15095677 · drug overview information (e-Drug) 15075057)",
    attribution: "Source: Ministry of Food and Drug Safety (Public Data Portal)",
    note: "Checked on the Public Data Portal dataset pages on 2026-10-25. Approval information calls portal specification version 08 (DrugPrdtPrmsnInfoService08) first and falls back to version 07 on failure or zero results.",
  },
  openfda_pubmed: {
    used: "Overseas drug labeling, literature",
    license: "openFDA: unless otherwise noted, public domain (CC0 1.0), usable without permission including commercially. NCBI: NLM does not claim copyright on PubMed abstracts, but publishers or authors may. \"NCBI's Disclaimer and Copyright notice must be evident to users of your service.\"",
    note: "Checked against the openFDA Terms of Service and NCBI Policies on 2026-10-25. E-utilities: at most 3 requests per second.",
  },
  naver: {
    name: "NAVER News Search API",
    used: "Trade news",
    license: "NAVER Developers API Terms of Use (Search API 2.1–2.4): label results as NAVER search results, show them unmodified and separately, and credit and link the original source. Copying, storing or caching (except temporary retention for service continuity), providing to third parties, AI input or training, and advertising or monetization are prohibited. Copyright in result data belongs to NAVER or the original authors (each news outlet)",
    attribution: "NAVER search results (article copyright belongs to each news outlet)",
    note: "Checked against the NAVER Developers API terms of use on 2026-10-25. Temporary retention is at most 21 days on the server, for history lookup. ChemIP shows results as received, with original links, in a separate \"NAVER search results\" block; it does not mix them with the KOTRA list, does not feed them to AI and does not store them in a database (10-minute memory cache).",
  },
  chemsep_lite: {
    name: "ChemSep LITE pure component databank (v8.50)",
    used: "Temperature-dependent correlations (vapour pressure, density, Cp, heat of vaporization, viscosity, thermal conductivity, surface tension) and critical constants",
    license: "Artistic License 2.0 (The Perl Foundation)",
    attribution: "ChemSep pure component databank, Copyright (c) Harry Kooijman and Ross Taylor — http://www.chemsep.org",
    note: "Checked on 2026-10-31 in help/chemsep.lic of the official lite.zip: use of the ChemSep Pure Component Property Databank is governed by the Artistic License of the Perl Foundation. Modified Version: a subset moved to JSON with a kmol→mol factor added; coefficients unchanged. The original is available from chemsep.org; the licence text ships in v1/tp/licenses.json.",
  },
  nasa_cea: {
    name: "NASA CEA thermodynamic data thermo.inp (NASA-9 polynomials)",
    used: "Ideal-gas and liquid Cp, H°, S°, enthalpy of formation at 298 K",
    license: "Apache License 2.0",
    attribution: "McBride, Zehe & Gordon (2002) NASA/TP-2002-211556; CEA, Copyright (c) 2025 United States Government as represented by the Administrator of NASA",
    note: "Checked on 2026-10-31 in the repository NOTICE.txt: data/thermo.inp is data of the Apache-2.0 repository (pinned commit 985fd333). Species → CAS is a list of 224 pairs reviewed by hand for ChemIP.",
  },
};

const DATA_SOURCE_GROUPS_EN = DATA_SOURCE_GROUPS_KO.map(g => ({ ...g, title: DATA_SOURCE_EN_GROUP_TITLES[g.k] || g.title }));
const DATA_SOURCES_EN = DATA_SOURCES_KO.map(s => ({ ...s, ...(DATA_SOURCE_EN_TEXT[s.id] || {}) }));

const DATA_SOURCE_GROUPS = langPick(DATA_SOURCE_GROUPS_KO, DATA_SOURCE_GROUPS_EN);
const DATA_SOURCES = langPick(DATA_SOURCES_KO, DATA_SOURCES_EN);

Object.assign(window, { DATA_SOURCE_GROUPS_EN, DATA_SOURCES_EN, DATA_SOURCE_GROUPS, DATA_SOURCES });
