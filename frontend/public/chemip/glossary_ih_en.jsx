// 용어사전 자료 영어판 · 산업위생 — glossary_ih.jsx 의 GLOSSARY_IH_KO 와 같은 key.
// term·def 는 늘 두고, alias·law·ref 는 한국어 값에 한글이 있을 때만 둡니다. React 없음(데이터만).

const GLOSSARY_IH_EN = {
  // ── Exposure limits ──
  stel: {
    term: "Short-term exposure limit (STEL)",
    alias: ["STEL", "short-term limit"],
    def: "Limit for the 15-minute time-weighted average exposure. When exposure lies above the TWA but at or below the STEL, each exposure must last no more than 15 minutes, occur no more than 4 times a day, and be at least 60 minutes apart.",
    law: "MOEL Notice on Exposure Limits for Chemical Substances and Physical Agents, Article 2",
  },
  ceiling_limit: {
    term: "Ceiling limit (C)",
    alias: ["Ceiling", "C", "ceiling value"],
    def: "Concentration that must not be exceeded at any moment during the workday. It is marked with a 'C' before the limit and is set for strongly irritating or acutely acting substances.",
    law: "MOEL Notice on Exposure Limits for Chemical Substances and Physical Agents, Article 2",
  },
  permissible_limit: {
    term: "Permissible exposure standard (mandatory limit)",
    alias: ["mandatory exposure limit"],
    def: "Exposure limit that the employer is legally obliged to keep exposure at or below. The covered agents are listed in the Enforcement Decree; unlike the advisory exposure limits, violation is punishable.",
    law: "Occupational Safety and Health Act (Korea), Article 106",
  },
  // ── Monitoring & health surveillance ──
  work_env_measurement: {
    term: "Work environment measurement",
    alias: ["workplace exposure monitoring"],
    def: "Sampling, analysis and evaluation of the workers or work areas concerned to assess workplace conditions. Workplaces with exposure to listed agents must be measured periodically (as a rule at least once every 6 months) and the results reported.",
    law: "Occupational Safety and Health Act (Korea), Article 125",
  },
  special_health_exam: {
    term: "Special health examination",
    alias: ["occupational health surveillance"],
    def: "Health examination of workers engaged in jobs with exposure to listed hazardous agents, aimed at early detection of occupational disease. The Act provides for it together with pre-placement, as-needed and ad hoc examinations.",
    law: "Occupational Safety and Health Act (Korea), Article 130",
  },
  bei: {
    term: "Biological exposure index (BEI)",
    alias: ["BEI", "biological monitoring", "biomarker"],
    def: "Index that evaluates the dose a worker actually absorbed from the concentration of the substance or its metabolite in blood, urine or exhaled air. It also reflects skin absorption and the effect of protective equipment, so it complements air monitoring. Sampling time (end of shift, end of work week, etc.) is fixed per substance.",
  },
  // ── Size-selective dust fractions ──
  inhalable_dust: {
    term: "Inhalable particulate matter",
    alias: ["inhalable fraction", "IPM"],
    def: "Particles that are hazardous when deposited anywhere in the respiratory tract after entering through the nose or mouth. The 50 % collection cut-point (aerodynamic diameter) is about 100 µm.",
  },
  thoracic_dust: {
    term: "Thoracic particulate matter",
    alias: ["thoracic fraction", "TPM"],
    def: "Particles that are hazardous when deposited in the airways and the gas-exchange region. The 50 % cut-point is about 10 µm.",
  },
  respirable_dust: {
    term: "Respirable particulate matter",
    alias: ["respirable fraction", "RPM"],
    def: "Particles that are hazardous when deposited in the gas-exchange region (alveoli). The 50 % cut-point is about 4 µm; it is sampled behind a size-selective device such as a cyclone and used for pneumoconiosis-causing dusts like crystalline silica.",
  },
  // ── Sampling ──
  personal_sample: {
    term: "Personal sample",
    alias: ["personal sampling"],
    def: "Sample collected with the sampler mounted in the worker's breathing zone throughout the task. It best represents actual exposure and is the default method of work environment measurement.",
  },
  area_sample: {
    term: "Area sample",
    alias: ["area sampling", "static sampling"],
    def: "Sample collected with the sampler fixed at a set location in the workplace. Used when personal sampling is impractical or to characterize sources and ventilation performance.",
  },
  lod: {
    term: "Limit of detection (LOD)",
    alias: ["LOD", "detection limit"],
    def: "Smallest amount the method can distinguish from the background. It is commonly set at 3 times the standard deviation of the blank signal.",
  },
  loq: {
    term: "Limit of quantitation (LOQ)",
    alias: ["LOQ", "quantitation limit"],
    def: "Smallest amount that can be reported as a number with stated precision and accuracy. It is commonly set at 10 times the blank standard deviation (about 3.3 × LOD).",
  },
  analytical_precision: {
    term: "Precision",
    alias: ["precision", "repeatability"],
    def: "How close repeated measurements of the same sample are to each other. Usually expressed as the coefficient of variation (CV = standard deviation / mean); it says nothing about closeness to the true value.",
  },
  analytical_accuracy: {
    term: "Accuracy",
    alias: ["accuracy", "recovery"],
    def: "How close a measured value is to the true value. Evaluated by recovery or relative error using reference material; a precise method can still be inaccurate if there is systematic error.",
  },
  standard_deviation: {
    term: "Standard deviation",
    def: "Measure of spread around the mean: the square root of the sum of squared deviations divided by (n − 1) for a sample.",
  },
  geometric_mean: {
    term: "Geometric mean (GM)",
    alias: ["GM"],
    def: "The n-th root of the product of n values. Workplace concentrations are often log-normally distributed, so the geometric mean is used as the typical value rather than the arithmetic mean.",
  },
  gsd: {
    term: "Geometric standard deviation (GSD)",
    def: "Exponential of the standard deviation of the log-transformed values; it describes the spread of a log-normal distribution. It is always above 1, and larger values mean more variable exposure.",
  },
  pump_calibration: {
    term: "Sampling pump calibration",
    alias: ["pump flow calibration", "soap-bubble meter"],
    def: "Measuring and setting the pump flow rate before and after sampling with the actual sampling medium in line. A primary standard such as a soap-bubble meter is used, and the sampled air volume is computed from the mean of pre- and post-sampling flows.",
  },
  sorbent_tube: {
    term: "Solid sorbent tube",
    alias: ["sorbent tube"],
    def: "Glass tube packed with a sorbent in a front and a back section; air drawn through it collects gases and vapors by adsorption. The back section is used to check for breakthrough.",
  },
  charcoal_tube: {
    term: "Activated charcoal tube",
    alias: ["charcoal tube"],
    def: "Sorbent tube packed with activated charcoal, mainly for non-polar organic solvent vapors. The collected analyte is usually desorbed with carbon disulfide and analyzed by gas chromatography.",
  },
  silica_gel_tube: {
    term: "Silica gel tube",
    alias: ["silica gel sorbent tube"],
    def: "Sorbent tube packed with silica gel, used for highly polar compounds such as amines. It also adsorbs water readily, so its capacity falls at high humidity.",
  },
  sorbent_breakthrough: {
    term: "Breakthrough (sorbent tube)",
    alias: ["breakthrough", "sorbent tube breakthrough"],
    def: "Saturation of the sorbent so that analyte passes through without being retained. If the amount found in the back section exceeds a set fraction of the front section (commonly 10 %), breakthrough is assumed and the sample is retaken.",
  },
  direct_reading: {
    term: "Direct-reading instrument",
    alias: ["direct-reading monitor"],
    def: "Instrument that samples and analyzes on site so the concentration can be read immediately. Examples are detector tubes, gas detectors and light-scattering dust monitors; used for leak checks and pre-entry testing of confined spaces.",
  },
  // ── Physical agents ──
  noise_dba: {
    term: "dB(A) (A-weighted sound level)",
    alias: ["dBA", "A-weighting", "sound pressure level"],
    def: "Sound level measured through the A-weighting network, which mimics the frequency sensitivity of the human ear. Sound pressure level is 20 times the common logarithm of the ratio to the reference pressure (20 µPa); noise exposure is assessed in dB(A).",
  },
  noise_limit: {
    term: "Noise exposure limit and exchange rate",
    alias: ["noise exposure limit", "exchange rate"],
    def: "Korea's noise exposure limit is 90 dB(A) for 8 hours, and the permitted duration halves for every 5 dB increase (5 dB exchange rate). There must be no exposure to noise above 115 dB(A).",
    law: "MOEL Notice on Exposure Limits for Chemical Substances and Physical Agents",
  },
  noise_dose: {
    term: "Noise dose (D)",
    alias: ["noise dose", "cumulative noise exposure"],
    def: "Sum over periods of actual exposure time divided by the permitted time at that level, as a percentage (D = Σ Cᵢ/Tᵢ × 100). Above 100 % the limit is exceeded; the 8-hour TWA is TWA = 16.61·log(D/100) + 90 dB(A).",
  },
  noise_work: {
    term: "Noise work",
    alias: ["intense noise work", "impulse noise work"],
    def: "Work generating noise of 85 dB or more over an 8-hour day. Higher categories, 'intense noise work' and 'impulse noise work', are defined separately and require hearing conservation measures.",
    law: "Rules on Occupational Safety and Health Standards (Korea), Article 512",
  },
  nrr: {
    term: "Noise reduction rating (NRR)",
    def: "Attenuation rating of earplugs and earmuffs determined by the US EPA method. Field attenuation is commonly estimated by derating it to (NRR − 7) × 50 % (OSHA method).",
  },
  vibration: {
    term: "Vibration",
    alias: ["whole-body vibration", "hand-arm vibration", "Raynaud's phenomenon"],
    def: "Repeated oscillation about a reference position, divided into whole-body vibration transmitted by vehicles and heavy equipment and hand-arm vibration from powered tools. Hand-arm vibration can cause Raynaud's phenomenon (vibration white finger), in which finger blood vessels constrict.",
  },
  wbgt: {
    term: "Wet-bulb globe temperature (WBGT)",
    alias: ["WBGT", "heat stress"],
    def: "Index of heat stress in hot work. Outdoors with sunlight it is 0.7 × natural wet-bulb + 0.2 × globe + 0.1 × dry-bulb temperature; indoors or outdoors without sunlight it is 0.7 × natural wet-bulb + 0.3 × globe temperature.",
  },
  illuminance: {
    term: "Illuminance",
    alias: ["lux", "lighting"],
    def: "Amount of light falling on a unit area, in lux. Required work-surface illuminance is at least 750 lux for ultra-precision work, 300 lux for precision work, 150 lux for ordinary work and 75 lux for other work.",
    law: "Rules on Occupational Safety and Health Standards (Korea), Article 8",
  },
  ionizing_radiation: {
    term: "Ionizing radiation",
    alias: ["alpha rays", "beta rays", "gamma rays", "X-rays"],
    def: "Radiation energetic enough to ionize atoms as it passes through matter: alpha, beta, gamma, X-rays, neutrons and so on. External exposure is controlled by the three principles of time, distance and shielding.",
  },
  non_ionizing_radiation: {
    term: "Non-ionizing radiation",
    alias: ["ultraviolet", "infrared", "microwave", "laser"],
    def: "Electromagnetic radiation without enough energy to ionize atoms: ultraviolet, visible, infrared, microwave, radio frequency and lasers. Typical effects are skin erythema and photokeratitis from UV, cataract from IR and heating from microwaves.",
  },
  // ── Ventilation ──
  lev: {
    term: "Local exhaust ventilation (LEV)",
    alias: ["LEV", "local exhaust"],
    def: "System that captures contaminants close to the source and discharges them outside, made up of hood → duct → air cleaner → fan → stack. Because it removes contaminants before they spread, it works with less airflow than general ventilation.",
    law: "Rules on Occupational Safety and Health Standards (Korea)",
  },
  lev_hood: {
    term: "Hood",
    alias: ["hood"],
    def: "Inlet of a local exhaust system that draws in contaminants. By shape it is classified as enclosing, capturing (exterior) or receiving; the more it encloses the source, the less airflow is needed.",
  },
  lev_hood_enclosing: {
    term: "Enclosing hood",
    alias: ["booth", "glove box"],
    def: "Hood that almost completely surrounds the source and draws air through a small opening. Booths and glove boxes belong here; it gives the best control with the lowest airflow.",
  },
  lev_hood_capturing: {
    term: "Capturing (exterior) hood",
    alias: ["exterior hood", "capturing hood"],
    def: "Hood placed outside the source that pulls contaminants in with its suction airflow. Effectiveness drops sharply with distance; for a plain opening in free space the required flow is Q = V(10X² + A), reduced to about 0.75 times with a flange (Dalla Valle equation).",
  },
  lev_hood_receiving: {
    term: "Receiving hood",
    alias: ["canopy hood", "receiving hood"],
    def: "Hood whose opening is placed in the path along which the contaminant moves by itself, such as a thermal plume or particles thrown by a rotating wheel. Examples are canopy hoods over furnaces and grinder guards.",
  },
  lev_capture_velocity: {
    term: "Capture velocity",
    alias: ["control velocity", "capture velocity"],
    def: "Minimum air velocity in front of the hood needed to draw contaminants into it. It is measured at the hood face for enclosing hoods and at the work point farthest from the face for capturing hoods; statutory values are set by contaminant state (gas or particle) and hood type.",
    law: "Rules on Occupational Safety and Health Standards (Korea)",
  },
  lev_transport_velocity: {
    term: "Transport velocity",
    alias: ["duct transport velocity", "transport velocity"],
    def: "Minimum duct velocity needed to keep captured dust airborne so that it does not settle. Heavier and stickier particles need higher values; gases and vapors can be carried at low velocity but dusts need considerably more.",
  },
  lev_static_pressure: {
    term: "Static pressure (SP)",
    alias: ["SP", "static pressure"],
    def: "Pressure acting equally in all directions regardless of air motion, pushing out on (+) or pulling in on (−) the duct wall. It is negative in ducts on the fan suction side and positive on the discharge side.",
  },
  lev_velocity_pressure: {
    term: "Velocity pressure (VP)",
    alias: ["dynamic pressure", "VP", "velocity pressure"],
    def: "Pressure due to air motion; it is always positive. VP = ρV²/2, and for standard air the velocity is V (m/s) = 4.043√VP (mmH₂O).",
  },
  lev_total_pressure: {
    term: "Total pressure (TP)",
    alias: ["TP", "total pressure"],
    def: "Sum of static and velocity pressure (TP = SP + VP). It decreases along the duct by the friction and turbulence losses.",
  },
  lev_loss_coefficient: {
    term: "Pressure loss coefficient",
    alias: ["hood entry loss coefficient", "F", "loss coefficient"],
    def: "Coefficient expressing the pressure loss in a duct or hood fitting as a multiple of velocity pressure (ΔP = F × VP). Hood static pressure is SPₕ = VP(1 + F), and F relates to the coefficient of entry Ce by F = 1/Ce² − 1.",
  },
  lev_duct: {
    term: "Duct",
    alias: ["duct", "ductwork"],
    def: "Pipe that carries air from the hood through the air cleaner and fan to the stack. Round cross-sections, short runs and few bends reduce pressure loss and dust deposits, and the diameter is chosen to maintain transport velocity.",
  },
  lev_fan_laws: {
    term: "Fan laws (similarity laws)",
    alias: ["fan laws", "affinity laws"],
    def: "For geometrically similar fans, flow is proportional to rotational speed, static pressure to its square and power to its cube. When impeller diameter changes, flow scales with the cube of diameter, pressure with the square and power with the fifth power.",
  },
  general_ventilation: {
    term: "General (dilution) ventilation",
    alias: ["dilution ventilation", "general exhaust"],
    def: "Ventilation that supplies fresh air to the whole workroom to dilute contaminant concentrations. It suits low-toxicity contaminants released in small amounts from widely spread sources; required airflow is generation rate × safety factor / allowable concentration.",
  },
  air_cleaner: {
    term: "Air cleaning device",
    alias: ["dust collector", "scrubber", "bag filter", "cyclone", "electrostatic precipitator"],
    def: "Device that removes contaminants from exhaust air. Particulates are removed by gravity, inertia, centrifugal force (cyclone), scrubbing, filtration (bag filter) or electrostatic precipitation; gases by absorption, adsorption or combustion.",
  },
  // ── Respiratory protection ──
  respirator: {
    term: "Respiratory protective equipment",
    alias: ["respirator", "RPE"],
    def: "Equipment that prevents inhalation of harmful air. It is divided into air-purifying types that filter contaminated air (particulate and gas masks) and atmosphere-supplying types that provide clean air separately (airline respirators and SCBA).",
  },
  dust_mask: {
    term: "Particulate respirator (dust mask)",
    alias: ["dust mask"],
    def: "Air-purifying mask whose filter removes particulates such as dust, mist and fume. It is graded special, class 1 and class 2 by filtration efficiency, and cannot be used in oxygen-deficient atmospheres or against gases and vapors.",
  },
  gas_mask: {
    term: "Gas mask (chemical cartridge respirator)",
    alias: ["canister", "cartridge"],
    def: "Air-purifying mask whose canister or cartridge removes toxic gases and vapors by adsorption or absorption. Canisters are color-coded by target gas (brown for organic vapors, green for ammonia, yellow for sulfur dioxide, grey for halogens, etc.) and cannot be used where oxygen is below 18 %.",
  },
  airline_respirator: {
    term: "Airline (supplied-air) respirator",
    alias: ["hose mask", "airline mask", "supplied-air respirator"],
    def: "Atmosphere-supplying respirator fed with clean outside air through a hose. Used in oxygen-deficient or highly contaminated spaces; movement is limited by the hose length.",
  },
  scba: {
    term: "Self-contained breathing apparatus (SCBA)",
    alias: ["SCBA"],
    def: "Atmosphere-supplying respirator in which the wearer carries a compressed-air cylinder and breathes from it. It allows free movement for rescue and IDLH entry, but service time is limited by cylinder capacity.",
  },
  apf: {
    term: "Assigned protection factor (APF)",
    alias: ["APF", "protection factor", "maximum use concentration"],
    def: "Minimum level of protection a class of respirator is expected to give when correctly worn. The protection factor is outside concentration / inside concentration, and the maximum use concentration is APF × exposure limit.",
  },
  fit_test: {
    term: "Fit test",
    alias: ["fit test", "qualitative fit test", "quantitative fit test"],
    def: "Test that checks whether air leaks between the wearer's face and the mask. A qualitative test relies on the wearer sensing a taste or odor agent; a quantitative test measures particle concentrations inside and outside to obtain a fit factor.",
  },
  cartridge_breakthrough: {
    term: "Cartridge breakthrough",
    alias: ["breakthrough time", "service life"],
    def: "Point at which the canister's capacity is exhausted and toxic gas starts to leak into the mask. Service time is commonly estimated as standard breakthrough time × test gas concentration / workplace concentration; if the wearer smells the gas, breakthrough has already occurred.",
  },
  // ── Confined spaces ──
  confined_space: {
    term: "Confined space",
    alias: ["confined space"],
    def: "Place designated by law where, with poor ventilation, there is a risk of oxygen deficiency, health impairment from toxic gases, or fire and explosion from flammable substances. Before work the air must be tested to confirm it is adequate air, and ventilation and an attendant must be provided.",
    law: "Rules on Occupational Safety and Health Standards (Korea), Article 618",
  },
  oxygen_deficiency: {
    term: "Oxygen deficiency",
    alias: ["oxygen deficiency sickness", "oxygen-deficient atmosphere"],
    def: "Condition in which the oxygen concentration in air is below 18 %. Symptoms from breathing such air are called oxygen deficiency sickness; at very low levels a few breaths can cause loss of consciousness.",
    law: "Rules on Occupational Safety and Health Standards (Korea), Article 618",
  },
  adequate_air: {
    term: "Adequate air",
    alias: ["safe atmosphere"],
    def: "Air with oxygen at least 18 % and below 23.5 %, carbon dioxide below 1.5 %, carbon monoxide below 30 ppm and hydrogen sulfide below 10 ppm.",
    law: "Rules on Occupational Safety and Health Standards (Korea), Article 618",
  },
  // ── Statutory substance categories ──
  hazardous_agent: {
    term: "Hazardous agent",
    alias: ["classification criteria for hazardous agents"],
    def: "Chemical substances, physical agents, organisms and the like that impair workers' health. The Minister of Employment and Labor sets the classification criteria, and these agents are the subject of exposure limits, mandatory limits, work environment measurement and special health examinations.",
    law: "Occupational Safety and Health Act (Korea), Article 104",
  },
  managed_hazardous_substance: {
    term: "Controlled hazardous substance",
    alias: ["managed hazardous substance"],
    def: "Organic compounds, metals, acids and alkalis, and gaseous substances designated by law for special control because they may cause considerable health impairment. Health measures such as equipment standards, local exhaust ventilation, protective equipment and signs apply.",
    law: "Rules on Occupational Safety and Health Standards (Korea), Article 420",
  },
  specially_managed_substance: {
    term: "Specially controlled substance",
    alias: ["CMR substance"],
    def: "Controlled hazardous substances designated separately because they can cause serious health impairment, such as carcinogens, germ cell mutagens and reproductive toxicants (category 1A or 1B). Extra measures include keeping handling records and informing workers.",
    law: "Rules on Occupational Safety and Health Standards (Korea), Article 420",
  },
  permit_substance: {
    term: "Substance requiring manufacturing permit",
    alias: ["permit-required substance"],
    def: "Substance for which no substitute has been developed and which may cause serious health impairment, so that manufacturing or using it requires a permit from the Minister of Employment and Labor.",
    law: "Occupational Safety and Health Act (Korea), Article 118",
  },
  manufacture_prohibited_substance: {
    term: "Substance prohibited from manufacture",
    alias: ["prohibited substance", "manufacture-banned substance"],
    def: "Substance recognized as especially harmful to workers, for example by causing occupational cancer, whose manufacture, import, transfer, supply and use are prohibited. Testing and research uses may be exempted with approval.",
    law: "Occupational Safety and Health Act (Korea), Article 117",
  },
  // ── Work management ──
  msd_work: {
    term: "Musculoskeletal burden work",
    alias: ["musculoskeletal burden task", "ergonomic risk factor survey"],
    def: "Work that loads the hands, arms, shoulders or back through repetition, awkward posture or forceful exertion; the notice lists 11 types. Where such work exists, a risk factor survey must be carried out periodically.",
    law: "MOEL Notice on the Scope of Musculoskeletal Burden Work and Methods of Risk Factor Surveys",
  },
  occupational_disease: {
    term: "Occupational disease",
    alias: ["work-related disease"],
    def: "Disease caused by exposure to hazardous agents at work. Under industrial accident compensation insurance, a disease is recognized as work-related when a substantial causal link between exposure and disease is established.",
    law: "Industrial Accident Compensation Insurance Act (Korea), Article 37",
  },
  control_principles: {
    term: "Principles of work environment control (substitution, isolation, ventilation)",
    alias: ["substitution", "isolation", "ventilation", "hierarchy of controls"],
    def: "Basic engineering principles for reducing workplace hazards: substitution with a less hazardous material, process or equipment; isolation by enclosing or separating the source from workers; and ventilation to remove contaminated air, supplemented afterwards by training and protective equipment.",
  },
};

Object.assign(window, { GLOSSARY_IH_EN });
