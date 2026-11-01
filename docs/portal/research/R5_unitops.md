# R5 — Unit operations, process design and control tools for ChemIP

Date: 2026-10-31. Scope: static, in-browser calculators for undergraduates and practising process engineers. Mechanical integrity is out of scope (the sibling EPC site covers it).

## 0. What ChemIP already has (checked in the repo, read only)

`frontend/public/chemip/calc_*.jsx` holds about 30 calculators. Besides the list in the brief, there are also `calc_stoich_air` (stoichiometric air, Cst, LFL/UFL/LOC), `calc_relief_valve` (API 520 + API 526 orifice letter), `calc_evaporation`, `calc_gaussian_plume`, `calc_ventilation`, `calc_mix_lfl`, `calc_mix_exposure`, `calc_twa8h` and `calc_ppm_mgm3`.

What this means for the new tools:
- Each calculator is a pure data + `compute()` object (`calc_registry.jsx`: inputs/outputs/formula/notes/reference). Test vectors live in `frontend/scripts/tests/test_calculators.cjs`. Put every validation example below in that file as a test vector.
- **No calculator draws a chart today.** None of the `calc_*.jsx` files contains SVG. The highest-leverage piece of shared infrastructure is a small SVG chart module, for example `calc_chart.jsx`: x–y lines, a staircase, markers and a draggable point, with colours from `tokens.css`. The registry entry would get an optional `chart(values, result)` that returns series data. McCabe–Thiele, the pump/system curve, the PID step response, the T–X adiabatic line, the ε–NTU curves and Arrhenius all depend on it. Build it once (effort M); after that each chart tool is S–M.
- `calc_substance_link.jsx` already pre-fills ppm↔mg/m³ from the MSDS section 9 molar mass. The same `calcSubstanceHref` pattern extends to the substance pairings in §3.
- Combustion: `calc_stoich_air` already covers the air requirement. A flue-gas analysis tool would extend it (excess air ↔ O2/CO2 in flue gas, dew point). Do not duplicate it.

## 1. Ranked top 15

Ranking weighs (a) how often undergraduates and plant engineers need it, (b) how badly existing free web tools serve it, (c) chart or teaching value, (d) effort, and (e) synergy with ChemIP substance data.

| # | Tool | Effort | Why |
|---|---|---|---|
| 1 | **SVG chart module** (infrastructure) | M | Unlocks #2, #4, #5, #9, #11 and #13 |
| 2 | **Binary McCabe–Thiele** (interactive) | M | The best-known ChemE teaching graph. Constant α, or Raoult with Antoine from ChemIP |
| 3 | **Bubble / dew point + Rachford–Rice flash** (Raoult or Wilson K) | M | Directly uses ChemIP Antoine / Tc / Pc / ω. No good free Korean tool exists |
| 4 | **PID tuning + FOPDT closed-loop simulator** (ZN, Cohen–Coon, IMC, SIMC) | M | Control has almost no free bilingual tool. Fully in-browser |
| 5 | **Pump curve vs system curve operating point + affinity laws** | S–M | Daily plant task. Merges "fan/pump affinity" into one tool |
| 6 | **Control valve sizing, IEC 60534-2-1 (liquid and gas)** | M | High practitioner value. Validated test vectors are available (fluids library) |
| 7 | **Fenske–Underwood–Gilliland shortcut distillation** | S | Small, classic, pairs with #2/#3 |
| 8 | **Compressor power (isentropic / polytropic, multistage + intercooling)** | S | Pairs with ChemIP MW / Cp and the existing Pitzer Z |
| 9 | **Heat exchanger ε-NTU (rating and sizing) + shell-and-tube quick sizing** | M | Extends the existing LMTD with the F-correction and a U table |
| 10 | **Economics pack: six-tenths rule + user-entered cost index, NPV/IRR/payback, utility cost** | S–M | Plant engineers use it constantly. Workaround for the paywalled CEPCI below |
| 11 | **Batch reactor / reactors in series / Arrhenius fit** | S | Extends `calc_reactor`. The Arrhenius plot is a regression chart |
| 12 | **Kremser absorption / stripping / dilute extraction** | S | One formula covers three operations |
| 13 | **Adiabatic reactor energy-balance line (T–X) + equilibrium curve** | M | Classic Fogler figure. Uses ChemIP Cp / ΔHf when available |
| 14 | **Flue gas analysis** (extends `calc_stoich_air`) | S | Excess air from O2 %, flue composition, efficiency |
| 15 | **Tank breathing / working losses (AP-42 §7.1, fixed roof)** | M–L | US EPA, so public domain. Uses ChemIP vapor pressure and MW. Crosses into ChemIP's environmental side |

Lower priority or deferred: two-phase line sizing (#16), condensation/boiling coefficients (#17), membrane gas permeation (#18), Hunter–Nash extraction (L), P&ID symbol reference (licence risk, §2.18), PFD drawing tool (L, low value per effort).

---

## 2. Tool cards

Unless another source is given, numeric examples were computed by hand from the stated formula. Before shipping, cross-check them against a textbook or the Caleb Bell libraries (`fluids`, `ht`, `thermo`, `chemicals`; MIT-licensed Python, extensively cited, and usable offline as a reference oracle). The libraries are for generating test vectors only. ChemIP itself stays pure JS.

### 2.1 Binary McCabe–Thiele (rank 2)
- **Method:** equilibrium curve y = αx/(1+(α−1)x), or Raoult with Antoine at column P (non-constant α). Rectifying line y = R/(R+1)·x + xD/(R+1). q-line y = q/(q−1)·x − xF/(q−1). The stripping line runs through (xB, xB) and the intersection point. Step off stages from the top; the optimal feed stage is where the step crosses the intersection. Show Rmin (q-line pinch), Nmin (total reflux) and an optional Murphree efficiency (pseudo-equilibrium curve).
- **Textbooks:** McCabe, Smith & Harriott *Unit Operations* ch. 21; Geankoplis *Transport Processes* §11.4; Wankat *Separation Process Engineering* ch. 4; Seader, Henley & Roper ch. 7.
- **Validation:**
  - Constant α = 2.5, xF = 0.5, q = 1, xD = 0.95, xB = 0.05. Total reflux must step to about 6.43 stages (matches Fenske, §2.7). Rmin = 1.10 (Underwood formula for a saturated-liquid binary feed).
  - Geankoplis Ex. 11.4-1 (benzene–toluene). A FOSSEE Python port of the chapter reports 7.5 equilibrium stages including the reboiler and feed stage 5. Check the book's exact xF and R before using it as a test vector.
- **UI:** square SVG x–y plot with drag handles for xD, xB, xF; sliders for R (as a multiple of Rmin) and q. The staircase animates live. A side panel shows N, feed stage, Rmin and Nmin. A "substance pair" mode picks two ChemIP substances, pulls Antoine constants and builds the curve at a chosen P. Warn when the pair is likely non-ideal (e.g. ethanol–water azeotrope), because ChemIP has no activity coefficients.
- **Data / licence:** none beyond Antoine. LearnChemE's equivalent is CC BY-SA 4.0 per its site footer, but its Wolfram version is listed as NC-SA. Do not copy it; write from scratch.

### 2.2 Bubble / dew point + Rachford–Rice isothermal flash (rank 3)
- **Method:**
  - Bubble T: solve Σ xi·Ki(T,P) = 1. Dew T: solve Σ yi/Ki = 1 (Brent or bisection on T).
  - Flash: Rachford–Rice f(β) = Σ zi(Ki−1)/(1+β(Ki−1)) = 0, with β bracketed in (1/(1−Kmax), 1/(1−Kmin)). Use Newton with bisection fallback. Then xi = zi/(1+β(Ki−1)) and yi = Ki·xi.
  - K options: (1) Raoult Ki = Pi_sat(T)/P with Antoine; (2) Wilson correlation Ki = (Pc,i/P)·exp[5.373(1+ωi)(1−Tc,i/T)], which needs only Tc, Pc and ω (good for light hydrocarbons); (3) user-entered K table (DePriester).
- **Textbooks:** Seader, Henley & Roper ch. 4 (the Rachford–Rice derivation and bracketing); Wankat ch. 2–3; Smith, Van Ness & Abbott ch. 10 (bubble/dew with Raoult).
- **Validation:**
  - Rachford–Rice: z = (0.3, 0.3, 0.4), K = (2.0, 1.0, 0.5) gives the closed-form root β = V/F = 0.1/0.35 = **0.2857**.
  - Bubble point: benzene–toluene, x = 0.5/0.5 at 760 mmHg. Antoine (mmHg, °C): benzene 6.90565 / 1211.033 / 220.79; toluene 6.95464 / 1344.8 / 219.482. At T = 92.0 °C, P_B ≈ 1081 and P_T ≈ 434 mmHg, so ΣxP ≈ 757 mmHg. Expect a bubble T of about **92.1 °C** (Smith, Van Ness & Abbott Ex. 10.1 style; cross-check with `thermo` or `chemicals`).
- **UI:** mixture table (the existing `type: "table"` input) with a "fill from ChemIP" button per row. The output table gives x, y and K. A mini T–xy diagram for binaries reuses the chart module.
- **Data / licence:** Antoine constants (already a calculator; check where ChemIP gets them — NIST WebBook data is US-government public; Yaws is copyrighted). Tc, Pc and ω are factual constants, available from PubChem/NIST or the MIT-licensed `chemicals` package tables (check the provenance of each table).

### 2.3 PID tuning + FOPDT step and closed-loop simulator (rank 4)
- **Method:** FOPDT model G = K·e^(−θs)/(τs+1). Tuning rules:
  - **ZN reaction curve:** PID Kc = 1.2τ/(Kθ), τI = 2θ, τD = 0.5θ. PI: 0.9τ/(Kθ), τI = 3.33θ.
  - **ZN ultimate:** PID Kc = 0.6Ku, τI = Pu/2, τD = Pu/8.
  - **Cohen–Coon PI:** Kc = (τ/Kθ)(0.9 + θ/12τ), τI = θ(30+3θ/τ)/(9+20θ/τ).
  - **IMC/λ PI:** Kc = τ/(K(λ+θ)), τI = τ.
  - **SIMC (Skogestad 2003):** Kc = (1/K)·τ/(τc+θ), τI = min(τ, 4(τc+θ)). Default τc = θ; a smoother setting uses τc > θ.

  Simulation: discrete time (dt ≈ min(τ, θ)/50) with a dead-time ring buffer, ideal or ISA-form PID, derivative filter, output limits and anti-windup. Run setpoint and load steps. Metrics: IAE, overshoot, settling time, MV peak.
- **Textbooks:** Seborg, Edgar, Mellichamp & Doyle *Process Dynamics and Control* ch. 12; Skogestad, *J. Process Control* 13 (2003) 291–309 "Simple analytic rules for model reduction and PID controller tuning" (free PDFs on the NTNU site).
- **Validation:**
  - SIMC, K = 1, τ = 10, θ = 2, τc = θ gives **Kc = 2.5, τI = 10**. This is Skogestad's own lecture example (NTNU 2024 slides).
  - ZN reaction curve, same model: Kc = 6, τI = 4, τD = 1.
  - Cohen–Coon PI: Kc = 4.58, τI = 4.71.
  - Simulator check: open-loop step of K = 2, τ = 5, θ = 1 reaches 63.2 % of 2 (1.264) at t = 6.
- **UI:** two stacked plots (PV vs SP, and MV) that redraw live as sliders move. A "compare rules" toggle overlays responses from all rules. An optional "fit FOPDT from step data" mode uses Smith's two-point method (28.3 % / 63.2 % times). Students learn most from this one.
- **Data / licence:** none. All formulas come from published literature.

### 2.4 Pump curve × system curve + affinity laws (rank 5)
- **Method:** fit the pump curve as a quadratic H = a + bQ + cQ² through 3–5 user points (least squares). System curve H = Hstatic + kQ², where k comes from the existing Darcy/Colebrook code or is entered directly. Solve for the intersection.
  - Affinity laws: Q ∝ N, H ∝ N², P ∝ N³ (impeller trim D uses the same exponents, approximately).
  - Show NPSHa (reuse the existing calculator) against an optional NPSHr curve.
  - Pumps in series and parallel: add H, or add Q.
  - Fan laws use the same form with Δp and density.
- **Textbooks:** Karassik *Pump Handbook*; McCabe–Smith ch. 8; Crane TP-410 for the system curve.
- **Validation:** pump H = 50 − 0.002Q² (m, Q in m³/h), system H = 20 + 0.001Q². Expect **Q = 100 m³/h, H = 30 m**. Speed 1450 → 1750 rpm scales Q by 1.207 and H by 1.457.
- **UI:** one chart with a draggable speed or trim slider. The operating point moves along the curve and the BEP band is shaded.
- **Data:** none (curves are user-entered).

### 2.5 Control valve sizing, IEC 60534-2-1 / ISA-75.01.01 (rank 6)
- **Method:**
  - **Liquid:** Cv = (Q/N1)·√(ρ/ρ0 / Δp_sizing), with Δp_sizing = min(Δp, Δp_choked) and Δp_choked = (FLP/FP)²·(P1 − FF·Pv), where FF = 0.96 − 0.28√(Pv/Pc).
  - **Gas:** Cv = W/(N6·FP·Y·√(x·P1·ρ1)), with Y = 1 − x/(3·Fγ·xT) and x limited to Fγ·xT.
  - **Piping geometry factor FP:** reducer K values, iterate on Cv. Add the Reynolds-number factor FR for viscous service as an advanced option.
  - Report Kv as well (Kv = Cv/1.156) and % opening against a user-entered rated Cv.
- **Sources:** IEC 60534-2-1:2011 (paid; preview on iTeh); ISA-75.01.01; Emerson/Fisher *Control Valve Handbook* (free PDF).
- **Validation (four test vectors):** the `fluids` docs reproduce the four IEC worked examples.
  - IEC Ex. 1, liquid: ρ = 965.4 kg/m³, Psat = 70.1 kPa, Pc = 22120 kPa, P1 = 680 kPa, P2 = 220 kPa, Q = 0.1 m³/s, D = d = 0.15 m, FL = 0.9 gives **Kv = 165.0 m³/h**.
  - IEC Ex. 2 (FL = 0.6, d = 0.1 m) gives Kv = 238.06.
  - IEC Ex. 3, CO2 gas: T = 433 K, MW = 44.01, γ = 1.30, Z = 0.988, P1 = 680 kPa, P2 = 310 kPa, Q = 38/36 m³/s at standard conditions, D1 = 0.08, D2 = 0.1, d = 0.05, xT = 0.60 gives Kv = 72.59.
  - Emerson's 2026 walkthrough (propane, N1 = 1, FF = 0.83, Δp = 25 psi) shows the FP iteration: 125.7, then 121.7, then 116.6 Cv. It does not list all its inputs, so use it as a UI flow example only.
- **UI:** liquid/gas switch, results card (choked or not, cavitation-index warning, Cv/Kv, % of rated) and a small Q-vs-√Δp chart showing the choked plateau.
- **Licence:** the standard text is copyrighted, but equations are not copyrightable. Cite the standard, do not reproduce its tables, and have the user enter FL/xT (or give a generic "typical values by valve style" table taken from vendor handbooks with attribution).

### 2.6 Fenske–Underwood–Gilliland shortcut (rank 7)
- **Method:**
  - **Fenske:** Nmin = ln[(xLK/xHK)D·(xHK/xLK)B]/ln αavg.
  - **Underwood:** solve Σ αi·zi/(αi−θ) = 1−q for θ between αHK and αLK, then Rmin + 1 = Σ αi·xi,D/(αi−θ).
  - **Gilliland:** use the Molokanov form Y = 1 − exp[(1+54.4X)/(11+117.2X)·(X−1)/√X], with X = (R−Rmin)/(R+1) and Y = (N−Nmin)/(N+1).
  - **Feed stage:** Kirkbride.
  - Multicomponent with LK/HK selection, plus non-key distribution from Fenske.
- **Textbooks:** Seader, Henley & Roper ch. 9; Wankat ch. 7; Towler & Sinnott *Chemical Engineering Design* §17.7.
- **Validation:** binary, α = 2.5, xF = 0.5, q = 1, xD = 0.95, xB = 0.05:
  - Nmin = ln 361/ln 2.5 = **6.43**
  - Rmin = **1.10**
  - At R = 1.3Rmin = 1.43: X = 0.136, Y = 0.518, so **N ≈ 14.4** theoretical stages (including the reboiler).
- **UI:** form plus a Gilliland chart with the operating point marked. A "send to McCabe–Thiele" link carries the same inputs over.
- **Data:** α from the bubble-point tool or ChemIP Antoine.

### 2.7 Compressor power (rank 8)
- **Method:**
  - Isentropic: T2s = T1·r^((k−1)/k), w = cp(T2s−T1)/ηs, or w = Z·R·T1/M·k/(k−1)·(r^((k−1)/k) − 1)/ηs.
  - Polytropic: n from (n−1)/n = (k−1)/(k·ηp).
  - Multistage: equal ratio per stage, r_stage = r^(1/N), with intercooling to T1.
  - Outputs: discharge T (warn above about 150–180 °C), gas power and shaft power (mechanical efficiency).
- **Textbooks:** Towler & Sinnott §20 (Compressors); GPSA Engineering Data Book sec. 13 (copyrighted; formulas only); McCabe–Smith ch. 8.
- **Validation:** air, 1 bar, 300 K to 5 bar, k = 1.4, ideal: T2s = 300·5^0.2857 = **475.1 K**, w = 1.005 × 175.1 = **176 kJ/kg**. With two stages and perfect intercooling: r_stage = 2.236, w = 2 × 1.005 × 300 × (2.236^0.2857 − 1) = 2 × 77.9 ≈ **156 kJ/kg**.
- **Data:** MW from ChemIP. k = Cp/Cv must be user-entered unless a Cp source exists; offer common gases from a small built-in table (Cp ideal-gas values are factual).

### 2.8 Heat exchanger ε-NTU + shell-and-tube quick sizing (rank 9)
- **Method:** ε-NTU relations for counterflow, parallel flow, 1-shell/2-pass (and n shells), crossflow (both unmixed, one mixed), and Cr = 0 (condensing or boiling).
  - Rating: given UA, find outlet T.
  - Sizing: given ε, find NTU and then area.
  - LMTD F correction (Bowman) for 1-2 exchangers, linked to the existing LMTD tool.
  - Quick sizing: A = Q/(U·F·ΔTlm) with a typical-U table by service (water–water, organic–water, steam–water, gas–gas), plus tube count from A, tube OD/length and passes.
- **Textbooks:** Incropera & DeWitt *Fundamentals of Heat and Mass Transfer* ch. 11 (Table 11.3/11.4); Kern *Process Heat Transfer*; Towler & Sinnott §19 (typical U values).
- **Validation:**
  - Counterflow, NTU = 2, Cr = 0.5: ε = (1−e^(−1))/(1−0.5e^(−1)) = **0.7746**.
  - Cr = 0, NTU = 2: ε = 1 − e^(−2) = 0.8647.
  - 1-2 shell-and-tube, NTU = 1, Cr = 0.5: ε ≈ 0.565 (compute from Incropera eq. 11.31a and cross-check with `ht.effectiveness_from_NTU`).
- **UI:** ε-vs-NTU chart with family curves for Cr; the current point moves as inputs change.
- **Data / licence:** typical-U ranges appear in many textbooks; give ranges with a citation, not copied tables.

### 2.9 Economics pack (rank 10)
- **Method:**
  - Capacity scaling C2 = C1·(S2/S1)^n, n default 0.6 (per-equipment n from Towler & Sinnott Table 7.2 style, cited).
  - Escalation C_now = C_then·(I_now/I_then) with a **user-entered index**.
  - Lang factor (3.1 solids / 3.6 solid–fluid / 4.7 fluids).
  - NPV, IRR (bisection), discounted payback, simple payback, annualised cost (CRF).
  - Utility cost: steam, electricity, cooling water from user prices, with KRW defaults the user can edit.
- **Textbooks:** Turton et al. *Analysis, Synthesis and Design of Chemical Processes* ch. 7–10; Towler & Sinnott ch. 7 and 9; Peters & Timmerhaus.
- **Validation:**
  - Six-tenths: $10 M at 100 t/d scaled to 200 t/d = 10·2^0.6 = **$15.16 M**.
  - NPV: −1000 then +300/yr for 5 years at 10 % = **+137.2**, simple payback 3.33 yr, IRR ≈ 15.2 %.
- **Cost-index problem:**
  - CEPCI is published monthly by *Chemical Engineering* magazine behind a subscription. Annual values are reprinted widely, but redistributing a full series is risky. Ship no CEPCI table; let the user type the two index values (most students have them in their textbook).
  - Intratec's IC index was free from 2015 but is now part of a paid subscription (from US$240/yr).
  - Free alternatives: (1) US BLS Producer Price Index industry series on FRED (public domain), e.g. pumps NAICS 333911, compressors 333912 (`PCU333912…`). CEPCI itself is a weighted basket of 41 BLS PPIs plus 12 labour indices, so a transparent "BLS equipment PPI" proxy is legitimate if labelled as such. (2) For Korea, Bank of Korea producer price index (ECOS, free) and the KICT construction cost index (건설공사비지수, free; verify licence). Bake annual values into a data file at build time, because a static site cannot call ECOS with a key from the browser.
  - Caveat to show in the UI: indices are reliable for about 5–10 years of escalation only.
- **Effort:** S for the formulas; M if a curated PPI annual data file is added.

### 2.10 Batch reactor, reactors in series, Arrhenius fit (rank 11)
- **Method:**
  - Batch: t = (1/k)·ln(1/(1−X)) for first order, t = X/(k·CA0·(1−X)) for second order, or n-th order by numerical quadrature.
  - N equal CSTRs: X = 1 − (1+kτ/N)^(−N); compare with a PFR. Optional Levenspiel plot (1/−rA vs X) with shaded areas.
  - Arrhenius: linear regression of ln k on 1/T. Outputs Ea, A, R², and k at a new T. A two-point mode is included.
- **Textbooks:** Fogler *Elements of Chemical Reaction Engineering* ch. 2–5; Levenspiel *Chemical Reaction Engineering* ch. 5–6.
- **Validation:**
  - Batch, k = 0.1 min⁻¹, X = 0.9: t = **23.03 min**.
  - Total kτ = 2: one CSTR X = 0.667; two in series 0.75; PFR 0.8647.
  - Arrhenius: k doubling from 300 to 310 K gives Ea = R·ln2/(1/300 − 1/310) = **53.6 kJ/mol**.
- **UI:** Levenspiel plot and Arrhenius plot (points plus fitted line).

### 2.11 Kremser absorption / stripping / extraction (rank 12)
- **Method:**
  - Absorption factor A = L/(mV). Fraction absorbed = (A^(N+1) − A)/(A^(N+1) − 1); inverted for N. For A = 1, use N/(N+1).
  - Stripping uses S = 1/A. Extraction uses E = mS/F with the same form.
  - Option: m from Henry's constant (H/P) or Raoult (Psat/P via ChemIP Antoine).
- **Textbooks:** Seader, Henley & Roper ch. 6; Wankat ch. 12–13; Treybal *Mass-Transfer Operations*.
- **Validation:** A = 1.4, N = 5 gives fraction absorbed = (7.530 − 1.4)/(7.530 − 1) = **0.9387**.
- **UI:** a chart of fraction absorbed vs N for several A (the classic Kremser chart).

### 2.12 Adiabatic reactor T–X line (rank 13)
- **Method:** T = T0 + (−ΔHr)·X/(Σθi·Cpi + X·ΔCp), plotted against the equilibrium conversion Xe(T) from K(T) = K0·exp[−ΔHr/R(1/T − 1/T0)]. Includes interstage-cooling staircases for exothermic reversible reactions. Show the adiabatic temperature rise ΔTad.
- **Textbook:** Fogler ch. 11–12 (the classic T–X figure and interstage-cooling example).
- **Validation:** ΔHr = −80 kJ/mol, ΣθCp = 400 J/mol·K, ΔCp = 0, T0 = 300 K gives T = 300 + 200X, so X = 1 at **500 K** (ΔTad = 200 K). Cross-check one Fogler example from the book.
- **Data:** ChemIP ΔHf / Cp if present; otherwise user input. Pair with the safety side: show ΔTad as a runaway-severity indicator (Stoessel criticality classes). That is a ChemIP-flavoured hook.

### 2.13 Flue gas analysis (rank 14, extends `calc_stoich_air`)
- **Method:** fuel CxHyOzSs (+ N2 or moisture) and excess air give the wet and dry flue composition. The inverse mode estimates excess air from measured dry O2 %, EA ≈ O2/(20.9 − O2) (exact form from the balance). Also: acid/water dew point and stack loss (Siegert).
- **Validation:** CH4 with 10 % excess air gives CH4 + 2.2O2 + 8.27N2 → CO2 + 2H2O + 0.2O2 + 8.27N2. Dry flue: **CO2 10.55 %, O2 2.11 %**, N2 87.3 %.
- **Textbooks:** Himmelblau & Riggs *Basic Principles and Calculations in ChemE* ch. 10; Felder & Rousseau ch. 4.

### 2.14 Tank breathing / working losses, AP-42 §7.1 (rank 15)
- **Method:** fixed roof: LT = LS + LW, with LS = 365·VV·WV·KE·KS (standing). The working loss uses throughput, turnover factor KN and product factor KP. A floating-roof option can follow later.
  - The equations need daily ambient temperature range and solar insolation. AP-42 tabulates these only for US cities, so offer user input or bake in Korean monthly climate normals (KMA; verify licence). Vapor pressure comes from Antoine at the liquid surface temperature.
- **Source:** US EPA AP-42 Ch. 7.1 (June 2020), a US government work in the public domain; EPA background documents b07s01. EPA retired its TANKS 4.09d software, so a browser version fills a real gap.
- **Validation:** AP-42 has no fully worked example in §7.1. Use an EPA TANKS 4.09 report or a state permit appendix (e.g. NMED permit AppPSD195, which shows the computations) as the test vector. Effort is M–L because of the many factors.
- **Pairing:** strong — ChemIP vapor pressure (Antoine) and MW, plus the existing `calc_evaporation`.

### 2.15 SVG chart module (rank 1, infrastructure)
- `calc_chart.jsx`: axes with nice ticks, line/step/scatter series, an optional log axis (Arrhenius, ε-NTU), draggable markers (callback into input values), and a light/dark palette via `tokens.css` variables.
- Registry extension: `chart(values, result) → { x: {label, unit, log?}, y: {...}, series: [...] }`. The chart code stays out of each calculator, which matches the project's "data → pure function → display" rule.
- No library is needed. If one is used, uPlot (MIT, about 45 KB) is the light option. A custom SVG of roughly 300 lines is preferable for build-free React.

### Deferred items (brief)
- **16. Two-phase line sizing:** homogeneous density ρm = (x/ρg + (1−x)/ρl)⁻¹; erosional velocity Ve = C/√ρm (API RP 14E, C = 100–125 in US units). Example: ρm = 4 lb/ft³ gives Ve = 50 ft/s. Lockhart–Martinelli ΔP and a Baker/Taitel–Dukler flow-regime map would be "indicative only". S for the erosional/velocity check, L for a proper regime map. API RP 14E is copyrighted; the formula is widely cited, so cite it.
- **17. Condensation and boiling:** Nusselt film condensation on a vertical plate or horizontal tube (Incropera §10.7–10.8); Mostinski nucleate boiling h = 0.104·Pc^0.69·q^0.7·[1.8Pr^0.17 + 4Pr^1.2 + 10Pr^10] (Pc in bar). Validate against Incropera Ex. 10.x from the book. S–M. Needs liquid properties (k, μ, ρ, h_fg), which ChemIP mostly lacks, so this is mostly user input.
- **18. Membrane gas permeation:** solution–diffusion flux Ji = Pi/ℓ·(p_h·x − p_l·y). Complete-mixing binary model (Weller–Steiner; Geankoplis §13.4) has a closed-form quadratic: stage cut θ against permeate purity. M. Good teaching chart: purity vs stage cut for several selectivities.
- **Hunter–Nash ternary extraction:** L. It needs a triangular diagram and user-entered binodal data, so its value per effort is low.
- **P&ID symbol reference:** ANSI/ISA-5.1-2024 is copyrighted. ISA's terms forbid derivative works made with AI tools without written permission. Reproducing its figure tables is not safe. Two safe options:
  - (a) A text-only reference of tag-letter conventions (first letter = measured variable, succeeding letters = function), explained in our own words with a citation. This is low risk.
  - (b) Self-drawn generic shapes (circle = field instrument, circle in square = shared display/DCS, line types), drawn originally rather than traced.
  - ISO 10628 and ISO 14617 are also paid standards. DEXPI (the open P&ID data-exchange specification) is a possible future hook, not needed now.
- **PFD drawing tool:** L. Existing free tools (draw.io, which is Apache-2.0) already do this well, so the marginal value is low. At most offer a "unit-op block palette" export to SVG.

---

## 3. Pairing with ChemIP substance data

Extend the `calcSubstanceHref` pattern: from the substance detail page, "이 물질로 계산하기 / calculate with this substance" opens a calculator with fields pre-filled.

| ChemIP field | Tools that consume it |
|---|---|
| Molar mass (MSDS §9) | Compressor (MW → R/M), flue gas (fuel formula), ideal gas, valve gas sizing, tank losses (WV) |
| Antoine constants / vapor pressure | Bubble/dew, Rachford–Rice (Raoult K), McCabe–Thiele (α(T) for a pair), Kremser m = Psat/P, tank breathing losses, valve Pv (choked flow), existing NPSHa |
| Boiling point | Initial guess for bubble/dew; a check on Antoine (Psat(Tb) ≈ 760 mmHg; warn if off by more than 5 %) |
| Tc, Pc, ω (if ingested from PubChem/NIST/`chemicals`) | Wilson K-values, valve FF = 0.96 − 0.28√(Pv/Pc), Mostinski boiling, existing Pitzer Z |
| Relative density | Liquid valve sizing, pump head ↔ pressure, two-phase ρl |
| Molecular formula | Flue gas / stoichiometric air (auto CxHyOz), adiabatic flame estimate |
| ΔHc / ΔHf / Cp (if available) | Adiabatic T–X line and ΔTad severity, heat duty |

Mixture tools (flash, bubble/dew) need a multi-substance picker: a row-level "find substance" in the existing `type: "table"` input. One shared component would serve all three tools.

---

## 4. Suggested build order (sprints)

1. Chart module, then pump/system curve (simplest chart, proves the module), then the PID simulator.
2. Bubble/dew + flash, then McCabe–Thiele, then FUG (one "separations" group sharing Antoine pre-fill).
3. Control valve, compressor, ε-NTU.
4. Economics pack, reactors (batch/series/Arrhenius/adiabatic), Kremser, flue gas.
5. AP-42 tank losses (after the Korean climate-data licence check).

Add every validation example above to `frontend/scripts/tests/test_calculators.cjs` as a test vector, with a tolerance of about 0.5 % (1–3 % for the iterative IEC gas example, as `fluids` notes).

---

## 5. Sources

- Skogestad SIMC rules and lecture example (K = 1, τ = 10, θ = 2 → Kc = 2.5): https://skoge.folk.ntnu.no/prosessregulering/lectures/2024/SiS6SIMC_tuning.pdf ; paper index https://skoge.folk.ntnu.no/publications/2003/tuningPID/README.html.folkmigration ; 2006 smooth-PID note https://skoge.folk.ntnu.no/publications/2006/skogestad_iecr_smooth-pid/readme.txt
- IEC 60534-2-1 worked examples as reproduced in the `fluids` library: https://fluids.readthedocs.io/fluids.control_valve.html
- IEC 60534-2-1:2011 preview: https://cdn.standards.iteh.ai/samples/15856/b9e6a11ca7af441480a30739627ca8ad/IEC-60534-2-1-2011.pdf
- Emerson liquid control valve sizing walkthrough (2026): https://www.emersonautomationexperts.com/2026/valves-actuators-regulators/sizing-a-control-valve-for-liquid-flow-a-step-by-step-walkthrough/
- ISA-5.1 product and IP terms: https://www.isa.org/products/ansi-isa-5-1-2024-instrumentation-and-control-symb ; overview https://www.isa.org/intech/2020/september-october/isa-5-1-instrumentation-symbols-and-identification
- Cost indexes: https://en.wikipedia.org/wiki/Chemical_plant_cost_indexes ; CEPCI (paywalled) https://www.chemengonline.com/site/plant-cost-index ; BLS endorsement (CEPCI built on PPI) https://www.bls.gov/respondents/ppi/chemical-engineering-magazine-endorsement.pdf ; Intratec IC index now subscription https://newsroom.intratec.us/insights/industrial-plant-cost-indexes/ ; earlier free release https://www.chemicalonline.com/doc/intratec-improves-its-chemical-plant-construction-index-interface-0001 ; FRED PPI example https://fred.stlouisfed.org/series/PCU333318333318 ; BLS NAICS concordance https://www.bls.gov/ppi/additional-resources/sic-to-naics-concordance-sic-356-through-sic-359.htm ; CEPCI from macro indicators (Mignard) https://www.pure.ed.ac.uk/ws/files/25314893/DMIGNARD_CEIndex_AFPRM.pdf ; PPI as free alternative (UNC) https://www.sog.unc.edu/blogs/environmental-finance/accounting-inflation-water-and-wastewater-capital-planning-0
- AP-42 §7.1 and background: https://gaftp.epa.gov/ap42/ch07/s01/bgdocs/b07s01.pdf ; revisions summary https://19january2021snapshot.epa.gov/sites/static/files/2020-11/documents/ap42_chapter_7_section_7-1_revisions_summary.pdf ; permit example with computations https://www.env.nm.gov/public-notices/wp-content/uploads/sites/32/2024/06/AppPSD195-M41Part2.pdf
- McCabe–Thiele reference implementations: LearnChemE https://learncheme.com/simulations/separations/construct-a-mccabe-thiele-diagram-for-distillation/ (site footer CC BY-SA 4.0: https://learncheme.com/contact-us/) ; Wolfram version licence listing https://oer.tamiu.edu/itemRecord.php?id=29904 ; Geankoplis ch. 11 Python port https://tbc-python.fossee.in/convert-notebook/TRANSPORT_PROCESSES_AND_UNIT_OPERATIONS/GeankoplisChapter11.ipynb
- Manchester interactive ChemE graphs (prior art, iframe-embeddable): https://personalpages.manchester.ac.uk/staff/tom.rodgers/Interactive_graphs/about.html ; https://www.thechemicalengineer.com/features/interactive-graph-resource-for-chemical-engineering-design/ ; CEPCI graph https://personalpages.manchester.ac.uk/staff/tom.rodgers/Interactive_graphs/reactors/CEPCI/index.html
- Rachford–Rice worked examples (course material): https://www.scribd.com/doc/79961604/Week03-Multi-Component-Flash-Distillation

Textbooks cited: McCabe, Smith & Harriott *Unit Operations of Chemical Engineering*; Geankoplis *Transport Processes and Separation Process Principles*; Seader, Henley & Roper *Separation Process Principles*; Wankat *Separation Process Engineering*; Smith, Van Ness & Abbott *Intro to ChemE Thermodynamics*; Seborg et al. *Process Dynamics and Control*; Fogler *Elements of Chemical Reaction Engineering*; Levenspiel *Chemical Reaction Engineering*; Incropera & DeWitt *Fundamentals of Heat and Mass Transfer*; Kern *Process Heat Transfer*; Towler & Sinnott *Chemical Engineering Design*; Turton et al. *Analysis, Synthesis and Design of Chemical Processes*; Himmelblau & Riggs; Felder & Rousseau; Treybal.

## 6. Items not verified here (check before shipping)
- Geankoplis Ex. 11.4-1 exact inputs and stage count (only a third-party port was seen).
- Cohen–Coon and ZN numbers are from the standard formulas; confirm them against the Seborg tables (the Cohen–Coon form varies between editions).
- The 1-2 shell ε value (≈ 0.565) and the bubble point (≈ 92.1 °C) are hand estimates; confirm them with `ht` / `thermo`.
- BLS PPI series IDs for heat exchangers and process equipment: browse FRED or BLS directly.
- Licence terms for KICT 건설공사비지수 and KMA climate normals.
- The `fluids` package licence is MIT on GitHub (CalebBell/fluids). The docs page shows only a copyright line; confirm on the repo.
