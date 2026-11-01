// 용어사전 자료 영어판 · 화학물질 규제·GHS·MSDS — glossary_reg.jsx 의 GLOSSARY_REG_KO 와 같은 key.
// term·def 는 늘 두고, alias·law·ref 는 한국어 값에 한글이 있을 때만 둡니다. React 없음(데이터만).

const GLOSSARY_REG_EN = {
  // ── Chemicals Control Act (Korea) ──
  chemical_substance: {
    term: "Chemical substance",
    def: "Elements and compounds, substances obtained from them by artificial reaction, and naturally occurring substances that have been chemically modified, extracted or refined. The Chemicals Control Act and the Act on Registration and Evaluation of Chemicals use the same meaning.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  acute_human_hazard_substance: {
    term: "Substance with acute human health hazard",
    alias: ["acute human hazard substance"],
    def: "Chemical designated and announced as able to harm human health within a short time after a single or short-term exposure. It arose when the amended Act (in force 7 August 2025) split the former 'toxic substances' category by type of hazard.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  chronic_human_hazard_substance: {
    term: "Substance with chronic human health hazard",
    alias: ["chronic human hazard substance"],
    def: "Chemical designated and announced as able to harm human health after repeated exposure or after a latency period following exposure. Substances of concern for long-term effects such as carcinogenicity or reproductive toxicity fall here.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  ecological_hazard_substance: {
    term: "Substance with ecological hazard",
    alias: ["ecological hazard substance"],
    def: "Chemical designated and announced as able to harm the environment, such as aquatic organisms, through short- or long-term exposure.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  human_eco_hazard_substance: {
    term: "Substance hazardous to humans or the environment",
    alias: ["human or ecological hazard substance"],
    def: "Collective term for substances with acute human health hazard, chronic human health hazard and ecological hazard. It is one branch of hazardous chemicals.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  toxic_substance_former: {
    term: "Toxic substance (former term)",
    alias: ["toxic substance", "poisonous substance"],
    def: "Former category of the Chemicals Control Act for chemicals designated and announced as hazardous. Since the amendment in force on 7 August 2025 they are managed as substances with acute human, chronic human or ecological hazard.",
    law: "Chemicals Control Act (Korea), before the amendment in force 7 August 2025",
  },
  kchem_permit_substance: {
    term: "Permitted (authorisation) substance",
    alias: ["authorisation substance"],
    def: "Chemical designated and announced as one of risk concern that may be manufactured, imported or used only with a permit.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  kchem_restricted_substance: {
    term: "Restricted substance",
    alias: ["restricted substance"],
    def: "Chemical designated and announced as posing high risk in a specific use, so that its manufacture, import, sale, storage, transport and use for that purpose are prohibited.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  kchem_banned_substance: {
    term: "Prohibited (banned) substance",
    alias: ["banned substance"],
    def: "Chemical designated and announced as posing high risk, so that its manufacture, import, sale, storage, transport and use for all purposes are prohibited.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  accident_prep_substance: {
    term: "Accident preparedness substance",
    alias: ["accident preparedness substance"],
    def: "Chemical designated and announced as requiring chemical accident preparedness because strong acute toxicity, explosiveness and the like make accidents likely or their damage severe.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  hazardous_chemical: {
    term: "Hazardous chemical",
    alias: ["hazardous chemical substance"],
    def: "Substances hazardous to humans or the environment, permitted, restricted and prohibited substances, accident preparedness substances, and other chemicals that have or may have hazard or risk. They are subject to facility standards, business permits, labelling and similar controls.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  chem_handling: {
    term: "Handling (of chemicals)",
    alias: ["handling"],
    def: "Manufacturing, importing, selling, storing, transporting or using a chemical substance.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  handling_facility: {
    term: "Handling facility",
    alias: ["handling facility", "hazardous chemical handling facility"],
    def: "Facility or equipment for manufacturing, storing, transporting (except by aircraft, ship or rail) or using chemicals. Hazardous chemical handling facilities must meet installation and management standards and undergo periodic inspection.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  chemical_accident: {
    term: "Chemical accident",
    alias: ["chemical accident"],
    def: "Any situation in which chemicals are spilled or released to people or the environment because of worker error during work such as equipment replacement, facility defects or ageing, natural disasters, transport accidents and the like.",
    law: "Chemicals Control Act (Korea), Article 2",
  },
  accident_prevention_plan: {
    term: "Chemical accident prevention and management plan",
    alias: ["chemical accident prevention plan", "prevention and management plan"],
    def: "Plan prepared and submitted by facilities handling hazardous chemicals above set quantities to prevent, prepare for and respond to chemical accidents. It covers accident scenarios, impact zones and emergency response such as resident evacuation, and merges the former off-site consequence assessment and risk management plan.",
    law: "Chemicals Control Act (Korea)",
  },
  hazchem_business_permit: {
    term: "Hazardous chemical business permit",
    alias: ["business permit", "hazardous chemical business"],
    def: "Permit obtained, per business type (manufacturing, sales, storage, transport, use), by anyone who wishes to run a business handling hazardous chemicals. Requirements include handling facilities and technical staff.",
    law: "Chemicals Control Act (Korea)",
  },
  prtr: {
    term: "Pollutant Release and Transfer Register (PRTR)",
    alias: ["PRTR", "chemical release survey", "release and transfer data"],
    def: "System in which workplaces handling listed chemicals survey and report the amounts released to the environment and transferred off site as waste and the like, and the state publishes the data.",
    law: "Chemicals Control Act (Korea), Article 11",
  },
  release_transfer: {
    term: "Releases and transfers",
    alias: ["releases", "transfers"],
    def: "In the PRTR, releases are amounts discharged directly from the site to air, water or soil, and transfers are amounts moved off site for treatment as waste or wastewater.",
  },
  // ── Act on Registration and Evaluation of Chemicals (K-REACH) ──
  k_reach_registration: {
    term: "Chemical registration (K-REACH)",
    alias: ["registration", "K-REACH registration"],
    def: "Procedure by which anyone manufacturing or importing a new chemical, or an existing chemical above a set annual quantity, submits physicochemical properties, hazard data and so on. Registration data underpin hazard review and risk assessment.",
    law: "Act on the Registration and Evaluation of Chemicals (Korea), Article 10",
  },
  new_chemical: {
    term: "New chemical substance",
    alias: ["new chemical"],
    def: "Any chemical substance that is not an existing chemical. It must be registered or notified before manufacture or import.",
    law: "Act on the Registration and Evaluation of Chemicals (Korea), Article 2",
  },
  existing_chemical: {
    term: "Existing chemical substance",
    alias: ["existing chemical", "KECI"],
    def: "Chemicals commercially distributed in Korea before 2 February 1991 and announced as such, plus chemicals that later passed hazard review under the former law and were announced. Each entry in the announced list carries a KE number.",
    law: "Act on the Registration and Evaluation of Chemicals (Korea), Article 2",
  },
  k_reach_hazard: {
    term: "Hazard",
    def: "Intrinsic property of a chemical, such as toxicity, that adversely affects human health or the environment. It is distinguished from risk because it is a property of the substance itself regardless of exposure.",
    law: "Act on the Registration and Evaluation of Chemicals (Korea), Article 2",
  },
  k_reach_risk: {
    term: "Risk",
    def: "Degree to which exposure to a hazardous chemical can cause harm to human health or the environment. It is assessed by considering hazard and exposure together.",
    law: "Act on the Registration and Evaluation of Chemicals (Korea), Article 2",
  },
  k_reach_priority_substance: {
    term: "Priority control substance",
    alias: ["priority control substance"],
    def: "Chemical designated and announced because of risk concern from among substances that cause or may cause cancer, mutation, impaired fertility or endocrine disruption in humans or animals, or that readily bioaccumulate and persist in the environment. It corresponds to the EU SVHC concept.",
    law: "Act on the Registration and Evaluation of Chemicals (Korea), Article 2",
  },
  hazard_review: {
    term: "Hazard review",
    alias: ["hazard evaluation"],
    def: "Procedure in which the state reviews the data of a registered chemical, classifies its hazards and decides matters such as designation as a hazardous chemical.",
    law: "Act on the Registration and Evaluation of Chemicals (Korea)",
  },
  // ── Occupational Safety and Health Act (Korea) ──
  msds: {
    term: "Material safety data sheet (MSDS/SDS)",
    alias: ["MSDS", "SDS", "safety data sheet"],
    def: "Document with 16 sections covering hazards, composition and concentration, first aid, handling and storage, exposure controls and personal protection, physicochemical properties, regulatory information and more. The manufacturer or importer of a covered substance prepares and submits it and must provide it to anyone receiving the substance.",
    law: "Occupational Safety and Health Act (Korea), Article 110",
  },
  msds_trade_secret: {
    term: "MSDS non-disclosure approval (alternative name)",
    alias: ["trade secret", "alternative information", "non-disclosure approval", "CBI"],
    def: "To withhold the name and content of a confidential ingredient from the MSDS, approval from the Minister of Employment and Labor must be obtained and alternative information entered. Information essential for preventing harm to workers' health cannot be withheld.",
    law: "Occupational Safety and Health Act (Korea), Article 112",
  },
  warning_label: {
    term: "Warning label",
    alias: ["hazard label", "GHS label", "label"],
    def: "Marking on the container or package of a covered substance showing the product name, pictograms, signal word, hazard statements, precautionary statements and supplier information.",
    law: "Occupational Safety and Health Act (Korea), Article 115",
  },
  new_chemical_osh_review: {
    term: "Hazard and risk investigation of new chemicals (OSH Act)",
    alias: ["OSH Act new chemical", "hazard and risk investigation report"],
    def: "System requiring anyone who intends to manufacture or import a new chemical to investigate its hazards and risks in advance and submit a report to the Minister of Employment and Labor. Depending on the result, worker protection measures are specified for the substance.",
    law: "Occupational Safety and Health Act (Korea), Article 108",
  },
  // ── GHS elements ──
  ghs_classification: {
    term: "GHS hazard classification",
    alias: ["hazard classification", "hazard class and category"],
    def: "International scheme sorting chemicals into hazard classes for physical, health and environmental hazards and into categories within each class. The classification determines the pictograms, signal word and hazard statements.",
  },
  ghs_pictogram: {
    term: "GHS pictograms (GHS01–GHS09)",
    alias: ["pictogram", "hazard pictogram"],
    def: "Nine symbols in black inside a red-bordered diamond on a white background that convey hazards. Precedence rules apply, for example the exclamation mark (GHS07) is not used when the skull (GHS06) applies to the same hazard.",
  },
  ghs01: {
    term: "GHS01 Exploding bomb",
    alias: ["bomb", "explosive pictogram"],
    def: "Used for explosives, self-reactive substances (types A and B) and organic peroxides (types A and B).",
  },
  ghs02: {
    term: "GHS02 Flame",
    alias: ["flame", "flammable pictogram"],
    def: "Used for flammable gases, aerosols, liquids and solids, pyrophoric and self-heating substances, substances that emit flammable gas with water, and self-reactive substances and organic peroxides (types B to F).",
  },
  ghs03: {
    term: "GHS03 Flame over circle",
    alias: ["oxidizer pictogram"],
    def: "Used for oxidizing gases, liquids and solids. It indicates substances that, even if not combustible themselves, supply oxygen and promote combustion of other materials.",
  },
  ghs04: {
    term: "GHS04 Gas cylinder",
    alias: ["gas under pressure pictogram"],
    def: "Used for gases under pressure: compressed, liquefied, refrigerated liquefied and dissolved gases.",
  },
  ghs05: {
    term: "GHS05 Corrosion",
    alias: ["corrosive pictogram"],
    def: "Used for substances corrosive to metals, skin corrosion (category 1) and serious eye damage (category 1).",
  },
  ghs06: {
    term: "GHS06 Skull and crossbones",
    alias: ["skull", "acute toxicity pictogram"],
    def: "Used for acute toxicity categories 1 to 3.",
  },
  ghs07: {
    term: "GHS07 Exclamation mark",
    alias: ["exclamation mark", "exclamation mark pictogram"],
    def: "Used for acute toxicity category 4, skin irritation, eye irritation, skin sensitization and specific target organ toxicity single exposure category 3 (respiratory irritation, narcotic effects).",
  },
  ghs08: {
    term: "GHS08 Health hazard",
    alias: ["health hazard pictogram"],
    def: "Used for respiratory sensitization, germ cell mutagenicity, carcinogenicity, reproductive toxicity, specific target organ toxicity (single exposure categories 1 and 2, repeated exposure) and aspiration hazard.",
  },
  ghs09: {
    term: "GHS09 Environment",
    alias: ["environment pictogram", "fish and tree"],
    def: "Used for hazards to the aquatic environment (acute category 1, chronic categories 1 and 2).",
  },
  ghs_signal_word: {
    term: "Signal word (Danger / Warning)",
    alias: ["signal word", "Danger", "Warning"],
    def: "Word indicating the relative severity of the hazard: 'Danger' for the more severe categories and 'Warning' for the less severe. If both would apply on one label, only 'Danger' is used.",
  },
  ghs_h_statement: {
    term: "Hazard statement (H statement)",
    alias: ["H statement", "H code", "hazard statement"],
    def: "Standard phrase describing the nature of the hazard for each hazard class and category. H2xx codes cover physical hazards, H3xx health hazards and H4xx environmental hazards.",
  },
  ghs_p_statement: {
    term: "Precautionary statement (P statement)",
    alias: ["P statement", "P code", "precautionary statement"],
    def: "Standard phrase recommending measures to prevent or minimize exposure and to respond to incidents. P1xx are general, P2xx prevention, P3xx response, P4xx storage and P5xx disposal.",
  },
  ghs_mixture_additivity: {
    term: "Mixture classification: additivity formula and summation method",
    alias: ["additivity formula", "summation method", "additive method", "mixture classification"],
    def: "Methods for classifying a mixture from the classification and concentration of its ingredients when the mixture itself has not been tested. Acute toxicity uses the additivity formula 100/ATEmix = Σ(Cᵢ/ATEᵢ) based on ingredient ATEs; skin corrosion/irritation and aquatic hazard use the summation method, comparing the summed concentration of classified ingredients (weighted by the M-factor for aquatic hazard) with set thresholds.",
  },
  ghs_ate: {
    term: "Acute toxicity estimate (ATE)",
    alias: ["ATE", "ATEmix", "acute toxicity estimate"],
    def: "LD50 or LC50 value, or a corresponding estimate, used for acute toxicity classification. When an ingredient has no test value and only its category is known, the converted point estimate for that category is used instead.",
  },
  ghs_cutoff: {
    term: "Cut-off value",
    alias: ["cut-off", "cutoff", "concentration limit"],
    def: "Concentration at or above which an ingredient is taken into account when classifying a mixture. For example, a mixture containing 0.1 % or more of a category 1 carcinogen is classified as carcinogenic. It is also linked to the threshold for listing ingredients on the MSDS.",
  },
  ghs_bridging: {
    term: "Bridging principles",
    alias: ["bridging principles", "bridging"],
    def: "Rules for transferring the classification of a similar tested mixture to an untested one: dilution, batching, concentration of highly hazardous mixtures, interpolation within one category, substantially similar mixtures and so on.",
  },
  // ── Transport and identifiers ──
  transport_un_number: {
    term: "UN number",
    alias: ["UN No.", "UN number"],
    def: "Four-digit number assigned to a dangerous good or group of goods in the UN Model Regulations. It appears on transport documents and on package and vehicle markings, and is entered in MSDS Section 14.",
  },
  transport_shipping_name: {
    term: "Proper shipping name (PSN)",
    alias: ["proper shipping name", "Proper Shipping Name", "PSN"],
    def: "Official transport name paired with the UN number in the dangerous goods list. For 'N.O.S.' (not otherwise specified) entries, the technical name is added.",
  },
  transport_packing_group: {
    term: "Packing group",
    alias: ["packing group", "Packing Group", "PG I", "PG II", "PG III"],
    def: "Packaging grade by degree of danger in transport: I for high danger, II for medium and III for low. The more dangerous the group, the more robust the packaging required.",
  },
  ec_number: {
    term: "EC number",
    def: "Seven-digit identifier (xxx-xxx-x) for chemicals in the EU. It comes from the EINECS (existing substances), ELINCS (notified new substances) and NLP (no-longer polymers) lists and is used together with the CAS number in REACH and CLP data.",
  },
  ke_number: {
    term: "KE number",
    alias: ["KE No.", "Korean existing chemical identifier"],
    def: "Unique number assigned to each substance on Korea's existing chemicals list, written as 'KE-' followed by digits. It is looked up together with the CAS number to check registration or notification obligations.",
  },
  // ── Foreign regimes and international conventions ──
  clp: {
    term: "CLP Regulation",
    def: "EU regulation on classification, labelling and packaging of substances and mixtures that implements the GHS (Regulation (EC) No 1272/2008). It contains harmonised classifications (Annex VI) and, together with REACH, forms the core of EU chemicals management.",
  },
  tsca: {
    term: "TSCA (US Toxic Substances Control Act)",
    def: "US law (enacted 1976) under which the EPA regulates the manufacture, import and use of chemicals. It was substantially amended by the Lautenberg Act in 2016, strengthening risk evaluation of existing chemicals; chemicals in US commerce are tracked in the TSCA Inventory.",
  },
  osha_hcs: {
    term: "OSHA Hazard Communication Standard (HCS 2012)",
    def: "US OSHA standard requiring workplace chemical hazard information to be conveyed through labels, SDSs and training. The 2012 revision adopted the GHS, and a 2024 revision aligned it with a later GHS revision.",
  },
  rotterdam_convention: {
    term: "Rotterdam Convention (PIC)",
    alias: ["PIC", "prior informed consent", "Rotterdam Convention"],
    def: "International convention (adopted 1998) requiring exporters of banned or severely restricted hazardous chemicals and pesticides to notify the importing country in advance and obtain its consent.",
  },
  stockholm_convention: {
    term: "Stockholm Convention (POPs)",
    alias: ["POPs", "persistent organic pollutants", "Stockholm Convention"],
    def: "International convention (adopted 2001) to eliminate or reduce production and use of persistent organic pollutants (POPs), which persist in the environment, bioaccumulate and travel long distances. Dioxins, PCBs and DDT are covered, and substances continue to be added.",
  },
  montreal_protocol: {
    term: "Montreal Protocol",
    alias: ["Montreal Protocol", "ozone-depleting substances", "ODS"],
    def: "International agreement (adopted 1987) to phase out production and consumption of ozone-depleting substances such as CFCs and halons. The Kigali Amendment (2016) added HFC reduction.",
  },
};

Object.assign(window, { GLOSSARY_REG_EN });
