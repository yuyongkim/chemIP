// 공학 계산기 화면 공용 문구 — 영어(CALC_LABELS_EN). 모양은 calc_labels.jsx 의 CALC_LABELS_KO 와 같다(빠진 키는 한국어).
// 화면이 읽는 CALC_LABELS 는 여기서 화면 언어(lang.jsx CHEMIP_LANG)로 고른다. 영어 화면은 보조 이름(titleSub·sub)을 비운다.

const CALC_LABELS_EN = {
  title: "Engineering calculators",
  titleSub: "",
  lede: "Basic chemical and safety engineering calculations. Everything is computed in this browser, and each formula cites its source. For design or regulatory decisions, check the original references and actual site conditions.",
  navAria: "Calculator list",
  groups: {
    basic: { name: "Units & basics", sub: "" },
    safety: { name: "Safety & industrial hygiene", sub: "" },
    flammability: { name: "Flammability & inerting", sub: "" },
    release: { name: "Release, dispersion & relief", sub: "" },
    fire: { name: "Fire & explosion", sub: "" },
    chem: { name: "Chemistry & thermodynamics", sub: "" },
    thermo: { name: "Thermodynamics", sub: "" },
    fluid: { name: "Fluids & piping", sub: "" },
    heat: { name: "Heat transfer & psychrometrics", sub: "" },
    process: { name: "Vessels & reactors", sub: "" },
    reaction: { name: "Reaction & economics", sub: "" },
    separation: { name: "Separations", sub: "" },
    sizing: { name: "Equipment sizing", sub: "" },
    control: { name: "Process control", sub: "" },
    env: { name: "Environment & emissions", sub: "" },
  },
  sections: { inputs: "Inputs", results: "Results", formula: "Formula", notes: "Notes", refs: "References" },
  waiting: "Results appear once the inputs are valid.",
  prefill: (from) => (from ? `Values from the link — ${from}` : "Values from the link"),
  unitAria: (label) => `${label} unit`,
  errors: {
    required: "Enter a value",
    notNumber: "Enter a number (e.g. 0.5, 1e-3)",
    positive: (u) => `Must be greater than 0${u ? ` ${u}` : ""}`,
    min: (m, u) => `Must be at least ${m}${u ? ` ${u}` : ""}`,
    max: (m, u) => `Must be at most ${m}${u ? ` ${u}` : ""}`,
    minRows: (n) => `Enter at least ${n} row${n === 1 ? "" : "s"} with values`,
    cell: (row, col, msg) => `Row ${row}, ${col}: ${msg}`,
    failed: "Could not calculate. Check the inputs.",
    badOutput: "The result is out of numeric range. Check the inputs.",
  },
  table: { add: "Add row", remove: "Delete this row", row: (n) => `Row ${n}` },
  rowFill: {
    button: (row) => `Fill Antoine constants for row ${row}`,
    hint: "Fills Antoine constants from the substance name or CAS in the Component cell (a preset substance or an estimate from ChemIP data)",
    empty: (row) => `Row ${row}: enter a substance name or CAS in the Component cell.`,
    notFound: (row, q) => `Row ${row}: no substance found for '${q}'.`,
    noData: (row, name) => `Row ${row}: ${name} — no vapour-pressure and boiling-point data, so nothing was filled. Enter the constants yourself.`,
    preset: (row, name, tmin, tmax, err) => `Row ${row}: ${name} — constants fitted to the CoolProp saturation curve (${tmin}–${tmax} °C, max error ${err} %).`,
    fitted: (row, name, p1, t1, tb) => `Row ${row}: ${name} — estimated constants fitted through vapour pressure ${p1} kPa (${t1} °C) and boiling point ${tb} °C. Use them only between those two temperatures.`,
    failed: (row) => `Row ${row}: could not load the data. Try again shortly.`,
    propsFlash: (row, name, cas, how) => `Row ${row}: ${name} (${cas}) — flash point and molar mass from SDS Section 9. Antoine B and C ${{ preset: "fitted to the CoolProp saturation curve", fit: "estimated through one vapour-pressure point and the boiling point", kist: "estimated from the boiling point only (Kistiakowsky, large error)", none: "left blank (no data) — enter them yourself" }[how]}.`,
    propsLimits: (row, name, cas) => `Row ${row}: ${name} (${cas}) — LFL and UFL are SDS Section 9 values. Check them against the original before use.`,
    kinds: {
      flash_point: {
        button: (row) => `Fill flash point and Antoine constants for row ${row}`,
        hint: "Fills the flash point, Antoine B and C and molar mass from ChemIP data (SDS Section 9) using the name or CAS in the Substance cell",
        noData: (row, name) => `Row ${row}: ${name} — no flash point or boiling point data, so nothing was filled. Enter the values yourself.`,
      },
      flam_limits: {
        button: (row) => `Fill LFL and UFL for row ${row}`,
        hint: "Fills the LFL and UFL from ChemIP data (SDS Section 9) using the name or CAS in the Substance cell",
        noData: (row, name) => `Row ${row}: ${name} — no flammable limit data, so nothing was filled. Enter the values yourself.`,
      },
    },
  },
  fluidLink: {
    link: "Real-fluid properties & p-h chart",
    hint: "Opens the real-fluid property calculator (CoolProp) for this substance: density, enthalpy, saturation table and p-h chart.",
  },
  engine: {
    loading: (name, size) => `Downloading the ${name} engine (${size}). This happens once; afterwards it opens from the browser cache.`,
    failed: (name) => `Could not download the ${name} engine. Check the internet connection and try again.`,
    retry: "Try again",
  },
  tableOut: { title: "Result table", copy: "Copy table", copied: "Copied", csv: "Download CSV", rows: (n) => `${n} row${n === 1 ? "" : "s"}` },
  chart: { legend: "Legend", table: (n) => `Show chart data table (${n} rows)` },
  nextLinks: { title: "Continue with" },
  substanceLink: {
    link: "Calculate with this substance",
    hint: "Opens the engineering calculator (ppm ↔ mg/m³), filled with the molecular weight from MSDS section 9 when available.",
    units: "Gas flow unit converter",
    unitsHint: "Opens the engineering unit converter (Nm³/h ↔ kg/h ↔ kmol/h), filled with the molecular weight from MSDS section 9 when available.",
  },
};

const CALC_LABELS = langPick(CALC_LABELS_KO, CALC_LABELS_EN);

Object.assign(window, { CALC_LABELS_EN, CALC_LABELS });
