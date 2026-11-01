// 용어사전 자료 · 공정안전(PSM) — 영어판. key 는 glossary_psm.jsx(GLOSSARY_PSM_KO)와 같습니다.
// 한글이 든 필드(term·def·alias·law·ref)만 영어로 둡니다. exams·calc·see·src·lawUrl 은 한국어 파일에서 읽습니다.

const GLOSSARY_PSM_EN = {
  psm: {
    term: "Process safety management (PSM)",
    alias: ["PSM", "process safety management system"],
    def: "A management system for processes that handle hazardous substances, aimed at preventing major accidents such as fires, explosions and toxic releases. It ties process information, hazard analysis, operation, maintenance, change and emergency response into one framework. In Korea it runs through the submission, review and verification of the Process Safety Report.",
    law: "Occupational Safety and Health Act, Article 44",
  },
  psm_elements_12: {
    term: "Twelve elements of PSM (Korea)",
    alias: ["PSM elements", "process safety elements"],
    def: "The twelve management items of Korean PSM: process safety information, process hazard analysis, operating procedures, inspection and maintenance of equipment, safe work permits, contractor management, employee training, pre-startup safety review, management of change, compliance audits, incident investigation and emergency planning. US OSHA PSM splits these into 14 elements, adding employee participation and trade secrets.",
  },
  psm_report: {
    term: "Process Safety Report (PSM report)",
    alias: ["PSM report", "process safety report submission"],
    def: "A report that employers in designated industries, or those handling hazardous substances above threshold quantities, must prepare and submit to prevent major industrial accidents. It contains process safety information, the process hazard assessment, the safe operation plan and the emergency action plan; once reviewed it must be kept on site and followed.",
    law: "Occupational Safety and Health Act, Article 44",
  },
  major_industrial_accident: {
    term: "Major industrial accident",
    alias: ["major accident", "major industrial accident"],
    def: "An accident in which a hazardous substance leaks from hazardous equipment, or a fire or explosion occurs, that can immediately harm workers on site or cause damage to the surrounding area. It is the type of accident the Process Safety Report system is designed to prevent.",
    law: "Occupational Safety and Health Act, Article 44",
  },
  serious_industrial_disaster: {
    term: "Serious industrial accident (Serious Accidents Punishment Act)",
    alias: ["serious accident", "Serious Accidents Punishment Act"],
    def: "An industrial accident causing one or more deaths, two or more injured persons needing six months or more of treatment from the same accident, or three or more cases of occupational illness such as acute poisoning from the same hazard within one year. It is the basis for punishing management officers who breach their safety and health duties.",
    law: "Serious Accidents Punishment Act, Article 2",
  },
  risk_assessment_osh: {
    term: "Risk assessment (Occupational Safety and Health Act)",
    alias: ["risk assessment", "workplace risk assessment"],
    def: "The process in which an employer identifies hazards at the workplace, judges the level of risk of injury or illness, and plans and carries out measures to reduce it. Besides multiplying frequency by severity, methods such as checklists, a three-level risk judgement and key-factor description are allowed.",
    law: "Occupational Safety and Health Act, Article 36",
    ref: "Ministry of Employment and Labor notice, Guideline on Workplace Risk Assessment",
  },
  process_safety_info: {
    term: "Process safety information (PSI)",
    alias: ["PSI", "process safety data"],
    def: "The set of documents underlying hazard analysis, operation and maintenance: MSDSs of the substances handled, the list and inventory of hazardous substances, process flow diagrams and P&IDs, equipment specifications, design bases for relief devices and other safeguards, and hazardous area classification drawings.",
  },
  pha: {
    term: "Process hazard analysis (PHA)",
    alias: ["process hazard analysis", "PHA"],
    def: "A systematic review that identifies possible accident scenarios in process equipment and operation, examines their causes, consequences and existing safeguards, and issues recommendations. A suitable technique is chosen from HAZOP, What-if, checklist, FMEA, FTA, ETA and others.",
  },
  hazop: {
    term: "Hazard and operability study (HAZOP)",
    alias: ["HAZOP", "hazard and operability study", "guide words"],
    def: "A qualitative team technique that divides a process into nodes, applies guide words (no, more, less, reverse, as well as, part of, other than) to parameters such as flow, pressure, temperature and level to generate deviations from design intent, and reviews their causes, consequences and safeguards. It is mostly used once P&IDs are firm, or on operating plants.",
  },
  hazop_node: {
    term: "Node (HAZOP study node)",
    alias: ["node", "study node"],
    def: "The section of plant examined at one time in a HAZOP. Nodes are drawn so that the design intent (flow, pressure, temperature and other operating conditions) is uniform, and a new node starts where the intent or operating conditions change.",
  },
  guide_word: {
    term: "Guide word",
    alias: ["guide words", "guideword"],
    def: "A short word combined with a parameter to generate a deviation in a HAZOP. The basic set is no, more, less, reverse, as well as, part of and other than; batch studies also apply them to time and sequence.",
  },
  hazop_deviation: {
    term: "Deviation",
    alias: ["process deviation"],
    def: "A departure from design intent formed by a guide word and a parameter (e.g. no flow, more pressure). The HAZOP worksheet records causes, consequences, existing safeguards, risk and recommendations for each deviation.",
  },
  hazop_safeguard: {
    term: "Safeguard (existing)",
    alias: ["safeguards", "existing safeguards"],
    def: "Devices and procedures already in place that prevent or mitigate the consequences of a deviation. Likelihood in the risk ranking takes them into account; if they are inadequate a recommendation is raised.",
  },
  what_if: {
    term: "What-if analysis",
    alias: ["What-if", "what-if analysis", "what if"],
    def: "A qualitative brainstorming technique that asks \"what happens if ...?\" to find possible abnormal situations, their consequences and safeguards. It is quick because it is loosely structured, but it relies heavily on experienced team members and is often combined with a checklist.",
  },
  checklist_analysis: {
    term: "Checklist analysis",
    alias: ["checklist", "checklist analysis"],
    def: "A technique that compares equipment and operation against a list of items drawn from codes, standards and past accidents to find missing safeguards. It is simple and consistent but cannot find hazards that are not on the list.",
  },
  fmea: {
    term: "Failure modes and effects analysis (FMEA)",
    alias: ["FMEA", "failure modes and effects analysis", "FMECA", "failure mode effects analysis"],
    def: "An inductive technique that lists the failure modes of each item of equipment or component (fails open, leaks, ruptures, etc.) and tabulates the effect of each on the system and how it is detected. Ranking by criticality makes it an FMECA. It handles human error and combined failures poorly.",
  },
  fta: {
    term: "Fault tree analysis (FTA)",
    alias: ["FTA", "fault tree analysis", "fault tree", "minimal cut set"],
    def: "A deductive technique that starts from an undesired top event and traces its causes down to basic events through AND and OR gates. With minimal cut sets and basic-event probabilities, the top-event probability can be calculated. AND gates multiply probabilities; OR gates combine them as 1 − Π(1 − Pᵢ).",
  },
  eta: {
    term: "Event tree analysis (ETA)",
    alias: ["ETA", "event tree analysis", "event tree"],
    def: "An inductive technique that starts from one initiating event and follows branches for the success or failure of each safeguard and response, giving the possible outcomes (safe, release, fire, explosion, etc.) and their frequencies. Branches such as immediate or delayed ignition are commonly used to split fire and explosion scenarios.",
  },
  bowtie: {
    term: "Bow-tie analysis",
    alias: ["Bow-tie", "bow tie", "bow-tie diagram"],
    def: "A one-page diagram with a central top event, causes and preventive barriers on the left, and consequences and mitigating barriers on the right. The left side resembles a fault tree and the right an event tree; it is used for barrier management and communication.",
  },
  lopa: {
    term: "Layer of protection analysis (LOPA)",
    alias: ["LOPA", "layer of protection analysis"],
    def: "A semi-quantitative technique that multiplies the initiating-event frequency of a scenario by the probability of failure on demand (PFD) of each independent protection layer to obtain a mitigated frequency, and compares it with a tolerance criterion to judge whether protection is sufficient. Any gap sets the SIL required of a SIS.",
  },
  ipl: {
    term: "Independent protection layer (IPL)",
    alias: ["IPL", "independent protection layer", "protection layer"],
    def: "A device or action that on its own can stop a scenario from becoming an accident. To qualify it must be effective for that scenario (specific), independent of the initiating event and other layers, dependable, and auditable by test or inspection. Relief valves, SIS and dikes are examples.",
  },
  dow_fei: {
    term: "Dow Fire and Explosion Index (F&EI)",
    alias: ["F&EI", "Dow index", "fire and explosion index", "relative ranking"],
    def: "A relative ranking method that rates the fire and explosion hazard of a process unit by multiplying the material factor (MF) by the process unit hazard factor F3, which is the product of the general process hazards factor F1 and the special process hazards factor F2. F&EI = MF × F1 × F2, and it is then used to estimate the radius of exposure and loss.",
  },
  pfd: {
    term: "Probability of failure on demand (PFD)",
    alias: ["PFD", "PFDavg", "probability of failure on demand", "RRF"],
    def: "The probability that a safeguard fails to perform when a demand occurs. For a single proof-tested device, PFDavg ≈ λDU·T/2 (λDU: dangerous undetected failure rate, T: proof test interval). Its reciprocal 1/PFD is the risk reduction factor (RRF).",
  },
  sil: {
    term: "Safety integrity level (SIL)",
    alias: ["SIL", "safety integrity level"],
    def: "Four levels expressing how reliably a safety instrumented function must work. In low-demand mode, PFDavg is 10⁻² to 10⁻¹ for SIL 1, 10⁻³ to 10⁻² for SIL 2, 10⁻⁴ to 10⁻³ for SIL 3 and 10⁻⁵ to 10⁻⁴ for SIL 4. SIL 3 is the usual ceiling in the process industry.",
  },
  sis: {
    term: "Safety instrumented system (SIS)",
    alias: ["SIS", "safety instrumented system", "BPCS"],
    def: "An instrumented system of sensors, a logic solver and final elements (such as shutdown valves) that moves the process to a safe state when it detects a hazardous condition. It must be independent of the basic process control system (BPCS) to count as an IPL.",
  },
  sif: {
    term: "Safety instrumented function (SIF)",
    alias: ["SIF", "safety instrumented function"],
    def: "An individual safety function carried out by a SIS. For example, \"close the feed shutdown valve on reactor pressure high-high\" is one SIF; a SIL is assigned to each SIF.",
  },
  interlock: {
    term: "Interlock",
    alias: ["interlock", "safety interlock", "ESD", "emergency shutdown"],
    def: "A device that prevents equipment from operating unless set conditions are met, or that automatically stops or isolates it when an abnormal condition is detected. The higher-level system that safely stops the whole process is called emergency shutdown (ESD); bypassing should only be done under authorization and with records.",
  },
  sop: {
    term: "Operating procedures (SOP)",
    alias: ["operating instructions", "operating procedure manual", "SOP"],
    def: "Documents giving the step-by-step procedures, operating limits and actions on exceeding limits for each phase: initial startup, normal operation, emergency operation, normal shutdown, emergency shutdown and restart after maintenance. They should be reviewed periodically to match actual practice.",
  },
  mechanical_integrity: {
    term: "Mechanical integrity (MI)",
    alias: ["mechanical integrity", "inspection, testing and maintenance", "MI", "RBI"],
    def: "The management element that plans and records inspection, testing, preventive maintenance and repair of critical equipment such as pressure vessels, piping, relief valves, instruments and rotating machines so they keep their design function. Risk-based inspection (RBI), which sets inspection intervals and methods by risk, is often used alongside.",
  },
  work_permit: {
    term: "Safe work permit",
    alias: ["work permit", "permit to work", "PTW"],
    def: "A procedure in which, before hazardous non-routine work such as hot work, confined space entry, electrical isolation, excavation or work at height, hazards, isolation, gas testing and protective equipment are checked and a responsible person authorizes the work in writing.",
  },
  hot_work: {
    term: "Hot work",
    alias: ["hot work permit", "welding and cutting", "Hot work"],
    def: "Work that produces sparks or high temperatures, such as welding, cutting and grinding. Before starting, combustibles nearby are removed or shielded, flammable gas concentration is measured, a fire watch is posted and extinguishers are placed, and a permit is issued.",
  },
  confined_space_entry: {
    term: "Confined space entry control",
    alias: ["confined space entry permit", "confined space entry", "Confined space entry"],
    def: "The procedure for entering a confined space such as a tank, manhole or pit: isolating piping and power, purging and ventilating, confirming adequate air by measuring oxygen, flammable gas and toxic gases, posting an attendant and providing rescue equipment, and then entering under a work permit. Air quality is monitored continuously during the work.",
  },
  contractor_management: {
    term: "Contractor management",
    alias: ["contractor safety management", "contractor management", "Contractor management"],
    def: "The management element that evaluates the safety record of contractors working in or near the process when selecting them, trains them on process hazards and emergency actions, and checks permits and compliance with safety rules during work.",
  },
  moc: {
    term: "Management of change (MOC)",
    alias: ["MOC", "change management", "management of change"],
    def: "The management element requiring that changes to process, equipment, raw materials, operating conditions, procedures or organization are reviewed for their safety impact and are approved, documented and trained before being implemented. Replacement in kind is excluded.",
  },
  pssr: {
    term: "Pre-startup safety review (PSSR)",
    alias: ["PSSR", "pre-startup safety review", "pre-commissioning check"],
    def: "A check made before hazardous material is introduced into new or modified equipment, confirming that it was built as designed and that procedures, training and hazard analysis recommendations are complete.",
  },
  emergency_response_plan: {
    term: "Emergency action plan",
    alias: ["emergency response plan", "ERP", "emergency action"],
    def: "A plan prepared for emergencies such as releases, fires and explosions that sets the emergency organization and communication, alarm and evacuation methods, emergency shutdown procedures, cooperation with outside agencies and regular drills. It is a component of the Process Safety Report.",
  },
  incident_investigation: {
    term: "Incident investigation",
    alias: ["accident investigation", "near-miss investigation", "root cause analysis", "RCA"],
    def: "The management element in which, after an incident or near miss, a team identifies direct and root causes, sets measures to prevent recurrence and tracks their completion.",
  },
  compliance_audit: {
    term: "Compliance audit",
    alias: ["PSM compliance audit", "Compliance audit"],
    def: "An internal audit that periodically checks whether each PSM element is carried out as planned and confirms correction of deficiencies.",
  },
  failure_rate: {
    term: "Failure rate (λ)",
    alias: ["failure rate", "reliability function", "λ"],
    def: "The rate at which failures occur per unit time. With a constant failure rate, reliability is R(t) = e^(−λt), failure probability is 1 − R(t), and the mean time between failures (MTBF) is 1/λ.",
  },
  mtbf: {
    term: "Mean time between failures (MTBF)",
    alias: ["MTBF", "mean time between failures", "MTTF"],
    def: "For repairable equipment, the average operating time between one failure and the next. For non-repairable parts it is called mean time to failure (MTTF). With a constant failure rate, MTBF = 1/λ.",
  },
  availability: {
    term: "Availability",
    alias: ["availability", "MTTR", "mean time to repair"],
    def: "The fraction of time equipment is in a state able to operate when required. A = MTBF / (MTBF + MTTR), where MTTR is the mean time to repair.",
  },
  bathtub_curve: {
    term: "Bathtub curve",
    alias: ["bathtub curve", "failure rate curve"],
    def: "A curve of failure rate over time showing an early-failure period (decreasing), a random-failure period (roughly constant) and a wear-out period (increasing). Early failures are reduced by burn-in and commissioning, wear-out failures by preventive maintenance and replacement.",
  },
  individual_risk: {
    term: "Individual risk (IR)",
    alias: ["individual risk", "location-specific individual risk", "LSIR"],
    def: "The annual frequency at which a person staying unprotected and continuously at one location would be killed by accidents at the facility. It is shown on a map as risk contours joining equal values.",
  },
  societal_risk: {
    term: "Societal risk (SR)",
    alias: ["societal risk", "group risk"],
    def: "The risk that an accident at a facility kills many people at once. It reflects the surrounding population distribution and is usually shown as an F-N curve.",
  },
  fn_curve: {
    term: "F-N curve",
    alias: ["FN curve", "F-N curve"],
    def: "A log-log plot of the number of fatalities N against the cumulative annual frequency F of accidents causing N or more deaths. It is compared with criterion lines to judge societal risk.",
  },
  alarp: {
    term: "ALARP (as low as reasonably practicable)",
    alias: ["ALARP", "as low as reasonably practicable"],
    def: "The principle that divides risk into intolerable, ALARP and broadly acceptable regions, and requires risk in the middle region to be reduced further unless the cost is grossly disproportionate to the benefit.",
  },
  risk_matrix: {
    term: "Risk matrix",
    alias: ["risk matrix", "risk ranking matrix", "risk level"],
    def: "A tool that treats risk as the combination of likelihood and severity, divides both axes into categories and assigns a risk level and required action to each cell.",
  },
  safety_valve_class: {
    term: "Safety valve vs relief valve",
    alias: ["safety valve", "relief valve", "safety relief valve", "PSV", "PRV"],
    def: "Spring-loaded pressure relief valves are classed by service. A safety valve is for gas or vapor and opens fully at once (pops) at set pressure; a relief valve is for liquid and opens gradually in proportion to the overpressure; a safety relief valve can be used for either.",
    law: "Occupational Safety and Health Standards Rules",
  },
  prv_conventional: {
    term: "Conventional pressure relief valve",
    alias: ["conventional PSV", "conventional valve"],
    def: "A spring-loaded valve whose bonnet is open to the outlet, so back pressure directly affects its set pressure and opening characteristics. It is used where back pressure is constant and low (built-up back pressure usually no more than 10 % of set pressure).",
  },
  prv_balanced_bellows: {
    term: "Balanced bellows pressure relief valve",
    alias: ["balanced bellows", "bellows valve"],
    def: "A spring-loaded valve with a bellows behind the disc that cancels the effect of back pressure on set pressure. It is used in flare systems with high or variable back pressure and to protect the spring from corrosive fluid. The bonnet vent must not be plugged.",
  },
  prv_pilot: {
    term: "Pilot-operated pressure relief valve",
    alias: ["pilot-operated valve", "Pilot-operated"],
    def: "A valve in which a small pilot senses process pressure and vents the dome above the main piston, opening the main valve. It stays tight close to set pressure and is little affected by back pressure, but the pilot can plug with dirty or polymerizing fluids.",
  },
  rupture_disc: {
    term: "Rupture disc",
    alias: ["Rupture disc", "Bursting disc", "reverse-acting rupture disc"],
    def: "A thin metal membrane that bursts at a set pressure to relieve it and does not reclose. Forward-acting (tension) discs have pressure on the concave side and stretch to burst; reverse-acting discs have pressure on the convex side and buckle to burst. They are used for rapid pressure rise, corrosive or sticky fluids, and to protect a relief valve inlet.",
  },
  flare: {
    term: "Flare system",
    alias: ["flare", "flare stack", "knock-out drum", "Knock-out drum"],
    def: "A system that collects flammable gas discharged from relief valves or emergency depressuring and burns it at a safe location. It consists of a knock-out drum to remove liquid, a seal drum and purge gas against flashback, and an elevated or ground flare.",
  },
};

Object.assign(window, { GLOSSARY_PSM_EN });
