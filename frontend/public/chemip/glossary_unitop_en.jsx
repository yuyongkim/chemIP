// 용어사전 자료 · 단위조작·물질전달 — 영어판. 한국어 기준은 glossary_unitop.jsx(같은 key).
// 한글이 든 필드(term·def·alias·unit·ref)만 여기에 둡니다. exams·calc·see·src 는 한국어 파일에만 있습니다.

const GLOSSARY_UNITOP_EN = {
  distillation: {
    term: "Distillation",
    def: "Separation that exploits differences in volatility (vapor pressure) by repeated vaporization and condensation. The closer the relative volatility is to 1, the more stages and reflux are needed.",
  },
  flash_distillation: {
    term: "Flash distillation (equilibrium distillation)",
    alias: ["equilibrium flash", "flash"],
    def: "Single-stage distillation in which the feed is partly vaporized by heating or pressure let-down and the equilibrium vapor and liquid are separated. Solve F = V + L and F·z = V·y + L·x together with the VLE relation.",
  },
  batch_distillation: {
    term: "Batch distillation (simple / differential distillation)",
    alias: ["simple distillation", "differential distillation", "Rayleigh equation"],
    def: "Distillation of a fixed charge in which the vapor is removed continuously, so the still composition changes with time. Simple batch distillation without reflux follows the Rayleigh equation ln(F/W) = ∫(x_W→x_F) dx/(y − x).",
  },
  reflux_ratio: {
    term: "Reflux ratio (R)",
    alias: ["reflux"],
    def: "Ratio of the condensate returned to the column (L) to the distillate withdrawn (D), R = L/D. A higher reflux ratio needs fewer stages but raises reboiler and condenser duties.",
  },
  min_reflux_ratio: {
    term: "Minimum reflux ratio (R_min)",
    def: "Reflux ratio at which the specified separation would need an infinite number of stages; on a McCabe–Thiele diagram an operating line touches the equilibrium curve (pinch point). Designs usually use 1.2–1.5 × R_min.",
  },
  total_reflux: {
    term: "Total reflux",
    alias: ["infinite reflux"],
    def: "Operation with no product withdrawal, all condensate returned to the column (R = ∞). The operating lines coincide with the diagonal y = x and the number of ideal stages is a minimum, given by the Fenske equation.",
  },
  theoretical_stage: {
    term: "Theoretical (equilibrium) stage",
    alias: ["equilibrium stage", "ideal stage"],
    def: "Idealized contact stage whose leaving vapor and liquid are in equilibrium. The number of actual trays is the number of ideal stages divided by the (overall) tray efficiency.",
  },
  murphree_efficiency: {
    term: "Murphree tray efficiency",
    alias: ["tray efficiency", "overall efficiency"],
    def: "Actual composition change across a tray divided by the change that would occur at equilibrium. Vapor basis: E_MV = (y_n − y_n+1)/(y_n* − y_n+1); overall column efficiency is ideal stages ÷ actual trays.",
  },
  mccabe_thiele: {
    term: "McCabe–Thiele method",
    alias: ["stage stepping", "graphical stage construction"],
    def: "Graphical method for binary distillation that steps off stages between the equilibrium curve and the operating lines on an x–y diagram, assuming constant molal overflow. Rectifying line: y = R/(R+1)·x + x_D/(R+1).",
  },
  fenske_equation: {
    term: "Fenske equation",
    alias: ["minimum number of stages"],
    def: "Gives the minimum number of ideal stages at total reflux: N_min = ln[(x_D/(1−x_D))·((1−x_B)/x_B)] / ln α_av. The count includes the partial reboiler as one stage.",
  },
  underwood_equation: {
    term: "Underwood equations",
    alias: ["Underwood method"],
    def: "Minimum reflux for multicomponent distillation. First find θ from Σ α_i·z_i/(α_i − θ) = 1 − q, then R_min + 1 = Σ α_i·x_iD/(α_i − θ).",
  },
  q_line: {
    term: "q-line (feed line)",
    alias: ["feed line", "feed condition"],
    def: "q is the moles of liquid sent down the column at the feed stage per mole of feed; the feed line on the McCabe–Thiele diagram is y = q/(q−1)·x − z_F/(q−1). Saturated liquid q = 1 (vertical), saturated vapor q = 0 (horizontal), subcooled liquid q > 1, superheated vapor q < 0.",
  },
  relative_volatility: {
    term: "Relative volatility (α)",
    alias: ["volatility ratio"],
    def: "Ratio of K-values of two components, α_AB = (y_A/x_A)/(y_B/x_B). For an ideal solution it equals P_A^sat/P_B^sat, and the binary equilibrium is y = αx/[1 + (α−1)x].",
  },
  azeotrope: {
    term: "Azeotrope (azeotropic point)",
    alias: ["azeotropic mixture", "azeotropic point"],
    def: "Mixture whose vapor and liquid have the same composition at equilibrium; α = 1 there, so ordinary distillation cannot cross it. Minimum-boiling (e.g. ethanol–water) and maximum-boiling azeotropes exist.",
  },
  extractive_distillation: {
    term: "Extractive distillation",
    def: "Distillation in which a high-boiling solvent is fed near the top to change the activity coefficients of the key components and raise their relative volatility. The solvent leaves with the bottoms and is recovered separately.",
  },
  azeotropic_distillation: {
    term: "Azeotropic distillation",
    def: "Distillation in which an entrainer forms a new azeotrope with one component that is taken overhead. Production of anhydrous ethanol with benzene or cyclohexane is the classic example.",
  },
  absorption: {
    term: "Gas absorption",
    alias: ["absorption"],
    def: "Contacting a gas mixture with a liquid solvent to dissolve one or more components. Low temperature and high pressure increase solubility and favor absorption.",
  },
  stripping: {
    term: "Stripping (desorption)",
    alias: ["desorption", "stripping"],
    def: "Reverse of absorption: a dissolved component is removed from a liquid by contact with an inert gas or steam. High temperature and low pressure favor stripping.",
  },
  absorption_factor: {
    term: "Absorption factor (A)",
    alias: ["stripping factor", "Kremser equation"],
    def: "Ratio of operating-line slope to equilibrium-line slope, A = L/(m·V) (m: equilibrium slope). Absorption is easy when A > 1; stages for dilute systems follow the Kremser equation. Stripping uses S = 1/A.",
  },
  htu_ntu: {
    term: "HTU and NTU (height and number of transfer units)",
    alias: ["height of a transfer unit", "number of transfer units", "HTU", "NTU"],
    def: "Packed height written as Z = HTU × NTU. NTU measures the difficulty of the separation (concentration change ÷ mean driving force); HTU measures the mass transfer performance of the packing and flows. Example: Z = H_OG·N_OG.",
  },
  packed_column: {
    term: "Packed column",
    alias: ["packed tower"],
    def: "Column filled with Raschig rings, Pall rings or structured packing so gas and liquid contact continuously over a large surface. Low pressure drop and good for corrosive service, but poor liquid distribution degrades performance.",
  },
  flooding: {
    term: "Flooding",
    alias: ["flooding point", "loading point"],
    def: "Condition in which the gas velocity is so high that liquid can no longer flow down and is carried up the column, stopping normal operation. The loading point, where liquid holdup starts to rise sharply, comes first; design gas velocity is typically 50–80 % of flooding.",
  },
  channeling: {
    term: "Channeling",
    alias: ["wall flow", "maldistribution"],
    def: "Uneven liquid flow in a packed bed, along the wall or through a few paths. Wetted area falls and efficiency drops, so distributors and redistributors are used and the column diameter is kept at roughly 8 or more times the packing size.",
  },
  liquid_extraction: {
    term: "Liquid–liquid extraction",
    alias: ["solvent extraction", "extraction"],
    def: "Transfer of a solute from a feed liquid (which becomes the raffinate) to an immiscible solvent (the extract). Used for close-boiling or heat-sensitive materials.",
  },
  distribution_coefficient: {
    term: "Distribution coefficient (K)",
    alias: ["partition coefficient", "distribution ratio"],
    def: "Ratio of solute concentrations in the extract and raffinate phases at equilibrium, K = y/x. A larger K needs less solvent; the ratio of K for two solutes is the selectivity.",
  },
  leaching: {
    term: "Leaching (solid–liquid extraction)",
    alias: ["solid-liquid extraction", "lixiviation"],
    def: "Removal of a soluble component from a solid by dissolving it in a solvent. Smaller particles and higher temperature shorten the diffusion path and increase solubility, speeding the process.",
  },
  drying_rate_periods: {
    term: "Constant-rate and falling-rate drying periods",
    alias: ["constant-rate period", "falling-rate period", "drying rate curve"],
    def: "While the surface is wet, drying proceeds at a constant rate like evaporation from a free water surface; below the critical moisture content internal moisture movement controls and the rate falls. In the constant-rate period the surface is near the wet-bulb temperature.",
  },
  critical_moisture_content: {
    term: "Critical moisture content",
    alias: ["critical moisture", "equilibrium moisture content"],
    def: "Moisture content at the change from constant-rate to falling-rate drying. Moisture above the equilibrium moisture content (which cannot be removed under the given conditions) is the free moisture.",
    unit: "kg water/kg dry solid",
  },
  multiple_effect_evaporation: {
    term: "Multiple-effect evaporation",
    alias: ["multiple effect", "evaporation", "steam economy"],
    def: "Evaporation in which vapor from one effect heats the next. Steam economy (kg evaporated per kg live steam) rises roughly in proportion to the number of effects, but the overall temperature difference is split, so more heat transfer area is needed for the same capacity. Boiling-point elevation reduces the useful temperature difference.",
  },
  crystallization: {
    term: "Crystallization",
    alias: ["crystallisation"],
    def: "Producing solid crystals from a supersaturated solution, created by cooling, solvent evaporation or adding another solvent. Nucleation and growth rates set the crystal size distribution.",
  },
  supersaturation: {
    term: "Supersaturation",
    alias: ["degree of supersaturation"],
    def: "State in which the solution concentration exceeds the saturation solubility at that temperature; the driving force for crystallization. High supersaturation gives many nuclei and fine crystals; low supersaturation favors growth and larger crystals.",
  },
  cake_filtration: {
    term: "Cake filtration",
    alias: ["filtration", "filter cake"],
    def: "Filtration in which the solids deposited on the medium (the cake) do the filtering. Total resistance is cake plus medium resistance; as the cake thickens the rate falls at constant pressure.",
  },
  ruth_equation: {
    term: "Ruth filtration equation",
    alias: ["Ruth equation", "constant-pressure filtration equation"],
    def: "Relation between filtrate volume and time at constant pressure: (V + V₀)² = K·(t + t₀), where V₀ and t₀ represent the medium resistance as a fictitious filtrate volume and time. A plot of t/V against V is a straight line.",
  },
  stokes_law: {
    term: "Stokes' law (settling velocity)",
    alias: ["terminal velocity", "settling", "sedimentation"],
    def: "Terminal settling velocity of a small sphere in a fluid, v_t = g·d²·(ρ_p − ρ)/(18μ). Valid only in the laminar regime, particle Reynolds number below about 1.",
  },
  centrifugation: {
    term: "Centrifugation",
    alias: ["centrifugal separation", "centrifugal settling"],
    def: "Separation of particles or liquids of different density by centrifugal force. Centrifugal acceleration is r·ω²; its ratio to gravity, r·ω²/g, is the separation factor (g-force).",
  },
  fluidized_bed: {
    term: "Fluidized bed",
    alias: ["fluidization"],
    def: "Bed of solids suspended by upward fluid flow so that it behaves like a liquid. Gives good heat and mass transfer and uniform temperature, but causes attrition and entrainment. Once fluidized, the pressure drop stays nearly constant as velocity increases.",
  },
  min_fluidization_velocity: {
    term: "Minimum fluidization velocity (u_mf)",
    alias: ["minimum fluidization", "incipient fluidization velocity"],
    def: "Superficial velocity at which the bed just begins to fluidize; the bed pressure drop equals the buoyant weight per unit area, ΔP/L = (1 − ε)(ρ_p − ρ)g, solved together with the Ergun equation.",
  },
  size_reduction_laws: {
    term: "Size reduction laws (Rittinger, Kick, Bond)",
    alias: ["comminution", "grinding", "Rittinger's law", "Kick's law", "Bond's law", "work index"],
    def: "Empirical laws for grinding energy. Rittinger: proportional to new surface (1/D₂ − 1/D₁), fine grinding; Kick: proportional to size ratio ln(D₁/D₂), coarse crushing; Bond: W = 10·W_i·(1/√P − 1/√F) with P, F the 80 %-passing sizes in µm, for the intermediate range.",
  },
  sieve_analysis: {
    term: "Sieve (screen) analysis",
    alias: ["particle size analysis", "mesh", "Tyler sieve"],
    def: "Determining particle size distribution by shaking a sample through a stack of progressively finer sieves and weighing what each retains. Mesh number is openings per linear inch; results are shown as a cumulative passing curve.",
  },
  fick_law: {
    term: "Fick's law of diffusion",
    alias: ["Fick's first law", "molecular diffusion"],
    def: "Molecular diffusion flux is proportional to the concentration gradient, J_A = −D_AB·dC_A/dz. For unsteady concentration fields Fick's second law ∂C_A/∂t = D_AB·∂²C_A/∂z² applies.",
  },
  diffusivity: {
    term: "Diffusivity (D_AB)",
    alias: ["diffusion coefficient"],
    def: "Property describing how fast a species spreads by molecular motion. Gases about 10⁻⁵ m²/s, liquids about 10⁻⁹ m²/s; gas diffusivity rises with temperature and is inversely proportional to pressure.",
  },
  schmidt_number: {
    term: "Schmidt number (Sc)",
    alias: ["Schmidt"],
    def: "Ratio of momentum diffusivity to mass diffusivity, Sc = μ/(ρ·D_AB) = ν/D_AB. The mass-transfer counterpart of the Prandtl number: about 1 for gases, hundreds or more for liquids.",
  },
  sherwood_number: {
    term: "Sherwood number (Sh)",
    alias: ["Sherwood"],
    def: "Ratio of convective mass transfer to molecular diffusion, Sh = k_c·L/D_AB. The mass-transfer counterpart of the Nusselt number; mass transfer coefficients come from correlations Sh = f(Re, Sc).",
  },
  film_theory: {
    term: "Film theory (two-film theory)",
    alias: ["two-film theory", "stagnant film model"],
    def: "Model with a thin stagnant film on each side of the interface through which transfer is by molecular diffusion only. The coefficient is proportional to diffusivity (k = D/δ), and the phases are assumed in equilibrium at the interface.",
  },
  penetration_theory: {
    term: "Penetration theory (Higbie)",
    alias: ["penetration model", "surface renewal theory", "Danckwerts"],
    def: "Model in which fluid elements stay at the interface for a short time and absorb by unsteady diffusion. The coefficient is proportional to the square root of diffusivity (k ∝ D^0.5); Danckwerts' surface renewal theory treats the contact time as a distribution.",
  },
  wet_bulb_temperature: {
    term: "Wet-bulb temperature",
    alias: ["wet bulb"],
    def: "Temperature of a thermometer covered by a wet wick in a sufficiently fast air stream, where evaporative cooling balances heat transfer from the air. Below the dry-bulb temperature for unsaturated air; equal to it for saturated air.",
  },
  adiabatic_saturation_temperature: {
    term: "Adiabatic saturation temperature",
    alias: ["adiabatic cooling line", "Lewis relation"],
    def: "Temperature reached when air is saturated by contact with water without heat exchange with the surroundings. For air–water the Lewis number is about 1, so it is nearly equal to the wet-bulb temperature.",
  },
};

Object.assign(window, { GLOSSARY_UNITOP_EN });
