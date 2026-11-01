# R4 — Process-safety and consequence-analysis calculators for ChemIP

Date: 2026-10-31. Scope: transparent, textbook-based screening calculators that run in the browser (static, no server). Excluded because the sibling EPC site already covers them: SIL/PFD, arc flash, wall thickness, remaining life.

**How the validation numbers were produced.** Each item has a validation case. Values marked **[src]** are printed in the cited source. Values marked **[calc]** I computed from the stated equations in a scratch Python script (`scratchpad/research/calc.py`). Use [calc] values as regression tests and cross-check them against the textbook before shipping. Values marked **[verify]** I could not confirm against a primary source in this session.

---

## 0. Ranked top 15 (value ÷ effort, given what ChemIP already has)

| # | Calculator | Effort | Value | Public table needed | Copyright risk |
|---|---|---|---|---|---|
| 1 | **RMP OCA worst-case and alternative endpoint distances** (toxic, 1 psi VCE, 5 kW/m² pool fire, BLEVE), plus Korean 끝점 mapping | M | Very high: the regulatory number every Korean/US site has to report | Yes. EPA OCA Exhibits B-1/B-2/C-2/C-3 factors and Reference Tables 1–30 (US gov, public domain) | None |
| 2 | **Source term: hole release** (liquid Bernoulli, gas choked/subsonic, tank draining time) | S | Very high: it feeds the existing Gaussian plume and pool tools | No (properties only) | None |
| 3 | **Toxic probit + AEGL/ERPG/PAC/TEEL lookup** (dose → % fatality; exposure → tier) | M | Very high | DOE PAC Rev 29 (public); AEGL (EPA, public) | ERPG numbers are AIHA's. Show them as values with attribution, not as a reproduced handbook |
| 4 | **VCE: TNT equivalence + TNO Multi-Energy + Baker–Strehlow–Tang** | M | High | Blast curves as fitted equations | TNT is free. TNO/BST curves are figures, so use published curve fits (Alonso et al.) and cite them |
| 5 | **BLEVE / fireball** (CCPS/Roberts) with burn probit | S | High | No | None |
| 6 | **Pool fire: point source + solid flame** (Burgess, Thomas/Mudan, Shokri–Beyler view factors) | M | High | Burning-rate table (Babrauskas/SFPE). Burgess equation fallback avoids copying it | Low (use equations, not SFPE tables verbatim) |
| 7 | **Inerting and purging** (pressure, vacuum, sweep, siphon) | S | High (daily plant use) | No | None |
| 8 | **Overpressure and thermal damage probits + damage table** | S | High (pairs with #4 and #5) | Eisenberg 1975 USCG (public) | None |
| 9 | **Dense gas: Britter–McQuaid** (continuous and instantaneous) | M | High (Cl₂, NH₃ refrigerated, LNG, HF; Gaussian is wrong for these) | B–M correlation coefficients (published) | Low. HSE CRR 17/1988 is Crown copyright, but the correlation itself is fine to implement |
| 10 | **Mixture flash point** (Le Chatelier/Liaw) + mixture LFL | S | Medium-high (extends the existing LFL/UFL tool) | Antoine constants | None |
| 11 | **LOC/MOC estimate** (z·LFL) + required inert fraction | S | Medium-high | Measured LOC table (NFPA 69 is copyrighted, so use C&L/Bureau of Mines values) | Low |
| 12 | **Jet fire** (API 521 point source / Chamberlain solid flame) | M | Medium-high | No | API 521 text is copyrighted. Hajek–Ludwig and Chamberlain equations are published papers |
| 13 | **Two-phase flow, Omega method** (Leung) | M | Medium (extends the existing API 520 relief tool) | No | API 520 Annex C is copyrighted. Implement from Leung's papers |
| 14 | **Static: charge relaxation time + MIE comparison** | S | Medium | Conductivity/MIE table | Low |
| 15 | **Runaway screening: ΔT_ad, MTSR, TMRad (zero-order), Stoessel criticality class** | S | Medium-high (batch chemists) | No | None |

Ranked lower or not recommended: dust Kst/St class lookup (S, but the useful data, GESTIS-DUST-EX, has reuse limits), LOPA arithmetic (overlaps EPC SIL/PFD, so link out instead), Dow F&EI (AIChE copyright on the Material Factor table and penalty curves, so do not build it), Mond index (ICI copyright, little used), full DEGADIS (L effort; Britter–McQuaid plus the RMP tables cover screening).

**Suggested build order.** Do #2 first: the release rate feeds the plume, B–M, the fires and the VCE. Then #1, then #3 and #8 (a shared "effects → harm" module), then #4, #5, #6, then the rest.

**Free validation oracles.** EPA **RMP*Comp** (free web tool, implements the OCA guidance exactly) for #1. NOAA **ALOHA** (free, closed source) for #2, #3, #5, #6, #9 and #12 spot checks. Worked examples in **Crowl & Louvar, *Chemical Process Safety*** (any edition) for #2, #4, #7, #10 and #11.

---

## 1. Source terms

### 1a. Liquid through a hole (Bernoulli) — Effort S
- **Equation** (Crowl & Louvar ch. 4; CCPS *Guidelines for Consequence Analysis*):
  `ṁ = C_d · A · √(2ρ(ΔP + ρ g h_L))`, with C_d = 0.61 (sharp-edged hole; 1.0 is the conservative choice).
- **EPA simplified form** (RMP OCA eq. 7-4): `QRL [lb/min] = HA[in²] · √LH[in] · LLF`, where LLF is the Liquid Leak Factor from Exhibit B-2.
- **Validation:**
  - EPA Example 21, allyl alcohol: HA = 5 in², LH = 23 in, LLF = 41 → **983 lb/min** [src].
  - Water, 25 mm hole, 5 m head, C_d 0.61 → **2.97 kg/s** [calc]. The same hole with 5 barg pad gives **9.92 kg/s** [calc].
- **Public table:** none, apart from EPA LLF values if the EPA mode is offered.
- **Copyright:** none.

### 1b. Tank draining time — Effort S
- **Equation:** vertical cylinder, atmospheric: `t = (A_t / (C_d A_h)) · √(2 h₀ / g)`. Pressurised: integrate `dh/dt = −(C_d A_h/A_t)√(2(P_g/ρ + g h))`. Horizontal cylinders and spheres need numerical integration of the area A_t(h) (C&L ch. 4).
- **Validation:** D_tank = 3 m, h₀ = 5 m, 25 mm hole, C_d 0.61 → **23,800 s ≈ 6.6 h** [calc].

### 1c. Gas through a hole (choked/subsonic) — Effort S
- **Equations** (C&L ch. 4; Yellow Book CPR14E ch. 2):
  - Choked when `P_a/P₀ ≤ (2/(k+1))^(k/(k−1))`.
  - Choked flow: `ṁ = C_d A P₀ √( (k M /(R T₀)) (2/(k+1))^((k+1)/(k−1)) )`.
  - Subsonic flow: `ṁ = C_d A P₀ √( (2M/(R T₀)) (k/(k−1)) [ (P_a/P₀)^(2/k) − (P_a/P₀)^((k+1)/k) ] )`.
  - Add tank blowdown (isothermal or adiabatic) as a time series.
- **EPA simplified form** (OCA eq. 7-1): `QR = HA · P_t · (1/√T_t) · GF`, where GF is the Gas Factor from Exhibit B-1.
- **Validation:**
  - EPA Example 19, diborane: 5 in², 30 psia, 298 K, GF 17 → **148 lb/min** [src]. My recalculation gives 147.7 [calc].
  - Methane, 10 barg, 20 °C, 10 mm hole, C_d 1 → critical ratio 0.544, **0.148 kg/s** [calc].
- **Reference code:** `fluids` (Caleb Bell, MIT license, Python) has orifice and compressible-flow functions to check against. It is not usable in-browser as is.

### 1d. Two-phase flashing release, Omega method — Effort M
- **Equations** (Leung 1986 AIChE J; Leung 1995; same form as API 520 Part I Annex C):
  - `ω = 9 (v₉/v₀ − 1)`, where v₉ is the specific volume at 0.9·P₀ (from a flash calculation). For a saturated inlet, the two-parameter ω form uses x₀, v_fg, h_fg and C_p.
  - Critical pressure ratio (API fit): `η_c = [1 + (1.0446 − 0.0093431 ω^0.5) ω^−0.56261]^(−0.70356 + 0.014685 ln ω)`.
  - Mass flux: `G = √(−2[ω ln η + (ω−1)(1−η)]) · √(P₀ρ₀) / (ω(1/η − 1) + 1)`.
- **Validation:** ω = 5, P₀ = 10 bar, ρ₀ = 500 kg/m³ → η_c = 0.790, **G ≈ 7,900 kg/m²·s** (G* = 0.353) [calc]. Check G* against Leung's published G* vs ω chart (G* ≈ 0.35 at ω = 5) [verify].
- **Copyright:** API 520 text and figures are copyrighted. The equations come from peer-reviewed Leung papers, so cite Leung.
- **Value:** extends ChemIP's existing API 520 tool to two-phase relief and liquefied-gas leaks such as propane, NH₃ and Cl₂.

---

## 2. Dense-gas dispersion

### 2a. Britter–McQuaid (B–M) workbook — Effort M
- **Source:** Britter & McQuaid, *Workbook on the Dispersion of Dense Gases*, HSE CRR 17/1988 (public PDF mirror at the NRC RAMP link below). Also reproduced in C&L ch. 5 and CCPS dispersion guidelines.
- **Method (continuous release):**
  - Reduced gravity `g₀ = g(ρ₀ − ρ_a)/ρ_a`. Source size `D = √(q₀/u)`.
  - Dense-gas criterion: `(g₀ q₀ / u³ D)^(1/3) ≥ 0.15`.
  - Continuous if `u T_d / x ≥ 2.5`; instantaneous if ≤ 0.6.
  - `α = 0.2 log₁₀(g₀² q₀ / u⁵)`. Then `β = log₁₀(x/D)`, piecewise-linear in α for each C_m/C₀. Coefficients for the band that applies to the example below (band edges must be checked in the workbook):
    - 0.1 → 0.24α + 1.88
    - 0.05 → 0.36α + 2.16
    - 0.02 → 0.45α + 2.39
    - 0.01 → 0.49α + 2.59
    - 0.005 → 0.59α + 2.80
    - 0.002 → 0.39α + 2.87
  - These coefficients are for the α ≥ −0.55 band as quoted by Farrell (2023). The workbook has separate rows for α < −0.55; transcribe all bands from the PDF [verify].
  - Instantaneous releases use a separate table with `α = 0.5 log₁₀(g₀ V₀^(1/3)/u²)`.
  - Non-isothermal correction: `C = C′/(C′ + (1 − C′)T_r/T_a)`.
- **Validation:** Burro LNG adaptation (Farrell 2023): Q = 0.23 m³/s liquid, u₁₀ = 10.9 m/s, ρ_v = 1.76 kg/m³ → α = −0.436 [calc]. The post reports **x(LFL 5 %) = 354.6 m** [src]. Also C&L Example 5-? (LNG, Burro test 8) [verify edition].
- **Reference implementation:** Farrell's blog (Julia, CC BY-SA 4.0). It is share-alike, so reimplement from the workbook rather than port the code.
- **ALOHA's approach:** ALOHA's heavy-gas model is a simplified DEGADIS. DEGADIS and SLAB are public-domain Fortran on EPA SCRAM, but porting either is effort L and not needed for screening.
- **Copyright:** HSE report is Crown copyright; implementing the correlation is fine. Cite it.
- **Value:** high. ChemIP's Gaussian plume underpredicts near-field and lateral spread for Cl₂, NH₃ (cold), HF, LNG and LPG. Add an automatic "dense gas? → use B–M" Richardson check.

---

## 3. Fires and thermal radiation

### 3a. Pool fire — Effort M
- **Burning rate:**
  - Burgess/Zabetakis: `m″ = 10⁻³ ΔH_c / (ΔH_v + c_p(T_b − T_a))` kg/m²·s (ΔH in kJ/kg).
  - Large-pool form (Babrauskas): `m″ = m″_∞(1 − e^(−kβD))`.
- **Flame height:**
  - Thomas: `H/D = 42 (m″/(ρ_a√(gD)))^0.61`.
  - With wind (Mudan/Moorhouse): `H/D = 55 (m*)^0.67 (u*)^−0.21`. Add flame tilt (AGA/Welker–Sliepcevich).
- **Emissive power (solid flame):**
  - Mudan: `E = 140 e^(−0.12D) + 20(1 − e^(−0.12D))` kW/m².
  - Shokri–Beyler: `E = 58 · 10^(−0.00823D)` kW/m².
  - View factors: Shokri–Beyler/Sparrow closed-form vertical-cylinder F_v and F_h, `F_max = √(F_v² + F_h²)`.
- **Point source:** `q = τ X_r ṁ ΔH_c / (4π R²)`, with X_r 0.15–0.35. Atmospheric transmissivity `τ = 2.02 (P_w X)^−0.09` (P_w in Pa, X in m; C&L/CCPS).
- **EPA screening** (OCA eq. 10-1): `d(5 kW/m²) = PFF · √A`. EPA Example 29, ethyl ether: A = 10,400 ft², PFF 4.3 → **440 ft** [src].
- **Validation** [calc], gasoline D = 10 m, m″ = 0.055 kg/m²·s, Q = 189 MW:
  - Thomas H = 15.8 m.
  - Point source (X_r 0.35): 13.1 / 5.8 / 2.1 kW/m² at 20 / 30 / 50 m.
  - Solid flame (Shokri–Beyler, E = 48 kW/m²): 5.3 / 2.6 / 1.0 kW/m².
  - The roughly 2× point-vs-solid gap in the near field is expected. Show both.
  - Burgess m″ for n-hexane = 0.103 kg/m²·s [calc] (measured ≈ 0.074; Burgess runs high).
- **Copyright:** the SFPE Handbook tables (m″_∞, kβ) are copyrighted. Burgess's equation needs only ΔH_c, ΔH_v, c_p and T_b, which ChemIP likely already has. A short list of m″_∞ values is factual data; cite Babrauskas (NIST/NBS reports, public).
- **Value:** high. Tank-farm and bund fires are the commonest Korean 장외영향평가 alternative scenario.

### 3b. Jet fire — Effort M
- **API 521 / Hajek–Ludwig point source:** `D = √(τ F Q / (4π K))`, with F (fraction radiated) about 0.2–0.3.
- **Flame length:** fits of the API 521 figure, e.g. `L ≈ 0.00326 (ṁ ΔH_c [W])^0.478` m [verify]. The constant and its units vary between fits by about ×2. Safer alternatives:
  - Chamberlain (1987, Trans IChemE) frustum solid-flame model.
  - Kalghatgi lift-off.
  - The Yellow Book CPR14E §6 version.
- **Validation** [calc, using the unverified fit]: Q = 100 MW gives L ≈ 21.7 m. Cross-check against ALOHA's jet fire before shipping.
- **Copyright:** API 521 is copyrighted. Hajek–Ludwig (1960) and Chamberlain (1987) are papers, so cite them.

### 3c. Fireball / BLEVE — Effort S
- **Equations** (CCPS 1994/2010 *VCE, Pressure Vessel Burst, BLEVE and Flash Fire Hazards*; C&L ch. 6; Roberts 1982):
  - `D_max = 5.8 M^(1/3)` m.
  - Duration: `t = 0.45 M^(1/3)` s for M < 30,000 kg; `t = 2.6 M^(1/6)` for larger.
  - Centre height `H = 0.75 D_max`.
  - Radiative fraction `f = 0.27 P_v^0.32` (P_v in MPa).
  - Emissive power `E = f M ΔH_c / (π D² t)`.
  - Sphere view factor `F = (D/2)² / X²`.
- **EPA:** BLEVE reference table (OCA Reference Table 30, 5 kW/m² for 40 s; Appendix D.10).
- **Validation** [calc], propane, 10,000 kg, P_v 0.85 MPa:
  - D = 125 m, t = 9.7 s, H = 94 m, f = 0.256, E = 250 kW/m².
  - Ground flux 36.7 / 13.2 / 6.2 kW/m² at 100 / 200 / 300 m.
  - Burn-death probit Y = 3.21 → **3.7 %** at 100 m. Cross-check against RMP*Comp and the Table 30 distance.
- **Value:** high, with very low effort. Add fragment and overpressure notes as text only.

### 3d. Thermal harm (shared module) — Effort S
- **Probits** (Eisenberg et al. 1975, USCG Vulnerability Model, public; tabulated in C&L Table 2-5), with I in W/m² and t in s:
  - Burn death: `Y = −14.9 + 2.56 ln(t I^(4/3) / 10⁴)`.
  - Second-degree burn: `Y = −43.14 + 3.0188 ln(t I^(4/3))`.
  - First-degree burn: `Y = −39.83 + 3.0186 ln(t I^(4/3))`.
- **Thresholds:**
  - 5 kW/m² for 40 s: RMP and Korean 끝점.
  - 4 kW/m²: pain at 20 s.
  - 12.5 kW/m²: piloted wood ignition.
  - 37.5 kW/m²: process equipment damage. This is the World Bank/HSE list, widely tabulated.

---

## 4. Explosions

### 4a. VCE: TNT equivalence — Effort S
- **Equation:** `W_TNT = η M ΔH_c / E_TNT`, with E_TNT = 4,686 kJ/kg (C&L) or 4,680 (EPA) and η = 0.01–0.10. RMP mandates 10 %.
- **Scaled distance:** `z = R / W^(1/3)`.
- **Overpressure** (Kinney & Graham fit, C&L eq. 6-25): `p_s/p_a = 1616[1 + (z/4.5)²] / √{[1 + (z/0.048)²][1 + (z/0.32)²][1 + (z/1.35)²]}`.
- **EPA form** (OCA eq. C-2): `D[mi] = 0.0081 [0.1 · W_f · (ΔH_c/4680)]^(1/3)`. EPA Example 16, propane 50,000 lb → **0.3 mi** [src]; recalculated 0.297 [calc].
- **Validation** [calc]:
  - 1 kg TNT at 30 m → 5.7 kPa.
  - 1,000 kg TNT at 100 m → 20.0 kPa.
  - 1,000 kg propane at η = 5 % → 495 kg TNT; 1 psi reached at z = 25.1 → **198 m**.

### 4b. TNO Multi-Energy (ME) — Effort M
- **Method** (van den Berg 1985; Yellow Book CPR14E ch. 5):
  - Charge energy E = 3.5 MJ/m³ × the congested volume.
  - Choose a strength class 1–10 (Kinsella or GAME correlation for the class).
  - Sachs-scaled distance `R̄ = R/(E/P_a)^(1/3)`, read `ΔP̄(R̄)` and the impulse.
- **Implementation:** use the curve-fit equations of Alonso, Ferradás et al., J. Hazard. Mater. 2006, "Characteristic overpressure–impulse–distance curves for vapour cloud explosions using the TNO Multi-Energy model". Do not digitise the figure. GAME correlation: `ΔP = 0.84 (VBR · L_P/D)^2.75 S_L^2.7 D^0.7` (Eggen 1998) [verify].
- **Copyright:** the Yellow Book was a Dutch government publication (CPR/PGS 2); official copies come via TNO. The equations and fits are citable.

### 4c. Baker–Strehlow–Tang (BST) — Effort M
- **Method** (Tang & Baker 1999, Process Saf. Prog.; Pierorazio et al. 2005 update):
  - Look up flame Mach number M_f in the 3×3×3 table (reactivity × congestion × confinement).
  - Read Sachs-scaled overpressure curves.
  - Ground reflection: E × 2.
- **Validation:** Farrell's butane example: 1/2 LFL at 165.9 m, V_PES = 0.03 x³ = 136,857 m³, E_PES = 5.08×10¹¹ J, M_f = 0.44 (medium/medium/3-D) [src].
- **Implementation:** the curves need fits (Alonso et al. 2008 J. Hazard. Mater. published BST curve fits [verify]). The M_f table (9 × 3 numbers) is published in CCPS 2010 and in the 2005 paper. As short factual data with a citation it is acceptable; note the CCPS copyright.

### 4d. Overpressure harm probits — Effort S
- **Probits** (Eisenberg 1975, public; C&L Table 2-5), p in Pa:
  - Lung haemorrhage death: `Y = −77.1 + 6.91 ln p`.
  - Eardrum rupture: `Y = −15.6 + 1.93 ln p`.
  - Structural damage: `Y = −23.8 + 2.92 ln p`.
  - Glass breakage: `Y = −18.1 + 2.79 ln p`.
- **Validation** [calc]:
  - Lung: 100 kPa → Y = 2.45 (0.5 %); 200 kPa → 7.24 (98.8 %).
  - 20 kPa → eardrum 6.9 %, structural 54.7 %.
- **Also:** a damage-estimate table (C&L Table 6-9: 1 kPa glass, 6.9 kPa / 1 psi partial house demolition, …). It is factual and also appears in EPA OCA ch. 5 (public).

---

## 5. Dose-response and exposure guidelines

### 5a. Toxic probit — Effort S (calc) / M (data)
- **Form:** `Y = a + b ln(Σ Cⁿ Δt)`, `P = Φ(Y − 5)`. Supports time-varying C from the plume or puff.
- **Constants:**
  - C&L Table 2-5 (Eisenberg/USCG, ppm, min). Examples:
    - Cl₂: −8.29, 0.92, n = 2
    - NH₃: −35.9, 1.85, n = 2
    - HCN: −29.42, 3.008, n = 1.43
    - H₂S: −31.42, 3.008, n = 1.43
    - HCl: −16.85, 2.0, n = 1
    - SO₂: −15.67, 2.10, n = 1
    - phosgene: −19.27, 3.686, n = 1
    - NO₂: −13.79, 1.4, n = 2
    - Re-key all 18 rows from the book [verify each].
  - RIVM *probitrelaties* (official Dutch, mg/m³, min, public web pages per substance). Examples:
    - chloroacetyl chloride: a = −11.8, b = 1, n = 2 [src]
    - BCl₃: −15.8, 1.46, 1.37 [src]
    - Older RIVM Cl₂: −6.35/−6.4, 0.5, 2.75; NH₃: −15.6, 1, 2 [src via Czech HZS doc; verify current]
- **Validation** [calc]:
  - Cl₂ 400 ppm × 30 min (C&L constants) → Y = 5.86 → **81 %**.
  - NH₃ 10,000 ppm × 30 min → Y ≈ 4.47 → 30 %.
- **UI:** show both constant sets side by side. Warn that they differ by orders of magnitude.

### 5b. AEGL / ERPG / PAC / TEEL lookup — Effort M (data load)
- **DOE PAC Rev 29** (May 2016; DOE-HDBK-1046-2016, reaffirmed 2022). Database "DOE PacTeel" at https://emhub1.energy.gov/pacteel. It holds about 3,100+ chemicals with PAC-1/2/3 (60-min) and the hierarchy AEGL > ERPG > TEEL.
  - It is a US federal work, so it can be reused (17 USC §105), with attribution and a "no endorsement" note.
  - This is the best single table for ChemIP. Key it by CAS.
- **AEGL:** EPA publishes the AEGL values chart (10 min, 30 min, 1 h, 4 h, 8 h; AEGL-1/2/3) as a US government work, so it is public. The NRC/NAP technical volumes are NAP copyright: link to them, do not copy.
- **ERPG:** AIHA owns the ERPG handbook. Individual ERPG values appear inside DOE PAC and NOAA CAMEO Chemicals, and numbers are facts. Show them with "Source: AIHA ERPG, via DOE PAC Rev 29" and do not reproduce AIHA documentation text.
- **Endpoint use:**
  - RMP toxic endpoint = ERPG-2, or else the EPA LOC (Appendix 68-A, public).
  - Korean 끝점 = ERPG-2, else AEGL-2 (60 min), else PAC-2. KOSHA guidance uses AEGL-2 at 10 min for releases < 7 min and 30 min for releases of 7–25 min [src: Korean paper JAKO202113855737227].
- **Value:** very high, and cheap once the CSV is in `data/`. It also improves the existing OEL comparison and plume tools (tiered contours).

---

## 6. Reactive and flammability hazards

### 6a. Mixture flash point — Effort S
- **Method:** Le Chatelier-type (Liaw et al. 2002, J. Hazard. Mater.): solve `Σ x_i γ_i P_i^sat(T) / P_i^sat(T_fp,i) = 1` for T. γ = 1 gives an ideal (Raoult) screen; UNIFAC or Wilson is an M upgrade. Non-flammable components (water) contribute only through γ.
- **Validation** [calc, ideal]: methanol/water 50/50 mol, methanol T_fp 11 °C, Antoine (8.08097, 1582.271, 239.726; mmHg, °C) → **23.6 °C**. Liaw reports a measured value of about 24 °C for 50 mol % in water [verify]; C&L also has a methanol/water example.
- **Bundle:** mixture LFL by Le Chatelier, `LFL_mix = 1/Σ(y_i/LFL_i)`. 50/50 methane/propane → 2.96 % [calc]. Note that ChemIP's stoichiometric tool may already have this.

### 6b. LOC/MOC and inert target — Effort S
- **Estimate:** `MOC ≈ z · LFL` (z = stoichiometric O₂ moles per mole fuel; C&L eq. 6-?). Prefer measured LOC tables: US Bureau of Mines Bulletins 503/627 are public; NFPA 69 annex values are copyrighted.
- **Validation:** propane z = 5, LFL 2.1 % → 10.5 % O₂ [calc] vs measured ~11.5 % (N₂) [src C&L Table 6-?/BoM]. Methane z = 2 × 5 % = 10 % vs measured 12 %.
- **Design margin:** typically LOC − 2 % (NFPA 69 rule of practice; cite as practice).
- **Output:** required N₂/CO₂ fraction; links to #6c.

### 6c. Inerting and purging — Effort S
- **Equations** (C&L ch. 7):
  - Vacuum purge: `y_j = y₀ (P_L/P_H)^j`.
  - Pressure purge: `y_j = y₀ (P_L/P_H)^j` (same form, cycles between P_H and P_L).
  - Sweep purge: `Q t = V ln((C₁ − C₀)/(C₂ − C₀))`.
  - Siphon purge: liquid-fill volume.
  - Nitrogen use per cycle: `Δn = (P_H − P_L)V/(R T)`.
- **Validation** [calc]:
  - Vacuum 760 → 20 mmHg: 21 % → 0.55 % O₂ after 1 cycle, 0.015 % after 2.
  - Pressure 0 ↔ 80 psig: 2 cycles reach 0.51 % (< 1 %).
  - Sweep, V = 10 m³, 21 % → 1 %: 30.4 m³ N₂.
  - C&L has worked examples (vacuum 1,000-gal vessel; pressure purge to 1 ppm) to use as the regression test [verify numbers].
- **Copyright:** none. High practical value.

### 6d. Static electricity: charge relaxation and MIE — Effort S
- **Relaxation time:** `τ = ε₀ ε_r / κ`.
  - Conductivity bands: < 50 pS/m non-conductive, 50–10⁴ semi, > 10⁴ conductive (IEC/TS 60079-32-1 and NFPA 77 bands; the numbers are factual).
  - Stored-energy spark: `W = ½ C V²`, compared with MIE (e.g. propane 0.25 mJ, H₂ 0.017 mJ).
  - Line velocity limit: `v·d ≤ 0.5 m²/s` (IEC practice).
- **Validation** [calc]: ε_r = 2, κ = 1 pS/m → τ = 17.7 s; 0.1 pS/m → 177 s.
  - A person at C = 200 pF, 10 kV → 10 mJ ≫ MIE.
- **Data:** MIE and conductivity values from public sources (Bureau of Mines, NFPA 77 is copyrighted, so use the BoM/Babrauskas lists).

### 6e. Runaway screening (ΔT_ad, MTSR, TMRad) — Effort S
- **Equations** (Stoessel, *Thermal Safety of Chemical Processes*, 2008; Townsend & Tou 1980; Keller et al. 1997 TCA 289:1):
  - `ΔT_ad = (−ΔH_r) x / c_p`.
  - `MTSR = T_p + X_ac ΔT_ad`.
  - Zero-order TMRad: `TMR_ad = c_p R T₀² / (q₀ E_a)`.
  - T_D24 by solving `TMR_ad(T) = 24 h` with Arrhenius extrapolation from DSC q₀(T_ref). Use E_a = 50 kJ/mol conservative if unknown (Keller).
  - Stoessel criticality classes 1–5 compare T_p, MTSR, MTT and T_D24.
- **Validation** [calc]:
  - 200 kJ/kg, 30 % accumulation, c_p 2 kJ/kg·K → ΔT_ad(accum) = 30 K.
  - T₀ 100 °C, q₀ 10 W/kg, E_a 75 kJ/mol → TMR_ad = 0.86 h.
  - Stoessel's book has worked examples [verify].
- **Copyright:** equations only. Value: high for batch/fine-chem SMEs (fits ChemIP's SME audience).

---

## 7. Analysis methods (screen or skip)

| Method | Recommendation | Notes |
|---|---|---|
| Dust Kst / St class | S. Include as a converter plus class lookup | Cube-root law `K_St = (dP/dt)_max V^(1/3)`. St0 = 0, St1 0–200, St2 200–300, St3 > 300 bar·m/s (ISO 6184-1/VDI 2263). Venting area (NFPA 68 / EN 14491) is copyrighted, so skip it. The data source GESTIS-DUST-EX (IFA) is free to view; bulk reuse needs permission |
| LOPA arithmetic | Skip; link to EPC | `f_mitigated = f_IE × Π PFD_i` is trivial but duplicates EPC SIL/PFD. At most a 5-line widget that hands off to EPC |
| Dow F&EI (7th ed., AIChE 1994) | **Do not build** | The Material Factor table, penalty curves and damage-factor charts are AIChE-copyrighted; a faithful calculator reproduces them. A generic "F&EI-style" index would mislead |
| Mond index (ICI 1985) | Skip | Copyrighted, little used, same issue |

---

## 8. Siting and planning: RMP OCA and Korean 장외영향평가

### 8a. EPA RMP Offsite Consequence Analysis Guidance — Effort M, Value very high
- **Source:** EPA, *Risk Management Program Guidance for Offsite Consequence Analysis*, March 2009 (550-B-99-009). It is a US government work, public domain.
- **Worst-case conditions:** F stability, 1.5 m/s, 25 °C, 50 % RH. The toxic gas releases its total quantity over 10 min (`QR = QS/10`); a passive building enclosure counts as 55 % (×0.55).
- **Liquid pools:**
  - 1 cm depth: `A = QS × DF`.
  - Evaporation: `QR = QS × 1.4 × LFA × DF` (ambient) or LFB (boiling). The factor 1.4 = 1.5^0.78 for wind.
  - Diked: `QR = 1.4 × LFA × A_dike`.
  - Temperature correction factor TCF for 25–50 °C.
- **Distances:** generic Reference Tables 1–12 (neutral/dense × rural/urban × 10 min/60 min, rate/endpoint), plus chemical-specific ammonia/chlorine/SO₂ tables.
- **Flammables:**
  - VCE: 10 % yield, `D = 0.0081[0.1 W (ΔH_c/4680)]^(1/3)` mi (eq. C-2). Reference Table 13.
  - Pool fire: `d = PFF √A`.
  - BLEVE: Table 30, 5 kW/m² for 40 s.
- **Alternative scenarios:** D stability, 3 m/s. Gas from a hole: eq. 7-1 with GF. Liquid from a hole: eq. 7-4 with LLF.
- **Validation (all [src] from the guidance):**

  | Example | Inputs | Result |
  |---|---|---|
  | 1, diborane | 2,500 lb over 10 min | 250 lb/min |
  | 5, acrylonitrile | 20,000 lb × 1.4 × 0.11 × 0.61 | 1,880 lb/min, 11 min |
  | 16, propane | 50,000 lb | 0.3 mi to 1 psi |
  | 19, diborane | hole release | 148 lb/min |
  | 21, allyl alcohol | hole release | 983 lb/min |
  | 29, ethyl ether pool fire | — | 440 ft |

  RMP*Comp reproduces all of them, so use it for regression.
- **Data needed:** Exhibits B-1 (toxic gases: GF, LFB, DF, vapour pressure), B-2 (toxic liquids: LFA, LFB, DF, LLF), B-3 (aqueous solutions), B-4 (TCF), C-1…C-3 (flammables: ΔH_c, PFF, LFB), and Reference Tables 1–30. That is about 77 toxic and 63 flammable substances. All are public domain. Transcribe them once into `data/rmp_oca/*.json` from the PDF; my pdftotext extraction worked (6,508 lines).
- **Effort:** M (mostly data entry plus table interpolation). The math is trivial.

### 8b. Korean 장외영향평가 → 화학사고예방관리계획서 (화학물질관리법 제23조; merged with the 위해관리계획서 from 2021)
- **Endpoints (끝점)** [src: Korean papers citing the NICS technical guideline]:
  - Toxic: ERPG-2. If none, AEGL-2 (60 min). If none, PAC-2.
  - Overpressure: 1 psi (6.9 kPa).
  - Radiant heat: 5 kW/m² for 40 s.
  - These are the same as RMP, so the ChemIP calculator can serve both with a KR/US label switch.
- **Scenarios:** 최악의 사고시나리오 (worst case) and 대안의 사고시나리오 (alternative), as in the NICS 「사고시나리오 선정에 관한 기술지침」 (2014 onward). Worst-case weather follows RMP (F, 1.5 m/s) [verify the current 고시 text, e.g. 「화학사고예방관리계획서 작성 등에 관한 규정」, on law.go.kr].
- **Official tool:** NICS **KORA** (Korea Off-site Risk Assessment supporting tool, free since 2014). Studies report KORA distances are smaller than ALOHA's and insensitive to season. ChemIP can position itself as a transparent pre-screen that shows KORA-equivalent inputs; it should not claim to be the official tool.
- **Copyright:** Korean government 고시 and 기술지침 are public works (저작권법 제7조), so the endpoint values and rules are free to use. KORA software itself must not be copied.
- **Value:** very high for Korean SMEs. Pair it with the existing NICS incident feed.

---

## 9. Licensing summary

| Source | Status | Use in ChemIP |
|---|---|---|
| EPA RMP OCA Guidance + Exhibits + Reference Tables | US federal, public domain | Copy the tables into JSON with a citation |
| DOE PAC Rev 29 (PacTeel) | US federal | Copy the values with attribution |
| EPA AEGL values chart | US federal | Copy the values; link the NAP volumes |
| AIHA ERPG | AIHA copyright on the handbook | Values only, via DOE PAC, attributed |
| Eisenberg 1975 USCG probits | US federal report | Copy |
| RIVM probitrelaties | Dutch government, public web | Copy the values with a citation |
| Korean 고시 / NICS 기술지침 | Public works (저작권법 제7조) | Copy the rules |
| Crowl & Louvar, CCPS books, SFPE Handbook, Yellow Book | Copyright on text and figures | Implement the equations, cite them, do not copy figures or tables wholesale; use published curve fits |
| API 520/521, NFPA 68/69/77 | Copyright | Use the peer-reviewed originals (Leung, Hajek–Ludwig, Chamberlain) |
| Dow F&EI, Mond | Copyright on the method tables | Do not implement |
| Farrell blog code | CC BY-SA 4.0 (share-alike) | Use as a validation reference only; do not port the code |
| `fluids` / CoolProp | MIT | Validation reference |

## 10. Implementation notes for ChemIP's static React

- One file per calculator under `frontend/public/chemip/`, e.g. `calc_source_hole.jsx`, `calc_bm_dense.jsx`, `calc_fireball.jsx`.
- Shared pure-function modules:
  - `harm_probit.js`: toxic, thermal and overpressure probits plus Φ.
  - `atm_transmissivity.js`.
  - `blast_curves.js`: Kinney–Graham, ME fits, BST fits.
- Data in `data/` JSON: `pac_rev29.json`, `rmp_oca_exhibits.json`, `rmp_ref_tables.json`, `probit_constants.json` (with a source column: C&L or RIVM), `loc_table.json`.
- Register each calculator as one line in the calculator list, per the project rule.
- Each tool shows its equation, its source citation, the validation example as a "load example" button, and a "screening only — not a substitute for KORA/ALOHA/PHAST" banner.

## Sources

- EPA RMP OCA Guidance (2009): https://www.epa.gov/rmp/rmp-guidance-offsite-consequence-analysis — PDF https://www.epa.gov/sites/production/files/2013-11/documents/oca-chps.pdf
- EPA, why ERPG-2 was chosen as the toxic endpoint: https://epa.gov/rmp/why-were-erpg-2-values-selected-toxic-endpoints-instead-erpg-3
- DOE PAC Rev 29: https://www.energy.gov/ehss/protective-action-criteria-pac-aegls-erpgs-teels-rev-29-chemicals-concern-may-2016 ; database https://emhub1.energy.gov/pacteel ; definitions https://edms3.energy.gov/pac/TeelDef
- PAC overview: https://en.wikipedia.org/wiki/Protective_Action_Criteria
- NOAA ERPG page: https://response.restoration.noaa.gov/erpgs
- NAP AEGL volumes (copyright NAP): https://nap.nationalacademies.org/catalog/13374/acute-exposure-guideline-levels-for-selected-airborne-chemicals-volume-11
- RIVM probit relations: https://www.rivm.nl/probitrelaties/chlooracetylchloride ; https://www.rivm.nl/probitrelaties/boortrichloride ; Czech HZS compilation https://hzscr.gov.cz/soubor/probit-funkce-prilohy-dlabka-pdf.aspx
- Britter & McQuaid workbook (HSE CRR 17/1988) mirror: https://ramp.nrc-gateway.gov/filebrowser/download/3946
- Farrell, B–M and VCE worked examples (CC BY-SA 4.0): https://aefarrell.github.io/posts/Britter-McQuaid/index.html ; https://aefarrell.github.io/posts/vapour_cloud_explosion_example/index.html
- Thorney Island data (ADMLC): https://admlc.com/thorney-island/
- Shokri–Beyler / pool-fire model comparisons: https://www.scribd.com/document/614405204/2011-d2-05-Fleury-Paper ; https://iris.unige.it/handle/11567/252433 ; https://mdpi-res.com/d_attachment/fire/fire-09-00193/article_deploy/fire-09-00193.pdf
- API 521 flame-length fits (uncertain constants): https://www.eng-tips.com/viewthread.cfm?qid=482802 ; https://www.tceq.texas.gov/assets/public/permitting/air/memos/flareparameters.pdf ; https://www.cheresources.com/invision/topic/6115-flame-length-calculation
- Dow F&EI (AIChE, copyright): https://www.aiche.org/publications/books/dows-fire-explosion-index-hazard-classification-guide-7th-edition
- Korean 장외영향평가 endpoints, KORA, scenarios: https://koreascience.kr/article/JAKO202113855737227.pdf ; https://koreascience.kr/article/JAKO201813639173481.pdf ; https://koreascience.kr/article/JAKO201718155359710.pdf ; https://koreascience.kr/article/JAKO201819757622772.pdf ; https://scholar.korea.ac.kr/handle/2021.sw.korea/73861?mode=full
- EPA SCRAM (DEGADIS/SLAB public-domain codes, screening models): https://gaftp.epa.gov/aqmg/SCRAM/models/screening/tscreen/tscrd.pdf
- Textbooks (not online, cited for equations): Crowl & Louvar, *Chemical Process Safety* (3rd/4th ed.); CCPS *Guidelines for Consequence Analysis of Chemical Releases* (1999); CCPS *Guidelines for VCE, PV Burst, BLEVE and Flash Fire Hazards* (2010); TNO Yellow Book CPR 14E (1997/2005); Stoessel, *Thermal Safety of Chemical Processes* (2008); Leung, AIChE J 32:1743 (1986); Eisenberg et al., USCG Vulnerability Model CG-D-136-75 (1975); Alonso et al., J Hazard Mater 137:734 (2006); Tang & Baker, Process Saf Prog 18:235 (1999); Liaw et al., J Hazard Mater A95:49 (2002); Keller et al., Thermochim Acta 289:1 (1997).
