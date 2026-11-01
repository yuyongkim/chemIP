// 용어사전 자료 · 열역학·반응공학 — 영어판. 한국어 기준은 glossary_thermo.jsx(같은 key).
// 한글이 든 필드(term·def·alias·unit·ref)만 여기에 둡니다. exams·calc·see·src 는 한국어 파일에만 있습니다.

const GLOSSARY_THERMO_EN = {
  zeroth_law: {
    term: "Zeroth law of thermodynamics",
    alias: ["thermal equilibrium law"],
    def: "If two bodies are each in thermal equilibrium with a third, they are in thermal equilibrium with each other. This is the basis for defining temperature and measuring it with a thermometer.",
  },
  first_law: {
    term: "First law of thermodynamics",
    alias: ["conservation of energy"],
    def: "Energy changes form but is neither created nor destroyed. For a closed system ΔU = Q + W (heat and work added to the system positive); for steady flow ΔH + Δ(u²/2) + gΔz = Q + W_s.",
  },
  second_law: {
    term: "Second law of thermodynamics",
    alias: ["entropy principle"],
    def: "The entropy of an isolated system never decreases, and no cyclic engine can convert heat entirely into work (Kelvin–Planck). Heat does not flow by itself from cold to hot (Clausius).",
  },
  third_law: {
    term: "Third law of thermodynamics",
    alias: ["Nernst heat theorem"],
    def: "The entropy of a perfect crystal is zero at absolute zero. This fixes absolute entropies and implies that absolute zero cannot be reached in a finite number of steps.",
  },
  internal_energy: {
    term: "Internal energy (U)",
    alias: ["internal energy U"],
    def: "State function summing the translational, rotational, vibrational and interaction energies of the molecules. For an ideal gas it depends on temperature only, and heat added at constant volume equals ΔU (dU = Cv·dT).",
  },
  enthalpy: {
    term: "Enthalpy (H)",
    def: "State function defined as H = U + PV. Equals the heat exchanged at constant pressure (dH = Cp·dT) and is the basic quantity in flow-system energy balances.",
  },
  entropy: {
    term: "Entropy (S)",
    def: "State function defined for a reversible process by dS = δQ_rev/T; a measure of disorder (number of microstates). Any irreversible process increases the total entropy of system plus surroundings.",
  },
  gibbs_energy: {
    term: "Gibbs free energy (G)",
    alias: ["Gibbs energy", "free enthalpy"],
    def: "State function G = H − TS. At constant temperature and pressure spontaneous change lowers G, and G is a minimum at equilibrium (ΔG < 0 spontaneous, ΔG = 0 equilibrium).",
  },
  helmholtz_energy: {
    term: "Helmholtz free energy (A)",
    alias: ["Helmholtz energy", "work function"],
    def: "State function A = U − TS. At constant temperature and volume spontaneous change lowers A; it equals the maximum work obtainable in an isothermal reversible process.",
  },
  chemical_potential: {
    term: "Chemical potential (μ)",
    alias: ["partial molar Gibbs energy"],
    def: "Change in Gibbs energy when one mole of component i is added at constant T, P and other amounts: μ_i = (∂G/∂n_i)_T,P,n_j. At phase equilibrium each component has the same chemical potential in every phase.",
  },
  fugacity: {
    term: "Fugacity (f)",
    alias: ["effective pressure"],
    def: "An 'effective pressure' used for real gases and solutions, defined through μ = Γ(T) + RT·ln f. It approaches the pressure as pressure goes to zero; at phase equilibrium each component's fugacity is equal in all phases.",
  },
  fugacity_coefficient: {
    term: "Fugacity coefficient (φ)",
    alias: ["phi coefficient"],
    def: "Ratio of fugacity to pressure (partial pressure in a mixture), φ = f/P; a measure of departure from ideal-gas behavior. φ = 1 for an ideal gas; obtained from an equation of state or generalized correlations.",
  },
  activity: {
    term: "Activity (a)",
    def: "Fugacity of a component divided by its standard-state fugacity, a_i = f_i/f_i°. In solutions a_i = γ_i·x_i; equilibrium constants are written in terms of activities.",
  },
  activity_coefficient: {
    term: "Activity coefficient (γ)",
    alias: ["Margules", "Wilson", "NRTL", "UNIFAC"],
    def: "Measure of departure from ideal-solution behavior, γ_i = a_i/x_i. γ > 1 is positive deviation (tending to minimum-boiling azeotropes), γ < 1 negative; obtained from models such as Margules, Wilson, NRTL and UNIFAC.",
  },
  raoult_law: {
    term: "Raoult's law",
    alias: ["Raoult law"],
    def: "For an ideal solution and ideal gas, each component's partial pressure equals its liquid mole fraction times its pure-component vapor pressure: y_i·P = x_i·P_i^sat. Non-ideal solutions use modified Raoult's law y_i·P = x_i·γ_i·P_i^sat.",
  },
  henry_law: {
    term: "Henry's law",
    alias: ["Henry law", "Henry's constant"],
    def: "In dilute solution the partial pressure of a dissolved gas is proportional to its liquid mole fraction, p_i = H_i·x_i. Used for sparingly soluble species such as gases above their critical temperature; the Henry constant usually rises with temperature (lower solubility).",
  },
  vle: {
    term: "Vapor–liquid equilibrium (VLE)",
    alias: ["vapour-liquid equilibrium", "x-y diagram"],
    def: "State in which vapor and liquid coexist with equal temperature, pressure and component fugacities in both phases. The basic data for distillation, absorption and flash design, shown as T–x–y, P–x–y and x–y diagrams.",
  },
  bubble_point: {
    term: "Bubble point (bubble-point calculation)",
    alias: ["bubble point", "bubble-point temperature"],
    def: "Temperature (or pressure) at which the first vapor bubble forms when a liquid mixture is heated (or depressurized). For a Raoult's-law system the bubble pressure is P = Σ x_i·P_i^sat; the temperature is found by iterating until Σ K_i·x_i = 1.",
  },
  dew_point_calc: {
    term: "Dew point (VLE dew-point calculation)",
    alias: ["dew-point calculation", "dew point"],
    def: "Temperature (or pressure) at which the first liquid drop forms when a vapor mixture is cooled (or compressed). For a Raoult's-law system the dew pressure is 1/P = Σ y_i/P_i^sat; the temperature is found by iterating until Σ y_i/K_i = 1. For humid air see dew_point.",
  },
  phase_rule: {
    term: "Gibbs phase rule",
    alias: ["phase rule", "degrees of freedom"],
    def: "Number of independent intensive variables (degrees of freedom) of a system at equilibrium, F = C − P + 2 (C: components, P: phases). With r independent reactions, F = C − P + 2 − r. Example: the triple point of pure water has F = 0.",
  },
  clausius_clapeyron: {
    term: "Clausius–Clapeyron equation",
    alias: ["Clapeyron equation"],
    def: "Links the temperature dependence of vapor pressure to the heat of vaporization. Assuming ideal vapor, negligible liquid volume and constant ΔH_vap: ln(P₂/P₁) = −(ΔH_vap/R)·(1/T₂ − 1/T₁). The exact Clapeyron equation is dP/dT = ΔH/(T·ΔV).",
  },
  latent_heat: {
    term: "Latent heat (heat of vaporization)",
    alias: ["heat of vaporization", "enthalpy of vaporization", "heat of fusion"],
    def: "Heat absorbed or released during a phase change at constant temperature. The heat of vaporization decreases with temperature and vanishes at the critical point; at the normal boiling point it can be estimated with Trouton's rule (ΔS_vap ≈ 88 J/(mol·K)).",
  },
  joule_thomson: {
    term: "Joule–Thomson effect",
    alias: ["throttling", "Joule-Thomson coefficient", "J-T effect"],
    def: "Temperature change of a gas expanding adiabatically through a valve or porous plug (throttling, constant enthalpy). If the Joule–Thomson coefficient μ_JT = (∂T/∂P)_H is positive the gas cools on expansion; μ_JT = 0 for an ideal gas.",
  },
  inversion_temperature: {
    term: "Inversion temperature (Joule–Thomson)",
    alias: ["Joule-Thomson inversion temperature"],
    def: "Temperature at which the Joule–Thomson coefficient changes sign. Below it throttling cools the gas; above it the gas warms. Hydrogen and helium are above their inversion temperatures at room temperature, so they warm when throttled.",
  },
  carnot_cycle: {
    term: "Carnot cycle (thermal efficiency)",
    alias: ["Carnot efficiency", "thermal efficiency"],
    def: "Reversible heat-engine cycle of two isothermal and two adiabatic (isentropic) steps. It has the highest possible efficiency between two reservoirs, η = 1 − T_C/T_H (absolute temperatures).",
  },
  cop: {
    term: "Coefficient of performance (COP)",
    alias: ["coefficient of performance"],
    def: "Refrigerator: heat removed from the cold space ÷ work input, COP = Q_C/W; heat pump: heat delivered ÷ work, Q_H/W. A Carnot refrigerator has COP = T_C/(T_H − T_C); the heat-pump COP is larger by 1.",
  },
  rankine_cycle: {
    term: "Rankine cycle",
    alias: ["steam power cycle"],
    def: "Steam power cycle: pump the water, boil and superheat it in a boiler, expand in a turbine, and condense. Efficiency rises with higher boiler pressure and superheat or lower condenser pressure, and further with reheat and regeneration.",
  },
  refrigeration_cycle: {
    term: "Vapor-compression refrigeration cycle",
    alias: ["refrigeration cycle", "vapor compression", "reverse Carnot"],
    def: "Refrigerant absorbs heat in the evaporator, is compressed, rejects heat in the condenser, and is throttled through an expansion valve back to the evaporator. The expansion valve step is isenthalpic.",
  },
  van_der_waals: {
    term: "Van der Waals equation of state",
    alias: ["van der Waals equation"],
    def: "Cubic equation of state correcting for intermolecular attraction (a) and molecular volume (b): (P + a/V²)(V − b) = RT (V: molar volume). From the critical-point conditions a = 27R²T_c²/(64P_c), b = RT_c/(8P_c), and the critical compressibility factor is 3/8.",
  },
  peng_robinson: {
    term: "Peng–Robinson equation of state",
    alias: ["PR EOS", "SRK"],
    def: "Cubic equation of state widely used for hydrocarbon VLE; the attraction term contains a function α(T, ω) of temperature and acentric factor so that vapor pressures are well reproduced. The Soave–Redlich–Kwong (SRK) equation is similar.",
  },
  virial_equation: {
    term: "Virial equation of state",
    alias: ["virial expansion", "second virial coefficient"],
    def: "Compressibility factor written as a power series in molar density (or pressure): Z = 1 + B/V + C/V² + … At low to moderate pressure it is truncated to Z = 1 + BP/(RT); the coefficients B, C depend on temperature only.",
  },
  corresponding_states: {
    term: "Principle of corresponding states",
    alias: ["corresponding states", "generalized correlations"],
    def: "All fluids at the same reduced temperature and reduced pressure have nearly the same compressibility factor. The three-parameter (Pitzer) correlation Z = Z⁰ + ω·Z¹, which adds the acentric factor, improves accuracy.",
  },
  heat_of_formation: {
    term: "Standard enthalpy of formation (ΔH_f°)",
    alias: ["heat of formation", "standard heat of formation"],
    def: "Enthalpy change when one mole of a compound is formed from its elements in their most stable forms at the standard state (usually 25 °C, 1 bar). Stable elements are assigned zero.",
  },
  hess_law: {
    term: "Hess's law",
    alias: ["Hess law", "law of constant heat summation"],
    def: "The heat of reaction depends only on the initial and final states, not on the path. Heats of reaction can therefore be added and subtracted just as the reaction equations are.",
  },
  heat_of_reaction: {
    term: "Heat of reaction (ΔH_r)",
    alias: ["enthalpy of reaction", "standard heat of reaction", "exothermic", "endothermic"],
    def: "Enthalpy change of a reaction; the standard value is ΔH_r° = Σ ν_i·ΔH_f,i° (products minus reactants). Negative is exothermic, positive endothermic; other temperatures are handled by integrating ΔCp (Kirchhoff's equation).",
  },
  equilibrium_constant: {
    term: "Equilibrium constant (K)",
    alias: ["Kp", "Kc"],
    def: "Product of component activities raised to their stoichiometric coefficients at equilibrium, K = Π a_i^ν_i. Related to the standard Gibbs energy change by ΔG° = −RT·ln K; K depends on temperature only.",
  },
  vant_hoff: {
    term: "Van 't Hoff equation",
    alias: ["van't Hoff equation"],
    def: "Temperature dependence of the equilibrium constant, d(ln K)/dT = ΔH°/(RT²). With constant ΔH°, ln(K₂/K₁) = −(ΔH°/R)·(1/T₂ − 1/T₁); for an exothermic reaction K decreases as temperature rises.",
  },
  le_chatelier_principle: {
    term: "Le Chatelier's principle (equilibrium shift)",
    alias: ["Le Chatelier principle", "equilibrium shift"],
    def: "A system at equilibrium shifts so as to counteract an imposed change in temperature, pressure or concentration. Raising pressure favors the side with fewer gas moles; heating an exothermic reaction shifts it backward. Not the same as the flammability mixing rule (le_chatelier).",
  },
  arrhenius: {
    term: "Arrhenius equation",
    alias: ["frequency factor", "pre-exponential factor"],
    def: "Temperature dependence of the rate constant, k = A·exp(−E_a/(RT)) (A: frequency factor). A plot of ln k against 1/T is a straight line of slope −E_a/R; for two temperatures ln(k₂/k₁) = −(E_a/R)(1/T₂ − 1/T₁).",
  },
  activation_energy: {
    term: "Activation energy (E_a)",
    alias: ["energy barrier"],
    def: "Energy barrier that reactants must overcome to become products. The larger it is, the more temperature-sensitive the rate; a catalyst opens a different pathway with a lower activation energy.",
  },
  reaction_order: {
    term: "Order of reaction",
    alias: ["reaction order", "zero order", "first order", "second order"],
    def: "Exponents α, β of the concentrations in the rate law −r_A = k·C_A^α·C_B^β (order with respect to each species) and their sum (overall order). Determined experimentally; equal to the stoichiometric coefficients only for elementary reactions.",
  },
  half_life: {
    term: "Half-life (t½)",
    alias: ["half life"],
    def: "Time for the reactant concentration to fall to half its initial value. Zero order C_A0/(2k); first order ln 2/k (independent of initial concentration); second order 1/(k·C_A0).",
  },
  rate_law: {
    term: "Rate law",
    alias: ["rate equation", "reaction rate"],
    def: "Expression of the reaction rate as a function of concentrations (or partial pressures) and temperature, usually −r_A = k(T)·f(C_A, C_B, …), in moles of A consumed per unit volume per unit time.",
  },
  batch_reactor: {
    term: "Batch reactor (design equation)",
    alias: ["batch reactor"],
    def: "Reactor charged once and emptied after reaction; there is no flow and composition changes with time. At constant volume the reaction time is t = C_A0·∫₀^X dX/(−r_A); for first order t = (1/k)·ln[1/(1 − X)].",
  },
  selectivity_yield: {
    term: "Selectivity and yield",
    alias: ["selectivity", "yield"],
    def: "With multiple reactions, selectivity is the amount (or rate) of desired product divided by that of undesired product; yield expresses the desired product relative to the reactant reacted (or fed). Definitions vary between textbooks, so the basis should be stated.",
  },
  catalyst: {
    term: "Catalyst",
    alias: ["heterogeneous catalyst", "homogeneous catalyst"],
    def: "Substance that speeds a reaction by providing a lower-activation-energy pathway without being consumed. It speeds forward and reverse reactions alike, so it does not change the equilibrium composition (equilibrium constant).",
  },
  adiabatic_reaction_temperature: {
    term: "Adiabatic reaction temperature",
    alias: ["adiabatic flame temperature", "adiabatic temperature rise"],
    def: "Temperature reached when all the heat of reaction goes into heating the reacting mixture with no loss. From the adiabatic reactor energy balance, T = T₀ + (−ΔH_r)·X/Σ(θ_i·Cp_i); a key reference for runaway-reaction hazard assessment.",
  },
};

Object.assign(window, { GLOSSARY_THERMO_EN });
