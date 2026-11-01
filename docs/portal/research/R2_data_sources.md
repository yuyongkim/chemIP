# R2 — Free, redistributable engineering data sources and libraries for ChemIP

Research date: 2026-10-31. Scope: thermophysical properties, VLE, critical constants, Cp correlations,
Antoine/DIPPR-type coefficients, group contribution, reaction thermochemistry, steam/refrigerant tables.
Constraint: static JSON on Cloudflare plus in-browser computation, about 0 won, home PC off.
Mechanical integrity (wall thickness, SIL) belongs to the sibling EPC site and is out of scope.

Confidence tags: **[V]** = verified on the source page during this research. **[K]** = known from
prior knowledge or secondary sources, not re-verified today. **[?]** = could not verify; needs a check.

---

## 0. Bottom line

1. **Safe to redistribute as static JSON:** IAPWS equations (implement them yourself), CoolProp
   (MIT; EOS taken from published literature), NASA CEA `thermo.inp` (Apache-2.0, >2000 species),
   Wikidata (CC0), GRI-Mech 3.0 / Cantera NASA files, the original-UNIFAC and published Dortmund-UNIFAC
   parameters (taken from journal papers), and the Joback and Constantinou–Gani group tables (published methods).
   Also safe: the ChemSep LITE databank (Artistic License 2.0, attribution plus licence file) and the
   NIST ThermoML Archive (non-SRD NIST open licence).
2. **MIT on the code does not mean MIT on the data.** Caleb Bell's `chemicals` embeds tables from CRC, Perry's,
   Yaws, VDI Heat Atlas (PPDS), Landolt-Börnstein, NIST WebBook/JANAF (SRD) and others. The MIT licence covers
   the code only. Treat each embedded table by its own source licence. Rebuild the ChemIP dataset only from the
   "green" tables listed in §3.
3. **NIST WebBook / JANAF / REFPROP are Standard Reference Data (SRD).** They are copyrighted by the US
   Secretary of Commerce: "None of our SRD may be reproduced, stored in a retrieval system or transmitted
   … without prior permission" [V]. Link to them and do not mirror them.
4. **Korea has a database-producer right.** Under 저작권법 제93조, the producer of a database can stop others
   from reproducing or distributing all or a substantial part of it. Protection runs 5 years from production
   or update (제95조) [K]. "Facts aren't copyrightable" therefore does **not** make it safe to bulk-copy
   CRC, Perry's, Yaws or DIPPR into a Korean site. Small factual citations of single values with attribution
   are the normal low-risk practice. Bulk tables are not.
5. **KDB (Korea University).** The old `cheric.org` domain now serves an unrelated Vietnamese football
   site [V]. Do **not** link to it. The new service is `mdlkdb.com` (Hwang, Ryu, Kang, Bang, Kang,
   *Int. J. Thermophys.* 2025, 46:169). It holds 1,970 critically evaluated pure compounds and 5,567 binary
   VLE sets, plus UNIFAC / COSMO-SAC calculators [K, from abstract snippets]. No public licence or terms
   were found [?]. The best route is a **formal permission or partnership request** to Prof. Jeong Won Kang
   (Korea Univ.), which would also be a strong Korean-institution story for ChemIP.

---

## 1. Licence table

| # | Source | Licence / terms (exact) | Static-JSON redistribution? | What it has | Substances | Accuracy | Extraction | Size |
|---|---|---|---|---|---|---|---|---|
| 1 | **NIST Chemistry WebBook (SRD 69)** | SRD copyright under the Standard Reference Data Act (15 USC 290). "copyrighted by the U.S. Secretary of Commerce … All rights reserved"; no reproduction without prior permission [V] | **No** (permission needed). Deep links are OK; framing is forbidden [V] | Thermochemistry (ΔHf, S°, Shomate Cp), phase change, Antoine, IR/MS/UV, fluid properties for ~74 fluids [K] | Mostly organics plus some small inorganics, tens of thousands of species [V/K] | Evaluated, high | Per-compound HTML pages; no bulk product [V] | n/a |
| 2 | **NIST ThermoML Archive (TRC)** | Listed under `nist.gov/open/license` (non-SRD NIST data: public domain in the US, attribution requested, no warranty) [V]. Cite doi:10.18434/mds2-2422 | **Yes**, with attribution and a disclaimer | Raw experimental data from JCED, J. Chem. Thermodyn., Fluid Phase Equilib., Thermochim. Acta, Int. J. Thermophys., ~2003–2019 [V]: VLE, density, Psat, Cp, viscosity, and more | Thousands of compounds and mixtures [K] | Experimental points (not evaluated); "user must check correctness" [V] | `ThermoML.v2020-09-30.tgz` (JSON + XML) from data.nist.gov [V] | Archive several hundred MB to GB [?] |
| 3 | **NIST TRC SOURCE / TDE / REFPROP (SRD 23)** | Commercial SRD | **No** | Evaluated property engine / EOS | — | Highest | Paid | — |
| 4 | **Caleb Bell `chemicals`** | Code: **MIT** [V]. Data: varies per file (see §3) | **Partly**: only the green tables | Constants, Psat, Cp, ΔHvap, ρ, μ, k, σ, ΔHf, flash point, LFL/UFL, GWP/ODP, regulatory lists; >20,000 chemicals [V] | 20k+ | Depends on the source table | `pip install chemicals`; TSV files under `chemicals/<topic>/` [V] | Data folder ≈ 60 MB, dominated by the 42 MB PubChem identifier TSV [V] |
| 5 | **`thermo`** | **MIT** [V] | Code yes (port the algorithms) | Mixture flash (PT/PH/PS/VF), cubic EOS (PR, SRK and others), NRTL/Wilson/UNIQUAC, UNIFAC (original, Dortmund, PSRK, VTPR) [V] | Uses `chemicals` data | Engineering grade | Python; port the logic to JS, or run it in Pyodide | — |
| 6 | **`fluids`** | **MIT** [K] | Code yes | Pipe ΔP, friction factor, fittings K, orifice/valve sizing, pumps, two-phase flow, atmosphere | — | Correlations | Port to JS | — |
| 7 | **`ht`** | **MIT** [K] | Code yes | Heat-transfer correlations (Nu, boiling, condensation), HX ε-NTU / LMTD, insulation | — | Correlations | Port to JS | — |
| 8 | **CoolProp** | **MIT License**, © 2012-2018 Ian H. Bell and CoolProp developers [V]. EOS are from open literature | **Yes**, including precomputed tables | Helmholtz-EOS full properties, transport, HAPropsSI psychrometrics, incompressible brines, mixtures | **136 fluids** (132 pure + 4 pseudo-pure: R404A, R407C, R410A, R507A) [V] | Reference EOS; typically 0.1–1 % in ρ, better in Psat [K] | v8.0.0 JS build: `coolprop.wasm` 9.2 MB + `coolprop.js` 167 kB [V]. Or precompute JSON with the Python wheel | 9.4 MB raw WASM; precomputed saturation tables ≈ 1–2 MB for all fluids |
| 9 | **Cantera** | Code: **BSD-3-Clause** [V, by text structure]. `gri30.yaml` = GRI-Mech 3.0 (freely available; "see README30 for disclaimer") [V]. NASA thermo files derive from NASA | **Yes** for gri30 and NASA-derived thermo | Kinetics and equilibrium; NASA-7 polynomials; 53 species in gri30 [V] | 53 (gri30) to ~2000 (nasa_gas) | High for combustion species | YAML → JSON | gri30 ~ 0.3 MB |
| 10 | **NASA CEA (`nasa/cea`)** | **Apache-2.0** repo, which ships `data/thermo.inp`, `trans.inp` [V]. NASA/TP-2002-211556 | **Yes** (keep the NOTICE) | NASA-9 polynomials Cp, H, S, 200–20,000 K; equilibrium, adiabatic flame T | **>2000 species** (gas, liquid, solid) [V] | Evaluated (Gurvich, JANAF, ATcT updates) | Parse fixed-format `thermo.inp` → JSON | ~2 MB text [?] |
| 11 | **Burcat database (ELTE ReSpecTh mirror)** | No licence statement; page says only "Copyright © 2014 RESPETCH" [V]. Widely redistributed by MFiX and FFCM-2 [V]. Prof. Burcat died Aug 2025 [V] | **Grey**: attribute, and prefer NASA CEA | NASA-7 polynomials, ΔHf(298) with ATcT updates | ~3000 species [K] | Good | `BURCAT.THR.txt`, `THERM.DAT`, `BURCAT_THR.xml` [V] | few MB |
| 12 | **ATcT (Argonne)** | Site returned 403; no terms found [?] | **Grey**: single cited values are OK; bulk use needs a request | Best-available ΔHf(0 K, 298 K) | ~2000+ species [K] | Best available (sub-kJ/mol) | Web tables | — |
| 13 | **IAPWS releases** | Documents © IAPWS; no reuse terms stated [V]. The equations themselves are free to implement (standard practice) | **Yes**: your own implementation and generated tables | IF97 (R7-97(2012) + backward SR2–SR5), IAPWS-95 (R6-95(2018)), viscosity R12-08, conductivity R15-11, surface tension R1-76(2014), ice Ih R10-06, heavy water R16-17/R17-20/R18-21, seawater R13-08 [V] | Water, D₂O, seawater, ice | Reference standard | Implement from PDFs. Note that Python `iapws` is **GPL-3** [V], so do not copy its code | Tables ≈ 100–500 kB |
| 14 | **Yaws handbooks** (Knovel / Elsevier / William Andrew) | Commercial, all rights reserved [K] | **No** | Critical constants, Psat, Cp, ΔHf for ~7,000–20,000 compounds | — | Mixed (many estimates) | — | — |
| 15 | **DIPPR 801 (AIChE / BYU)** | Paid subscription [K] | **No** | 34 constants + 15 T-dependent correlations (EQ100–EQ124) | ~2,400 [K] | Evaluated, high | — | — |
| 16 | **DDB (DDBST)** | Free online search to check availability; Explorer/educational version contains "all free data" [V]. No redistribution licence found [?] | **No** (link only) | Pure + mixture data; free water-vapour calculator [V] | 100k+ components | Experimental | — | — |
| 17 | **DDBST published UNIFAC pages** | Parameters reproduced from journal papers (original UNIFAC: 6 refs 1979–2003; Mod. UNIFAC(Do) "2026 Published Parameters" PDF) [V]. Consortium-only revisions are excluded [V] | **Yes**: re-key from the **papers** with citations. Do not scrape the DDBST page layout | R, Q, main/subgroups, a_ij (original); a, b, c (Dortmund) | Group-based | γ within ~10–20 % typical [K] | From papers / `thermo` data tables | < 200 kB |
| 18 | **PubChem experimental properties** | NCBI places no restrictions itself; each annotation carries the depositor's licence (`LicenseNote` / `LicenseURL` in PUG-View) [K]. HSDB = public (US gov) [V] | **Per source**: keep HSDB / NOAA CAMEO / NIOSH / ILO-ICSC items with a public or open licence; drop NC/ND sources | Boiling and melting point, flash point, vapour pressure, density, solubility, autoignition, LEL/UEL, viscosity (as text) | ~10k+ with HSDB data [K] | Mixed; free-text strings need parsing | PUG-View JSON per CID | ~5–20 kB per compound |
| 19 | **Wikidata** | **CC0** [K] | **Yes** | Properties: P2101 mp, P2102 bp, P2128 flash pt, P2199 autoignition, P2202/P2203 LFL/UFL, P2054 density, P2119 vapour pressure, P2056 Cp, P3078 ΔHf°, P3071 S°, P2117 ΔHc, P2066 ΔHfus, P2116 ΔHvap, P873 phase point (critical/triple with T, P qualifiers), P1109 refractive index, P3070 dynamic viscosity, P3013 surface tension, P2177 solubility, P2993 logP, P1117 pKa, P2201 dipole [V] | Sparse: a few thousand compounds have ≥1 value [K] | Variable; each value carries a reference qualifier | SPARQL (query.wikidata.org) → JSON | < 5 MB |
| 20 | **CRC Handbook** (Taylor & Francis) | Commercial; compilation copyright; Korean DB right applies [K] | **No** bulk | Everything | ~30k | High | — | — |
| 21 | **Perry's Handbook** (McGraw-Hill) | Commercial [K] | **No** bulk. Its Section 2 coefficients are DIPPR-derived | DIPPR-form coefficients for ~345 compounds | — | High | — | — |
| 22 | **Joback & Reid (1987)** | Published method (Chem. Eng. Commun. 57, 233). Group tables are facts in a paper; implementations are MIT (`thermo.group_contribution`) | **Yes** (implement and cite) | Tb, Tm, Tc, Pc, Vc, ΔHf°, ΔGf°, Cp°(T) polynomial, ΔHvap, ΔHfus, liquid μ(T) | Any molecule expressible in its 41 groups | Tc ±~1 %, Tb ±~12 K mean, Cp ±~1–3 % [K] | Hard-code ~41 groups × 12 coefficients | ~10 kB |
| 23 | **Constantinou–Gani (1994) / Marrero–Gani (2001)** | Published methods (AIChE J 40:1697; FPE 183–184:183) | **Yes** (implement and cite) | Tb, Tm, Tc, Pc, Vc, ΔHf, ΔGf, ΔHvap, ω, Vm; 1st + 2nd order groups | Any | Better than Joback (Tc ~1 %, Tb ~1–2 %) [K] | Hard-code tables (~80 first-order + ~40 second-order groups) | ~30 kB |
| 24 | **ChemSep LITE databank** | **Artistic License 2.0** (per PhysProps.jl, which redistributes v8.14 unmodified with the licence file) [V, secondary] | **Yes**, keep the licence file and attribution | Tc, Pc, Vc, ω, Tb, ΔHf, plus DIPPR-form T-correlations (Psat, Cp, ρL, ΔHvap, μ, k, σ) | ~430–450 compounds [?] | Good (DIPPR-style) | `ChemSep8.32.xml` (3.7 MB; also embedded in `chemicals/Misc/`) [V] | ~1 MB JSON |
| 25 | **KDB (Korea Univ., mdlkdb.com)** | No public terms found [?]. JS web app | **Unknown**: ask permission | 1,970 evaluated pure compounds, 5,567 binary VLE sets, UNIFAC / COSMO-SAC, ML estimates trained on NIST/TRC [K] | 1,970 | Critically evaluated; standard-reference work in progress [K] | Web only | — |

---

## 2. Additional candidates found along the way

| Source | Licence | Why it matters |
|---|---|---|
| **NIST-modified UNIFAC** (Kang, Diky, Frenkel, *FPE* 2015) | NIST-authored paper; parameters in the article/SI [K] | A public alternative to the consortium Dortmund matrix |
| **`ugropy`** | MIT [K] | SMILES → UNIFAC / Joback group assignment. Its SMARTS patterns can be reused with **RDKit.js** (BSD) in the browser |
| **Pyodide** | MPL-2.0 | Runs pure-Python `chemicals` / `thermo` / `fluids` / `ht` in the browser (numpy and scipy available). First load ~10–20 MB; good for a "pro mode" page |
| **Clapeyron.jl / teqp (NIST, public domain) / FeOs** | MIT / PD / Apache-MIT [K] | SAFT and multiparameter EOS; mainly for offline JSON generation |

---

## 3. Dataset-by-dataset licence triage inside `chemicals` (verified file list)

Green = OK to ship as JSON with attribution. Amber = small/factual or academic-paper SI; cite it, and get permission if bulk. Red = do not ship in bulk.

| Folder / file | Origin | Verdict |
|---|---|---|
| Critical Properties/`IUPACOrganicCriticalProps.tsv` | IUPAC review papers (Ambrose et al., JCED series) | Amber → Green (journal data, cite) |
| `Appendix to PSRK Revision 4.tsv`, `PassutDanner1973`, `Mathews1972…` | Journal papers | Amber (cite) |
| `CRCCriticalOrganics.tsv` | CRC | **Red** |
| `Yaws Collection.tsv` (455 kB) | Yaws | **Red** |
| `DIPPRPinaMartines.tsv` | DIPPR-derived | **Red** |
| `fedors_Vc_predictions`, `wilson_jasperson_Tc_Pc_predictions`, `omega_Psat_Tc_predictions`, `Misc/joback_predictions.tsv` (5.8 MB) | Bell's own estimates (MIT) | **Green** |
| Vapor Pressure/`Antoine Collection Poling.tsv` (325), `Wagner Collection Poling` (104), `Antoine Extended Collection Poling` (97) | *Properties of Gases and Liquids* 5th ed. (McGraw-Hill) appendix | Amber (book appendix) |
| `Wagner Original McGarry.tsv` (245) | McGarry 1983 IEC paper | Amber → Green |
| `Landolt_antoine_V20.tsv` (~6000 liquids, 584 kB) | Landolt-Börnstein (Springer) | **Red** |
| `Table 2-8 …` (Perry's, 341) | Perry's / DIPPR | **Red** |
| `VDI PPDS …` (all folders) | VDI Heat Atlas (Springer) | **Red** |
| `Alcock_Itkin_Horrigan_*` | Can. Metall. Q. 1984 paper | Amber |
| Heat Capacity/`TRC Thermodynamics of Organic Compounds in the Gas State.tsv` (1,961 compounds) | TRC book (Frenkel 1994) | Amber/Red |
| `PolingDatabank.tsv` (308 polynomials) | Poling book | Amber |
| `Perry_Table_2-153…`, `Perrys Table 2-151…` | Perry's | **Red** |
| `CRC Standard Thermodynamic Properties…` | CRC | **Red** |
| `JANAF_1998_*.json` (≈2 MB) | NIST-JANAF (SRD 13) | **Red** (SRD). Use NASA CEA instead |
| `webbook_shomate_coefficients.json`, `Misc/webbook_constants.tsv` | NIST WebBook (SRD 69) | **Red** |
| `Zabransky.tsv` | Zabransky et al. JPCRD 1996/2001 (liquid Cp) | Amber (JPCRD is AIP/NIST) |
| Reactions/`ATcT 1.112 (g).tsv` | ATcT | Amber |
| `API TDB Albahri Hf (g).tsv`, `Yaws Hf S0 (g).tsv` | API / Yaws | **Red** |
| `JANAF_1998.tsv` | SRD | **Red** |
| Phase Change/`Bell 2018 je7b00967_si_001.tsv`, `Alibakhshi…`, `Ghazerati…` | Journal SI | Amber → Green |
| `OpenNotebook Melting Points.tsv` | Bradley open notebook, **CC0** [K] | **Green** |
| `CRC Handbook Heat of …`, `Yaws Boiling Points.tsv` | CRC / Yaws | **Red** |
| Misc/`ChemSep8.32.xml` | ChemSep, Artistic-2.0 | **Green** (ship the licence) |
| Misc/`wikidata_properties.tsv` | Wikidata CC0 | **Green** |
| Misc/`common_chemistry_data.tsv` (1.5 MB) | CAS Common Chemistry, **CC BY-NC 4.0** [K] | Amber (NC is fine for a free non-commercial site; attribution) |
| Misc/`heos_constants.tsv` | CoolProp-derived | **Green** |
| `Physical Constants of Organic/Inorganic Compounds.csv`, `CRC Handbook Organic RI.csv` | CRC | **Red** |
| Safety/`IS IEC 60079-20-1 2010.tsv`, `NFPA 497 2008.tsv` | Standards (paid) | **Red** in bulk. Single values can be cited |
| Safety/`DIPPR T_flash Serat.csv` | Serat et al. paper using DIPPR | Amber |
| Environment/`Official Global Warming Potentials 20xx` | IPCC AR4/AR5/AR6 | **Green** (IPCC reuse with citation) |
| Law/* (TSCA, DSL, EINECS, SPIN, HPV) | Government lists | **Green** |
| UNIFAC tables in `thermo` (original, Dortmund, PSRK, VTPR) | Journal-published parameters, sourced via the DDBST published pages [V] | **Green** (cite the papers) |

Practical rule: keep a `source_licence` field on every JSON record and run a CI check that refuses any record whose source is on the red list.

---

## 4. Top 10 feature ideas (ranked by value ÷ effort, all static or in-browser)

| # | Feature | Data source (green) | Compute | Payload |
|---|---|---|---|---|
| 1 | **Full property page per CAS**: Psat(T), Cp(T) (ideal gas + liquid), ΔHvap(T), ρL(T), μ(T), k(T) and σ(T) curves with uncertainty notes. Extends the existing KOSHA §9 answer cards | ChemSep LITE (Artistic-2.0) DIPPR-form coefficients + CoolProp for 136 fluids + NASA CEA for gas Cp | DIPPR EQ100/101/102/105/106/107 evaluators in JS (~150 lines) | ~2 kB per compound, lazy-loaded via `/data/props/<cas>.json` |
| 2 | **Refrigerant and fluid tables + p–h / T–s diagrams** (R-32, R-134a, R-1234yf, R-410A, NH₃, CO₂, propane …), plus a superheat/subcool calculator | CoolProp (MIT) | Precompute saturation + grid tables to JSON offline; optionally lazy-load `coolprop.wasm` (9.2 MB) for an "exact mode" | ~10–20 kB per fluid saturation table |
| 3 | **Full steam tables + psychrometric chart** (superheated/compressed grid, IAPWS-95 viscosity and conductivity, HAPropsSI humid air) | IAPWS releases (own implementation), CoolProp HAPropsSI | Extend the existing IF97 code to regions 1–5 + transport properties | < 300 kB |
| 4 | **Joback / Constantinou–Gani estimator**: user draws or enters SMILES and gets Tb, Tc, Pc, Vc, ΔHf°, ΔGf°, Cp°(T), with the group breakdown shown | Published group tables | RDKit.js (BSD, ~6 MB WASM, lazy) + SMARTS from `ugropy` (MIT); manual group entry as a no-WASM fallback | ~40 kB tables |
| 5 | **Heat of combustion / reaction calculator + adiabatic flame temperature**: user balances a reaction and gets ΔHr°(T), ΔGr°, K(T), LHV/HHV, T_ad. Valuable for the safety audience (process hazard, runaway) | NASA CEA `thermo.inp` (Apache-2.0, >2000 species) | NASA-9 polynomials; small Gibbs minimiser for T_ad with dissociation (~300 lines JS) | ~1 MB JSON (subset to ~600 common species ≈ 300 kB) |
| 6 | **Binary VLE: Txy / Pxy / xy diagrams + bubble/dew point** (modified Raoult with UNIFAC, or a user-entered NRTL/Wilson) | ChemSep Antoine/DIPPR Psat + UNIFAC (original/Dortmund) tables | Port of `thermo.unifac` γ (~200 lines) + bubble/dew iteration | ~150 kB UNIFAC tables |
| 7 | **Multicomponent isothermal flash (Rachford–Rice) + PR/SRK EOS**: phase split, K-values, Z-factor, fugacity | Tc, Pc, ω from ChemSep/IUPAC + kij (ChemSep PR kij set, Artistic-2.0) | JS cubic EOS + RR solver | small |
| 8 | **Mixture flammability**: Le Chatelier LFL/UFL, LOC estimate, flash point of mixtures (Raoult + UNIFAC), "is this solvent blend flammable at 25 °C?" | Wikidata P2202/P2203/P2128 (CC0), PubChem HSDB values (public), own UNIFAC | Combines #6 + flash-point tie-in to the KOSHA §9 cards | small |
| 9 | **Experimental data explorer**: plot measured points against the correlation for a compound; show deviation % (credibility signal) | NIST ThermoML Archive (NIST open licence, journals 2003–2019) | Offline: parse the archive, keep pure-compound Psat / ρ / Cp points per CAS | ~1–5 kB per compound after aggregation |
| 10 | **Ideal-gas thermo + equilibrium-constant tool** for common reactions (SMR, WGS, NH₃ synthesis, Claus, methanol): K(T) curves and equilibrium conversion vs T, P | NASA CEA / GRI-Mech 3.0 | Reuses #5 | reuses #5 |

Also worth doing (smaller):
- **Antoine coefficient picker.** Pre-fills the existing "Antoine with user constants" calculator from ChemSep/McGarry data. The user can still override.
- **GWP/ODP card** for refrigerants (IPCC AR6, green).
- **Unit-aware "property at T" API-like static endpoint** `/data/props/<cas>.json`, reusable by the KOSHA SDS cards.
- **Regulatory list membership** (TSCA, DSL, EINECS) from the `chemicals` Law folder (government data, green).

---

## 5. Recommended data pipeline

Offline build on a dev machine (Python) produces static JSON, which goes to Cloudflare Pages/R2, and the browser JS evaluates the correlations.

```
[sources]                         [offline build, Python, run on demand]           [static output]
CoolProp wheel (MIT)      ─┐      1. fetch / pin versions (sha256 in manifest)       /data/fluids/<name>.json
NASA CEA thermo.inp       ─┤      2. parse → normalised records                      /data/thermo/nasa9.json
ChemSep XML (Art-2.0)     ─┤         {cas, prop, eq_form, coeffs, Tmin, Tmax,        /data/props/<cas>.json
UNIFAC tables (papers)    ─┤          units, source, source_licence, citation}       /data/unifac/{orig,do}.json
Joback/CG tables (papers) ─┤      3. licence gate: drop any record whose             /data/gc/{joback,cg}.json
Wikidata SPARQL (CC0)     ─┤         source_licence ∉ allow-list (CI fails)          /data/exp/<cas>.json (ThermoML)
PubChem PUG-View (per-src)─┤      4. cross-check: compare correlation vs ThermoML     /data/manifest.json
ThermoML archive (NIST)   ─┘         points; flag > x % deviation                    /licences/ (Artistic-2.0, Apache NOTICE, …)
                                  5. emit per-CAS shards (≤ 5 kB, gzip/brotli)
                                  6. write manifest (versions, hashes, record counts)
```

Design rules:
- **One evaluator per equation form**, written in JS (DIPPR 100/101/102/104/105/106/107/114/116, Antoine, Wagner, Shomate, NASA-7/9). The data stores `eq_form` + coefficients. No per-compound code.
- **Per-CAS sharding** keeps the first paint small and matches the existing `/chemip/cas/[cas]` SEO pages.
- **Provenance in every record** (`source`, `citation`, `source_licence`, `retrieved`), shown in the UI as a footnote. This also meets the attribution duty of Artistic-2.0 / Apache-2.0 / CC-BY sources.
- **Heavy engines are lazy** (CoolProp WASM 9.2 MB, RDKit.js ~6 MB, Pyodide). Load them only on the "exact / advanced" button. Precomputed tables are the default.
- **Validity ranges are enforced** (Tmin/Tmax). Out-of-range values are shown greyed out with a warning, never silently extrapolated.
- **No SRD or commercial mirroring.** For NIST WebBook / DDB / DIPPR / KDB, show "see source" deep links only.
- Run the build manually (it does not need the home PC to be on at run time). The output is plain files, which fits the 0-won, PC-off requirement.

---

## 6. Open items to verify before shipping

1. ChemSep LITE licence. Confirm Artistic-2.0 in the official ChemSep distribution (not only PhysProps.jl) and the compound count.
2. NASA CEA `NOTICE.txt` / data directory. Confirm that the data files are covered by Apache-2.0.
3. KDB (mdlkdb.com) terms. Send a written request to the Korea Univ. KDB team.
4. ATcT terms (site returned 403 today).
5. ThermoML archive size and pure-compound coverage. Download once and count.
6. CAS Common Chemistry licence (believed CC BY-NC 4.0).
7. CoolProp WASM compressed size (9.2 MB raw; brotli expected to be much smaller; measure it).

---

## 7. Source URLs

- NIST SRD copyright (Public Law): https://www.nist.gov/srd/public-law
- NIST open licence (non-SRD data/software): https://www.nist.gov/open/license
- NIST WebBook FAQ: https://webbook.nist.gov/chemistry/faq/
- NIST ThermoML Archive (data.gov): https://catalog.data.gov/dataset/thermoml-data-archive-08162 ; landing https://data.nist.gov/od/id/ark:/88434/mds2-2422 ; web app https://trc.nist.gov/ThermoML/
- `chemicals`: https://github.com/CalebBell/chemicals (file tree: https://api.github.com/repos/CalebBell/chemicals/git/trees/master?recursive=1)
- `chemicals` vapour-pressure / heat-capacity docstrings: https://raw.githubusercontent.com/CalebBell/chemicals/master/chemicals/vapor_pressure.py , …/heat_capacity.py
- `thermo`: https://github.com/CalebBell/thermo ; UNIFAC docs https://thermo.readthedocs.io/thermo.unifac.html
- `fluids`: https://github.com/CalebBell/fluids ; `ht`: https://github.com/CalebBell/ht
- CoolProp licence: https://github.com/CoolProp/CoolProp/blob/master/LICENSE ; fluids list http://www.coolprop.org/fluid_properties/PurePseudoPure.html ; JS wrapper https://coolprop.org/coolprop/wrappers/Javascript/index.html ; v8.0.0 JS files https://sourceforge.net/projects/coolprop/files/CoolProp/8.0.0/Javascript/
- Cantera licence: https://github.com/Cantera/cantera/blob/main/License.txt ; gri30 https://raw.githubusercontent.com/Cantera/cantera/main/data/gri30.yaml
- NASA CEA: https://github.com/nasa/cea ; https://pypi.org/project/cea/ ; NASA/TP-2002-211556 https://ntrs.nasa.gov/citations/20020085330
- Burcat database mirror: https://respecth.elte.hu/burcat.php
- ATcT: https://atct.anl.gov/ (403 at research time)
- IAPWS releases: https://www.iapws.org/release.html
- Python `iapws` (GPL-3): https://github.com/jjgomera/iapws
- DDBST original UNIFAC published parameters: https://www.ddbst.com/published-parameters-unifac.html ; Mod. UNIFAC(Do): https://unifac.ddbst.com/modified-unifac.html
- DDB online search flyer: https://www.ddbst.com/files/files/ddbsp/2024/Flyer/2024%20-%20Online_Search_Flyer.pdf
- Wikidata chemistry properties: https://www.wikidata.org/wiki/Wikidata:WikiProject_Chemistry/Properties
- PubChem (licensing docs; captcha-blocked today): https://pubchem.ncbi.nlm.nih.gov/docs/licensing ; HSDB on data.gov https://catalog.data.gov/dataset/hazardous-substances-data-bank-hsdb-28053
- ChemSep data licence (secondary): https://github.com/juliacheme/PhysProps.jl
- KDB 2025 paper: https://link.springer.com/article/10.1007/s10765-025-03632-3 ; ADS https://ui.adsabs.harvard.edu/abs/2025IJT....46..169H/abstract ; new site https://www.mdlkdb.com ; KDB SRD preprint https://www.researchsquare.com/article/rs-10967322/v1 ; 2001 paper https://link.springer.com/article/10.1023/A:1010726915591
- Joback & Reid 1987, Chem. Eng. Commun. 57:233 (doi:10.1080/00986448708960487); Constantinou & Gani 1994, AIChE J 40:1697 (doi:10.1002/aic.690401011); Marrero & Gani 2001, FPE 183–184:183 (doi:10.1016/S0378-3812(01)00431-9). DOIs from memory [K]: open each one to confirm before citing.
- Kang, Diky, Frenkel 2015, NIST modified UNIFAC, FPE: https://www.researchgate.net/publication/271649337_New_modified_UNIFAC_parameters_using_critically_evaluated_phase_equilibrium_data
