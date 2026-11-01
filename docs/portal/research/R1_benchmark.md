# R1 — Benchmark of chemical/process engineering portals vs ChemIP

Date: 2026-10-31. Method: WebFetch of the site home and index pages, plus WebSearch. Research only; no project files were touched.

**Limits of this research (read first)**
- I could not get keyword search-volume data, because Similarweb, Semrush and Keyword Planner are behind logins. "Demand" is therefore judged from proxies:
  - placement on a site's home page or "Popular" list;
  - how many sites offer the tool;
  - forum topic counts;
  - Korean exam-blog coverage.
- Some pages could not be read:
  - CheCalc `/calc/` and AIChE `/ccps/tools` returned 403.
  - The Neutrium home page loads its content with JavaScript, so its article list was read from search results instead.
  - Cheresources was read from its forum index (`/invision/`).
- The licences of the Neutrium npm libraries and the LearnChemE GitHub code were **not verified**. Check them before reusing any code.
- ChemIP's live page shows no menu to a non-JS fetcher. The "ChemIP has" column below comes from the task brief, not from inspecting the live UI.

---

## 1. Site × feature-category matrix

Legend: ● strong/flagship · ○ present · – absent. ChemIP column: ● built, ◐ partial, – missing.

| Category | Eng. ToolBox | CheCalc | Neutrium | ChemEnggCalc | LearnChemE | NIST WebBook | DWSIM/COCO | AIChE/CCPS | Omni | Cheresources | KOSHA/KR | **ChemIP** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Unit conversion | ● | – | ● (app + `@neutrium/quantity`) | ○ | – | ○ (unit selection) | ○ | – | ● | – | – | ◐ (ppm only) |
| Steam tables (IAPWS-IF97) | ● | ○ | ● (lib) | ● ("Popular") | ● (T-s sim) | ● | ● | – | ○ | – | – | **–** |
| Real-fluid properties (T,P tables) | ● (air, water, gases) | ○ | ○ | ○ | – | ● (SRD 69, ~70 fluids) | ● (CoolProp) | – | ○ | – | – | **–** |
| T-dependent pure-component properties | ● | ● ("Properties") | ○ | ○ | – | ● | ● | – | – | – | – | ◐ (point answer cards, Antoine) |
| Binary VLE (Txy/Pxy/xy, activity models) | – | ● (Binary VLE calc) | – | ○ | ● | – | ● | – | – | ● (forum) | – | **–** |
| Flash calculation | – | ○ | – | – | ● | – | ● | – | – | ○ | – | **–** |
| Distillation (McCabe-Thiele, FUG) | – | ● ("Distillation") | – | ● (McCabe-Thiele, Ponchon-Savarit) | ● | – | ● (ChemSep) | – | – | ● (Column Sizing threads) | blogs (화공기사) | **–** |
| Pipe dP + fittings (K/2K/3K) + Moody | ● | ● | ● (3K flagship) | ● (Moody, fittings) | ○ | – | ○ | – | ● | ○ | – | ◐ (pipe dP, sizing) |
| Control valve Cv/Kv | ○ | ○ ("Instrument") | ● (Cv/Kv/K) | – | – | – | ○ | – | ● | ○ | – | **–** |
| Orifice/flow meters | ○ | ● | ○ | – | – | – | – | – | ● | – | – | ● |
| Pumps / NPSH | ● | ● | ○ | ● | – | – | ● | – | ○ | ○ | – | ● |
| HX: LMTD / ε-NTU / U | ● | ● | ○ | ● | ● | – | ● | – | ● | ● (905 topics) | – | ◐ (LMTD, duty, Nusselt) |
| Separator / knockout drum sizing | – | ● (Horizontal separator) | – | – | – | – | ○ | – | – | ● | – | **–** |
| Tank emissions / venting | – | ● (Tank Design & Emission Loss) | ○ | – | – | – | – | – | – | ● (487 topics) | – | **–** |
| Relief devices | ○ | ○ | ○ | – | – | – | – | ○ | – | ● (2,294 topics) | – | ● (API 520) |
| Reactors (CSTR/PFR, RTD) | – | – | – | ● (12+ calcs) | ● | – | ● | – | ○ | – | – | ● (CSTR/PFR) |
| Mixing / agitation power | – | ● ("Mixing") | – | ● | – | – | – | – | – | – | – | **–** |
| Mechanical ops (settling, filtration, size reduction) | ○ | – | – | ● (17+ calcs) | ○ | – | ○ | – | ● (Stokes) | – | – | **–** |
| Combustion / flammability | ● | – | ○ | – | – | ○ (ΔHc) | – | ○ | ○ | – | – | ◐ (stoichiometric air) |
| Reactivity / runaway screening | – | – | – | – | – | – | – | ● (CRW 4.0.3, RAST/CHEF) | – | ○ | ○ | ◐ (compatibility matrix) |
| Dispersion / consequence | – | – | – | – | – | – | – | ○ | – | – | ● (화학물질안전원 KORA, free) | ● (Gaussian plume) |
| General chemistry (molar mass, dilution, balancing) | ○ | – | – | – | ○ | ○ (formula browser) | – | – | ● (10 subcategories) | – | – | ◐ (buffer pH) |
| Interactive teaching sims / quizzes | – | – | – | – | ● (290+ sims, ~194k YT subscribers) | – | – | ○ (Beacon) | – | – | blogs | **–** |
| Spectra (IR/MS/UV) | – | – | – | – | – | ● | – | – | – | – | – | **–** |
| Safety bulletins / incidents | – | – | – | – | – | – | – | ● (Process Safety Beacon, Korean edition) | – | ○ | ● (KOSHA) | ● (incident feed) |
| Forum / Q&A | – | – | – | – | – | – | ○ | – | – | ● (173,795 members) | 카페 (small) | – |
| SDS / regulations / OEL | – | – | – | – | – | – | – | – | – | – | ● | ● |
| Korean-language process calcs | – | – | – | – | – | – | – | – | – | – | **none found** | ● (unique) |

**Takeaways**
- ChemIP's moat is its regulatory and SDS data plus Korean language. No benchmarked site combines safety data with engineering calculators, and none offers Korean process calculators. A Korean search for "증기표 계산기" returned only machine-translated English spam.
- The biggest gaps are the core of a chemical-engineering degree: **thermodynamic properties (steam/fluids), VLE, flash, distillation**. Every engineering-specific site has them (CheCalc, ChemEnggCalc, LearnChemE, NIST, DWSIM), and ChemIP has none.
- DWSIM and COCO are desktop simulators (GPL v3 / freeware). There is no browser version, so they are not direct competitors. They do set expectations for which thermodynamic models users want: PR, SRK, NRTL, UNIQUAC, Wilson, UNIFAC.

---

## 2. Top 15 candidate features ChemIP lacks

Size codes: S = 1–2 days static JS; M = about a week, needs a data bundle; L = multi-week or a WASM build.
EPC overlap means overlap with EPC Workbench (wall thickness, remaining life, hoop stress, hydrotest, SIL/PFD, arc flash, steel/civil).

### 1. Steam tables (IAPWS-IF97) with an interactive T-s / Mollier chart
- **What:**
  - Saturated and superheated steam lookups by any pair (T, P, h, s); quality; flash steam.
  - Plotted on a T-s or h-s chart.
- **Who:** every undergraduate in thermodynamics; utility and steam engineers; 화공기사 and 에너지관리기사 candidates.
- **Demand evidence:**
  - ChemEnggCalc lists it as its #1 "Popular" tool.
  - Engineering ToolBox's home page features water and steam properties.
  - Neutrium ships a dedicated library for it.
  - NIST SRD 69 includes water.
  - LearnChemE has a "T-S diagram for water" sim.
  - A Korean query returned no native Korean tool.
- **Implementability:** S–M. IF97 is a published set of equations, and pure-JS implementations are small (about 30 kB).
- **Data/licence:** IAPWS releases are freely implementable. `@neutrium/thermo.eos.iapws97` exists, but its licence is unverified. Alternatively, write it from the IAPWS-IF97 paper.
- **EPC overlap:** none.

### 2. Real-fluid property tables and plots (NIST WebBook-style)
- **What:** density, Cp, Cv, h, s, viscosity, k, speed of sound and surface tension for about 120 fluids, as isotherm, isobar or saturation tables. Examples: N₂, CO₂, NH₃, refrigerants, light hydrocarbons, H₂.
- **Who:** process, refrigeration and gas engineers; students checking homework.
- **Demand evidence:**
  - NIST SRD 69 is the de facto reference.
  - Engineering ToolBox's "Air properties" and "Dry air properties" are among its most popular documents.
  - DWSIM bundles CoolProp.
- **Implementability:** M. Use the CoolProp WASM build (~2–3 MB, lazy-loaded) client-side.
- **Data/licence:**
  - CoolProp is **MIT**, and a community WASM npm package exists (`coolprop_js_npm`, MIT).
  - NIST data cannot be bulk-scraped: NIST "reserves the right to charge" and the SRD Act applies. Use CoolProp, not NIST.
- **EPC overlap:** none.
- **Synergy:** link from each ChemIP substance page to its CAS number.

### 3. Temperature-dependent property curves on substance pages
- **What:** for each ChemIP substance, plot vapour pressure, liquid density, Cp, viscosity, thermal conductivity, surface tension and ΔHvap against T. Also show Tc, Pc, ω and ΔHf.
- **Who:** process engineers sizing anything; students.
- **Demand evidence:**
  - CheCalc's "Properties" category.
  - Engineering ToolBox's top documents (water density, viscosity, thermal conductivity).
  - NIST's thermochemical and phase-change data.
- **Implementability:** M. Precompute coefficients per CAS into static JSON shards, then evaluate the correlations in the browser.
- **Data/licence:**
  - Caleb Bell's `chemicals` library (ChEDL) is **MIT** and covers more than 20,000 chemicals, keyed by CAS.
  - Some of its underlying databanks cite Perry/Yaws/DIPPR-like sources, so per-method provenance needs review. Prefer the open sources: CRC-style critical constants, VDI and Joback estimates.
- **EPC overlap:** none.
- **Synergy:** fits the existing property answer cards. Turns ChemIP's Antoine calculator into a per-substance graph.

### 4. Full engineering unit converter
- **What:** all process unit families, including:
  - Nm³/h ↔ Sm³/h ↔ kg/h (gas flow with a T/P basis);
  - barg ↔ bara;
  - cP ↔ cSt;
  - kcal/h ↔ kW;
  - BTU, °API, mesh, and others.
- **Who:** everyone, daily. The most universal tool on the web.
- **Demand evidence:**
  - Engineering ToolBox and Omni both lead with converters.
  - Neutrium's only shipped app is "Convert".
  - ChemEnggCalc also has one.
- **Implementability:** S. One unit-definition JSON plus a single component.
- **Data/licence:** own data; SI definitions are public.
- **EPC overlap:** low. EPC may already have one; if so, cross-link rather than duplicate.

### 5. Binary VLE diagrams (Txy, Pxy, xy) with activity-coefficient models
- **What:** pick two ChemIP substances and generate Txy, Pxy and xy diagrams from Raoult's law plus Antoine, or from NRTL/Wilson/UNIQUAC. Show azeotropes.
- **Who:** separations and thermodynamics students; distillation engineers.
- **Demand evidence:**
  - "Binary VLE Calculator" is the first-listed CheCalc calculator.
  - LearnChemE has many VLE sims (Txy/xy, Pxy, VLLE, azeotrope).
  - Cheresources' Simulation forum has 2,980 topics.
- **Implementability:** M. The ideal-solution case is S; activity models need a binary-parameter dataset.
- **Data/licence:**
  - Antoine data comes from #3.
  - Use UNIFAC group parameters (published, widely redistributed; check the DDBST licence for newer revisions).
  - Avoid scraping DECHEMA.
- **EPC overlap:** none.

### 6. Flash calculation (isothermal and adiabatic, multicomponent)
- **What:** Rachford-Rice with K-values from Raoult's law, Wilson's correlation or DePriester. Outputs V/F, x and y.
- **Who:** separations students; gas-plant and refinery engineers.
- **Demand evidence:**
  - LearnChemE has flash-drum and adiabatic-flash sims.
  - It is a core unit operation in DWSIM.
  - 화공기사 실기 blogs cover Raoult's and Henry's laws.
- **Implementability:** S–M. Reuses the #3/#5 data.
- **Data/licence:** same as #3.
- **EPC overlap:** none.

### 7. Distillation: McCabe-Thiele stage stepping plus Fenske-Underwood-Gilliland shortcut
- **What:**
  - An interactive xy diagram with q-line, R/Rmin, stage stepping and feed stage.
  - A FUG shortcut for multicomponent columns.
  - Optional tray/packing hydraulics later (Souders-Brown flooding).
- **Who:** every ChemE undergraduate; distillation engineers; **화공기사 실기 필답형** (a recurring topic).
- **Demand evidence:**
  - ChemEnggCalc lists McCabe-Thiele and Ponchon-Savarit as "Popular".
  - LearnChemE has McCabe-Thiele simulations and a self-study module.
  - Cheresources' most-discussed recent threads are "Column Sizing" and "Distillation Column At Vacuum Conditions".
  - The Korean exam blog sml2756.tistory.com has McCabe-Thiele posts.
- **Implementability:** S for an xy table input; M if it uses #5 VLE.
- **Data/licence:** own code.
- **EPC overlap:** none.

### 8. Fittings pressure loss (K / 2K / 3K) plus an interactive Moody chart
- **What:**
  - Add fittings and valves to the existing pipe ΔP: Crane K, Hooper 2K, Darby 3K, entrance/exit, reducers.
  - Plot the operating point on a live Moody chart.
- **Who:** process and piping engineers; fluids students.
- **Demand evidence:**
  - Neutrium's 3K-method articles are its best-known fluid-flow content.
  - ChemEnggCalc has both "Pipe & Fittings Pressure Loss" and "Moody Chart" calculators.
  - Omni has friction-factor and Darcy-Weisbach calculators.
- **Implementability:** S. 2K/3K coefficients are a small published table (Hooper 1981, Darby 2001).
- **Data/licence:** published coefficients; cite them.
- **EPC overlap:** **medium-low**. EPC does mechanical design, not hydraulics. Confirm EPC has no line-hydraulics tool before building.

### 9. Control valve sizing (Cv/Kv, liquid and gas, IEC 60534 / ISA-75 simplified)
- **What:** Cv/Kv calculation; choked flow and cavitation check (FL, xT); valve authority; Cv↔Kv↔K conversion.
- **Who:** process and instrument engineers.
- **Demand evidence:**
  - Omni has "Cv flow" and "Cv (valve flow coefficient)".
  - Neutrium has a Cv/Kv/K conversion article.
  - CheCalc has an "Instrument" category.
  - Many valve-vendor calculators exist, and InstruCalc is paid.
- **Implementability:** S–M.
- **Data/licence:** the equations are public; the IEC text itself is paywalled, so implement from public-domain derivations.
- **EPC overlap:** low. SIL/PFD covers valve reliability, not sizing.

### 10. Heat exchanger rating: ε-NTU, overall U build-up and fouling, area estimate
- **What:**
  - ε-NTU for counter-flow, parallel-flow and shell-and-tube configurations.
  - Builds U from h_i, h_o, wall and fouling resistances, using TEMA fouling factor tables.
  - Gives a required area; optionally a typical-U table by service.
- **Who:** students and process engineers.
- **Demand evidence:**
  - ChemEnggCalc has 27+ heat-transfer calculators, including ε-NTU and overall U.
  - Omni has ε-NTU.
  - Cheresources' Process Heat Transfer forum has 905 topics.
- **Implementability:** S. Extends ChemIP's existing LMTD, heat-duty and Nusselt tools.
- **Data/licence:** typical U and fouling tables are widely published (cite Perry/TEMA values).
- **EPC overlap:** none.

### 11. Gas-liquid separator / knock-out drum sizing (Souders-Brown)
- **What:** vertical and horizontal separators; K-factor with or without a mesh demister; diameter, L/D, liquid hold-up time.
- **Who:** oil and gas and petrochemical process engineers; flare-KO-drum work.
- **Demand evidence:**
  - "Horizontal Separator Sizing" is a featured CheCalc calculator.
  - The Cheresources Refining/Oil & Gas forum has 2,635 topics.
  - The GPSA Data Book is a top-discussed thread.
- **Implementability:** S–M.
- **Data/licence:** GPSA and API 12J K-values are commonly cited; quote ranges with citations rather than copying tables.
- **EPC overlap:** **medium**. EPC does vessel wall thickness. Process sizing (diameter and length) is upstream of it, so position it as a hand-off to EPC.

### 12. Storage tank emissions (US EPA AP-42 Ch. 7) plus tank breathing/venting (API 2000 / ISO 28300)
- **What:**
  - Standing and working losses for fixed-roof and floating-roof tanks.
  - Normal and emergency venting rates.
  - Optional N₂ blanketing demand.
- **Who:** environmental and EHS engineers; terminal operators; PRTR reporters.
- **Demand evidence:**
  - "Tank Design & Emission Loss" is a featured CheCalc calculator.
  - Cheresources' Tank Blanketing and Venting forum has 487 topics.
  - Korean PRTR reporting requires emission estimates.
- **Implementability:** M.
- **Data/licence:**
  - AP-42 is a US federal work (public domain).
  - Meteorological inputs per Korean city can come from KMA public data.
  - API 2000 tables are paywalled, so use the ISO/API simplified formulas with citations.
- **EPC overlap:** low.
- **Synergy:** very high with ChemIP's PRTR map and substance vapour-pressure data.

### 13. Flammability of mixtures: LFL/UFL (Le Chatelier), LOC/MOC, flash point of mixtures, inerting
- **What:**
  - Mixture flammable limits; limiting oxygen concentration; N₂ needed for inerting.
  - Flash point of liquid blends via Raoult's law plus each component's flash point.
  - A flammability-triangle plot.
- **Who:** process safety, EHS and PSM (공정안전관리) engineers; 위험물산업기사 and 산업안전기사 candidates.
- **Demand evidence:**
  - Engineering ToolBox has a top-level Combustion category.
  - CCPS publishes many free tools and resources.
  - The Korean PSM and 위험물 regimes need flash-point classification.
  - No benchmarked site combines this with SDS data.
- **Implementability:** S. ChemIP already holds LFL, UFL and flash point from SDS data.
- **Data/licence:** own SDS-derived data; the equations are public.
- **EPC overlap:** none. EPC's arc flash is electrical.

### 14. Thermal runaway / reaction hazard screening
- **What:**
  - Adiabatic temperature rise ΔTad, MTSR, and the Stoessel criticality class (1–5).
  - Rough TMRad.
  - Oxygen balance and CHETAH-style screening from a formula.
- **Who:** batch-process, pharma and fine-chemical engineers; process safety.
- **Demand evidence:**
  - The CCPS Chemical Reactivity Worksheet (v4.0.3) and RAST/CHEF are flagship free CCPS tools.
  - The Cheresources Safety forum is active.
- **Implementability:** S for the calculators. Reactivity-group data is M.
- **Data/licence:**
  - CRW data (from NOAA CAMEO) is US-government-origin. Check the CCPS redistribution terms; linking out to CRW is safer.
  - The Stoessel method is published.
- **EPC overlap:** low. SIL/PFD is downstream: the criticality class feeds LOPA. Cross-link to EPC.

### 15. Chemistry basics pack: molar mass from formula, equation balancer, molarity/dilution, limiting reagent and yield, gas stoichiometry
- **What:** Omni-style small calculators, linked to each substance's formula.
- **Who:** first- and second-year students, lab technicians, high-school level. This is the highest-traffic audience on the web.
- **Demand evidence:**
  - Omni Chemistry has 10 subcategories led by molarity, dilution, molar mass and pH.
  - These are among the most-searched chemistry calculators on the web; Omni's site structure suggests this, though it is not a measured figure.
- **Implementability:** S. A formula parser, an atomic-weights table (IUPAC, public) and a matrix-based balancer.
- **Data/licence:** IUPAC standard atomic weights (public).
- **EPC overlap:** none.

### Cross-cutting (no rank): Korean exam/learning mode
- **What:** add a "풀이 보기" (step-by-step worked solution) and an "exam mode" (화공기사 실기 필답형 style practice) to each calculator.
- **Evidence:**
  - LearnChemE's scale: 290+ simulations, ~194k YouTube subscribers, and an NSF grant.
  - Korean exam prep exists mainly as scattered Tistory blogs and paid HappyCampus reports.
  - comcbt hosts 필기 CBT banks only.
  - No Korean interactive tool was found.
- **Effort:** M per topic. This is content work.
- **Competitive edge:** very strong in Korean, where nobody does it.

**Also worth linking (no build):**
- CCPS Process Safety Beacon has a free **Korean edition** (e.g. 2021-11 Korean PDF). Link it from the incident feed.
- 화학물질안전원 KORA is the free off-site consequence tool. Link it next to the Gaussian plume calculator to show it as the official Korean tool.

---

## 3. Suggested build order (value ÷ effort)

1. Unit converter (#4)
2. Steam tables (#1)
3. Mixture flammability (#13)
4. Chemistry basics (#15)
5. Fittings + Moody (#8)
6. ε-NTU (#10)
7. T-dependent properties (#3), which unlocks #5 VLE → #6 flash → #7 McCabe-Thiele
8. Tank emissions (#12)
9. Cv (#9)
10. Separator (#11)
11. Runaway screening (#14)
12. CoolProp fluids (#2) last, because of the WASM size.

---

## 4. Sources
- Engineering ToolBox — https://www.engineeringtoolbox.com/
- Engineering ToolBox traffic (rank ~78–80k global; competitors engineersedge, eng-tips, matweb) — https://www.similarweb.com/website/engineeringtoolbox.com/competitors
- CheCalc — https://checalc.com/ · https://checalc.com/about.html (`/calc/` returned 403)
- Neutrium tools/libraries — https://neutrium.net/tools/
- Neutrium 3K method — https://neutrium.net/articles/fluid-flow/pressure-loss-from-fittings-3k-method/
- Neutrium fittings summary — https://neutrium.net/articles/fluid-flow/pressure-loss-from-fittings-in-pipe-summary/
- ChemEnggCalc — https://chemenggcalc.com/ · https://chemenggcalc.com/llms.txt · https://chemenggcalc.com/chemical-engineering-resources/
- LearnChemE simulations — https://learncheme.com/simulations/
- LearnChemE McCabe-Thiele — https://learncheme.com/quiz-yourself/interactive-modules/mccabe-thiele-diagrams/mccabe-thiele-diagrams-simulations/
- LearnChemE Txy flash demo — https://learncheme.github.io/demos/TXYandXYdiagramsForBinaryVLEinFlashDrum/index.html
- LearnChemE GitHub — https://github.com/LearnChemE
- LearnChemE 10-year / NSF article — https://www.colorado.edu/chbe/2020/09/23/learncheme-founders-celebrate-10-years-chemical-engineering-education-new-nsf-grant
- NIST Chemistry WebBook — https://webbook.nist.gov/chemistry/ · fluids: https://webbook.nist.gov/chemistry/fluid/
- DWSIM — https://dwsim.org/
- COCO / ChemSep — https://cocosimulator.org/index_support.html · https://www.wikipedia.com/wiki/COCO_simulator
- CCPS tools hub — https://ccps.aiche.org/tools (403 via fetch)
- CCPS Chemical Reactivity Worksheet — https://www.aiche.org/ccps/resources/chemical-reactivity-worksheet
- CCPS RAST/CHEF — https://ccps.aiche.org/resources/tools/risk-analysis-screening-tool-rast-and-chemical-hazard-engineering-fundamentals-chef/rast-overview
- Process Safety Beacon — https://ccps.aiche.org/process-safety-beacon · Korean edition: https://ccps.aiche.org/sites/default/files/ccps-beacon/2021/11/202111beaconkorean.pdf
- Omni Chemistry — https://www.omnicalculator.com/chemistry · Omni Physics — https://www.omnicalculator.com/physics
- Cheresources forums (173,795 members; forum topic counts) — https://www.cheresources.com/invision/
- CoolProp MIT licence — https://science.ecosyste.ms/projects/52467 · WASM package — https://www.npmjs.com/package/coolprop_js_npm
- Caleb Bell `chemicals` (MIT, 20k+ chemicals) — https://pypi.org/project/chemicals/0.1.4/
- KOSHA CHARM / KRAS — https://koreascience.kr/article/JAKO202314843206694.page?lang=ko
- 화학물질안전원 KORA (free; vs ALOHA) — https://www.kais99.org/jkais/journal/Vol18No04/Vol18No04p70.pdf
- 화공기사 실기 필답형 blog (McCabe-Thiele, Raoult/Henry) — https://sml2756.tistory.com/category/%ED%99%94%EA%B3%B5%EA%B8%B0%EC%82%AC%20%EC%8B%A4%EA%B8%B0/%ED%95%84%EB%8B%B5%ED%98%95?page=1
- comcbt / Korean CBT context — https://www.machuda.kr/blog/article/109
