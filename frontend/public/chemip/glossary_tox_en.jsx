// 용어사전 자료 영어판 · 독성·환경 — glossary_tox.jsx 의 GLOSSARY_TOX_KO 와 같은 key.
// term·def 는 늘 두고, alias·law·ref 는 한국어 값에 한글이 있을 때만 둡니다. React 없음(데이터만).

const GLOSSARY_TOX_EN = {
  // ── Dose-response metrics ──
  ld50: {
    term: "Median lethal dose (LD50)",
    alias: ["LD50", "median lethal dose"],
    def: "Single dose estimated to kill half of the test animals, expressed in mg per kg body weight. The lower the value, the higher the acute toxicity; it is used to classify oral and dermal acute toxicity.",
  },
  lc50: {
    term: "Median lethal concentration (LC50)",
    alias: ["LC50"],
    def: "Concentration in air or water estimated to kill half of the test organisms over a set exposure time (usually 4 hours for inhalation). Used for inhalation acute toxicity and acute fish toxicity.",
  },
  ec50: {
    term: "Median effective concentration (EC50)",
    alias: ["EC50", "ErC50"],
    def: "Concentration producing a specified effect, such as immobilization or growth inhibition, in half of the test organisms. Daphnia and algae results are used to classify aquatic hazard.",
  },
  noael: {
    term: "No observed adverse effect level (NOAEL)",
    alias: ["NOAEL"],
    def: "Highest dose in a toxicity study (for example repeated dosing) at which no statistically or biologically significant adverse effect is seen compared with controls. It is the starting point for deriving human safety limits.",
  },
  loael: {
    term: "Lowest observed adverse effect level (LOAEL)",
    alias: ["LOAEL"],
    def: "Lowest dose at which an adverse effect is observed. It is used when no NOAEL can be identified, with a larger uncertainty factor applied.",
  },
  dnel: {
    term: "Derived no-effect level (DNEL)",
    alias: ["DNEL"],
    def: "Exposure level below which no effect on humans is expected, used in EU REACH risk assessment. It is derived by dividing a starting point such as the NOAEL by assessment factors, separately for each route, duration and population (workers, general public).",
  },
  pnec: {
    term: "Predicted no-effect concentration (PNEC)",
    alias: ["PNEC"],
    def: "Environmental concentration below which no effect on the ecosystem is expected. It is obtained by dividing ecotoxicity values (LC50, EC50, NOEC) by an assessment factor that depends on the data available (e.g. 1000 with acute data only).",
  },
  uncertainty_factor: {
    term: "Uncertainty factor (UF)",
    alias: ["assessment factor", "safety factor"],
    def: "Factor by which a starting-point dose is divided to account for animal-to-human extrapolation, human variability and data gaps. Default values of 10 for interspecies and 10 for intraspecies differences are often multiplied together.",
  },
  dose_response: {
    term: "Dose-response relationship",
    alias: ["dose-response"],
    def: "Relationship describing how the size of an effect, or the fraction of individuals affected, changes as the dose increases. It is usually drawn as an S-shaped curve from which metrics such as LD50 and NOAEL are read.",
  },
  threshold: {
    term: "Threshold",
    alias: ["threshold dose"],
    def: "Dose below which no adverse effect appears. General toxicity is assumed to have a threshold, whereas effects assumed to have none, such as genotoxic carcinogenicity, are considered to carry risk at any exposure.",
  },
  // ── Health hazards (GHS) ──
  acute_toxicity: {
    term: "Acute toxicity",
    alias: ["acute toxicity"],
    def: "Adverse effects after a single oral or dermal dose, or several doses within 24 hours, or 4-hour inhalation exposure. GHS oral acute toxicity category boundaries are LD50 values of 5, 50, 300 and 2000 mg/kg.",
  },
  chronic_toxicity: {
    term: "Chronic toxicity",
    alias: ["chronic toxicity", "repeated-dose toxicity"],
    def: "Adverse effects from repeated exposure to relatively low doses over a long period. It is assessed through carcinogenicity, reproductive toxicity, repeated-exposure target organ toxicity and similar endpoints.",
  },
  stot_se: {
    term: "Specific target organ toxicity, single exposure (STOT SE)",
    alias: ["STOT SE", "single-exposure target organ toxicity"],
    def: "Non-lethal adverse effects on specific organs after a single exposure, other than acute toxicity. Categories 1 and 2 cover significant organ effects; category 3 covers transient respiratory tract irritation and narcotic effects (drowsiness, dizziness).",
  },
  stot_re: {
    term: "Specific target organ toxicity, repeated exposure (STOT RE)",
    alias: ["STOT RE", "repeated-exposure target organ toxicity"],
    def: "Adverse effects on specific organs from repeated exposure, divided into categories 1 and 2 by the dose range at which effects appeared in animal studies.",
  },
  aspiration_hazard: {
    term: "Aspiration hazard",
    alias: ["aspiration toxicity"],
    def: "Hazard that a liquid or solid entering through the mouth or nose, or by vomiting, flows directly into the trachea and lungs and causes severe acute effects such as chemical pneumonitis. Hydrocarbons with a kinematic viscosity of 20.5 mm²/s or less at 40 °C are category 1.",
  },
  carcinogenicity: {
    term: "Carcinogenicity",
    alias: ["carcinogen category", "1A", "1B", "category 2"],
    def: "Property of inducing cancer or increasing its incidence. GHS assigns category 1A when there is human evidence, 1B when animal evidence is sufficient, and category 2 when carcinogenicity is suspected but evidence is limited.",
  },
  iarc_group: {
    term: "IARC carcinogen group",
    alias: ["IARC", "Group 1", "Group 2A", "Group 2B", "International Agency for Research on Cancer"],
    def: "Classification by the International Agency for Research on Cancer by strength of evidence: Group 1 (carcinogenic to humans), 2A (probably), 2B (possibly) and 3 (not classifiable). It reflects certainty of evidence, not the size of the risk.",
  },
  germ_cell_mutagenicity: {
    term: "Germ cell mutagenicity",
    alias: ["mutagenicity", "mutagen"],
    def: "Property of causing heritable mutations in genes or chromosomes of germ cells. It is divided into categories 1A, 1B and 2 in the same way as carcinogenicity.",
  },
  reproductive_toxicity: {
    term: "Reproductive toxicity",
    alias: ["reproductive toxicant", "effects on or via lactation"],
    def: "Adverse effects on sexual function and fertility in adults, or on development of the offspring. Categories are 1A, 1B and 2, with an additional category for effects on or via lactation.",
  },
  respiratory_sensitization: {
    term: "Respiratory sensitization",
    alias: ["respiratory sensitizer", "occupational asthma"],
    def: "Property of causing airway hypersensitivity (such as asthma) after inhalation. Once sensitized, a person reacts to very low concentrations, so control is needed even below the exposure limit.",
  },
  skin_sensitization: {
    term: "Skin sensitization",
    alias: ["skin sensitizer", "allergic contact dermatitis"],
    def: "Property of causing an allergic response after skin contact. After sensitization, even small repeated contact causes contact dermatitis.",
  },
  skin_corrosion: {
    term: "Skin corrosion",
    alias: ["corrosive to skin", "corrosivity"],
    def: "Property of causing irreversible damage (necrosis through the epidermis into the dermis) after up to 4 hours of contact. It is category 1, subdivided into 1A, 1B and 1C by the contact time that produces damage.",
  },
  skin_irritation: {
    term: "Skin irritation",
    alias: ["skin irritant"],
    def: "Property of causing reversible skin damage (erythema, oedema, etc.) after up to 4 hours of contact; category 2.",
  },
  serious_eye_damage: {
    term: "Serious eye damage / eye irritation",
    alias: ["serious eye damage", "eye irritation"],
    def: "Tissue damage or serious loss of vision not fully reversible within 21 days is serious eye damage (category 1); changes that are fully reversible within 21 days are eye irritation (category 2).",
  },
  // ── Emergency exposure values ──
  idlh: {
    term: "Immediately dangerous to life or health (IDLH)",
    alias: ["IDLH"],
    def: "Concentration at which exposure could immediately threaten life, cause irreversible health effects, or impair the ability to escape. Set by the US NIOSH on the assumption of escape without a respirator within 30 minutes.",
  },
  erpg: {
    term: "Emergency Response Planning Guidelines (ERPG)",
    def: "Emergency concentrations for 1-hour exposure set by the US AIHA. ERPG-1, -2 and -3 are the maximum concentrations below which nearly everyone would experience no more than mild transient effects or odor, no irreversible or protective-action-impairing effects, and no life-threatening effects respectively.",
  },
  aegl: {
    term: "Acute Exposure Guideline Levels (AEGL)",
    def: "Emergency limits for one-time exposure of the general public set under a US EPA advisory committee, with level 1 to 3 values for 10 min, 30 min, 1 h, 4 h and 8 h. The levels have meanings similar to ERPG and are used as endpoints for accident consequence distances.",
  },
  teel: {
    term: "Temporary Emergency Exposure Limits (TEEL)",
    def: "Interim emergency exposure limits set by the US Department of Energy for substances lacking AEGL or ERPG values. They use tiers with the same meaning as AEGL and ERPG and are replaced when formal values appear.",
  },
  // ── Environmental fate ──
  bcf: {
    term: "Bioconcentration factor (BCF)",
    alias: ["BCF", "bioconcentration"],
    def: "Concentration in an organism (usually fish) divided by that in the surrounding water at steady state. GHS treats BCF ≥ 500 as indicating bioaccumulation potential; EU REACH treats BCF > 2000 as bioaccumulative (B) and > 5000 as very bioaccumulative (vB).",
  },
  log_kow: {
    term: "Octanol-water partition coefficient (log Kow)",
    alias: ["log Kow", "log Pow", "Kow", "partition coefficient"],
    def: "Logarithm of the ratio of concentrations of a substance distributed between octanol and water; a measure of lipophilicity. Higher values mean greater accumulation in fat, and GHS uses log Kow ≥ 4 as the bioaccumulation trigger when no measured BCF exists.",
  },
  biodegradability: {
    term: "Biodegradability",
    alias: ["ready biodegradability", "readily biodegradable"],
    def: "Extent to which microorganisms break a substance down. In OECD ready biodegradability tests, a substance reaching 70 % DOC removal or 60 % of theoretical oxygen demand within 28 days (meeting the 10-day window) is 'readily biodegradable' and is treated as rapidly degradable in chronic aquatic classification.",
  },
  pbt: {
    term: "PBT and vPvB substances",
    alias: ["PBT", "vPvB", "persistent, bioaccumulative and toxic"],
    def: "Substances that resist degradation in the environment (persistent, P), accumulate in organisms (B) and are toxic (T). vPvB substances are very persistent and very bioaccumulative; both are grounds for SVHC identification under EU REACH.",
  },
  aquatic_acute: {
    term: "Hazardous to the aquatic environment (acute)",
    alias: ["acute aquatic toxicity", "aquatic acute"],
    def: "Hazard to aquatic organisms from short-term exposure. If any of fish 96 h LC50, Daphnia 48 h EC50 or algae 72/96 h ErC50 is 1 mg/L or less, the substance is GHS acute category 1.",
  },
  aquatic_chronic: {
    term: "Hazardous to the aquatic environment (chronic)",
    alias: ["chronic aquatic toxicity", "long-term aquatic hazard"],
    def: "Hazard to aquatic organisms from exposure over their life cycle. The category is set from chronic toxicity data, or from acute toxicity combined with degradability and bioaccumulation.",
  },
  endocrine_disruptor: {
    term: "Endocrine disrupting chemical",
    alias: ["environmental hormone", "endocrine disruptor", "EDC"],
    def: "External substance that mimics or blocks hormone action, disturbing the endocrine system and harming reproduction or development. Because it may act at very low concentrations, separate assessment criteria are being discussed.",
  },
  risk_formula: {
    term: "Risk = hazard × exposure",
    alias: ["risk assessment", "risk characterization ratio", "RCR"],
    def: "Concept that even a substance with severe intrinsic hazard causes no harm without exposure. In risk assessment, the predicted exposure divided by a no-effect level such as the DNEL or PNEC gives the risk characterization ratio (RCR), which should be below 1.",
  },
  toxic_endpoint: {
    term: "Toxic endpoint (consequence-distance concentration)",
    alias: ["endpoint concentration", "toxic endpoint"],
    def: "Concentration used to bound the impact zone of a release, treated as the level up to which harm can occur. ERPG-2 or AEGL-2 is commonly used, and a dispersion model gives the distance at which this concentration is reached.",
  },
  pac: {
    term: "Protective Action Criteria (PAC)",
    alias: ["PAC", "PAC-1", "PAC-2", "PAC-3"],
    def: "One-hour emergency exposure values compiled by the US Department of Energy for each chemical, taking the 60-minute AEGL first, then the ERPG, then the TEEL. Tiers 1 to 3 mean the same as in AEGL and ERPG; about 3,000 chemicals have values.",
  },
  toxic_probit: {
    term: "Toxic probit",
    alias: ["probit", "Pr = a + b ln(C^n t)"],
    def: "Relation Pr = a + b·ln(Cⁿ·t) that estimates the lethal fraction from the concentration C and duration t of a toxic gas exposure. Pr 5 is 50 % and 2.67 is 1 %; the constants a, b and n depend on the substance and the source.",
  },
};

Object.assign(window, { GLOSSARY_TOX_EN });
