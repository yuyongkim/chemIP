// "KORA input worksheet" wording — English (KORA_SHEET_EN), same shape as KORA_SHEET_KO. The screen reads KORA_SHEET.

const KORA_SHEET_EN = {
  title: "KORA input worksheet",
  titleSub: "",
  lede: "Collects on one page the values to gather before entering an off-site impact case into the NICS tool KORA. Substance values come from ChemIP data (SDS section 9, emergency exposure guidelines, EPA guidance tables); site values are left blank.",
  disclaimer: "An unofficial reference worksheet. It is not an NICS form and has no legal standing. Compute the legal impact range with KORA and re-check substance values against the current SDS.",
  print: "Print / save PDF",
  printHint: "Choose 'Save as PDF' in the print dialog to keep a file.",
  loading: "Loading substance data…",
  made: (d) => `Made with ChemIP ${d} · chemip.yule.pics`,
  blank: "",
  sections: {
    site: "1. Site and equipment",
    substance: "2. Substance",
    storage: "3. Quantity and storage",
    scenario: "4. Release scenario",
    weather: "5. Meteorology",
    terrain: "6. Terrain and surroundings",
    checks: "7. Checks before entry",
  },
  cols: { item: "Item", value: "Value", source: "Source / note" },
  site: { name: "Site name", process: "Process / equipment (tank no.)", coords: "Source location (lat, lon)", author: "Prepared by / date" },
  substance: {
    name: "Substance", cas: "CAS number", state: "State (25 °C)", mw: "Molecular weight", bp: "Boiling point", vp: "Vapour pressure", density: "Specific gravity (density)",
    flash: "Flash point", flam: "Flammable range (LFL–UFL)", un: "UN number / transport class", hc: "Heat of combustion",
    endpoint: "Toxic endpoint (Korean order)", erpg: "ERPG-2", aegl: "AEGL-2 (10 min · 30 min · 1 h)", pac: "PAC-2", rmpEp: "US RMP toxic endpoint",
    flamEp: "Flammable endpoints", flamEpValue: "Overpressure 1 psi (6.9 kPa) · radiant heat 5 kW/m² (40 s)",
    gas: "Gas", liquid: "Liquid",
  },
  storage: { qty: "Largest quantity (one vessel or pipe)", temp: "Storage temperature", press: "Storage pressure", form: "Storage (atmospheric, pressurised, refrigerated)", dike: "Diked area", building: "Inside a building" },
  scenario: {
    kind: "Scenario", event: "Event", how: "Release mode", hole: "Hole diameter", rate: "Release rate to air", duration: "Release duration",
    pool: "Pool area", screen: "ChemIP screening distance (reference)", screenNote: "EPA RMP guidance tables — not a KORA result",
    worst: "Worst-case scenario", alt: "Alternative scenario",
  },
  weather: {
    worst: "Worst case: stability F, wind 1.5 m/s, 25 °C, 50 % humidity",
    alt: "Alternative: last year's weather at the site (Korea Meteorological Administration)",
    wind: "Mean wind speed and direction", temp: "Mean air temperature", humid: "Mean humidity", stab: "Stability class", station: "Weather station",
  },
  terrain: { topo: "Topography (rural or urban)", rough: "Surface roughness", receptors: "Nearby homes, schools, hospitals", population: "Population in the impact range (estimate)" },
  checks: [
    "Compute with the current KORA release distributed by NICS (check the version number)",
    "Substance values re-checked against the current SDS and substance data",
    "Alternative-scenario weather entered from last year's KMA data",
    "Worst-case and alternative scenarios chosen per the NICS scenario-selection guideline",
    "Results and their basis entered in the chemical accident prevention plan",
  ],
  sourceMsds: "SDS section 9",
  sourceRmp: "EPA RMP OCA guidance",
  sourceEl: "Emergency guidelines (EPA AEGL, DOE PAC)",
  sourceCalc: "This calculator's inputs",
  noValue: "no data",
};

const KORA_SHEET = langPick(KORA_SHEET_KO, KORA_SHEET_EN);

Object.assign(window, { KORA_SHEET_EN, KORA_SHEET });
