// 용어사전 자료 · 유체·열전달 — 영어판. 한국어 기준은 glossary_fluid.jsx(같은 key).
// 한글이 든 필드(term·def·alias·unit·ref)만 여기에 둡니다. exams·calc·see·src 는 한국어 파일에만 있습니다.

const GLOSSARY_FLUID_EN = {
  bernoulli: {
    term: "Bernoulli equation",
    alias: ["Bernoulli's principle", "mechanical energy balance"],
    def: "For steady, incompressible, inviscid flow along a streamline the sum of pressure, kinetic and potential heads is constant: P/(ρg) + v²/(2g) + z = constant. In real piping it is used as a mechanical energy balance with pump head and friction head-loss terms added.",
  },
  continuity_equation: {
    term: "Continuity equation",
    alias: ["mass conservation"],
    def: "Mass balance for steady flow: the mass flow rate is the same at every cross-section, ρ₁A₁v₁ = ρ₂A₂v₂. For incompressible flow A₁v₁ = A₂v₂, so halving the diameter quadruples the velocity.",
  },
  newtonian_fluid: {
    term: "Newtonian fluid",
    alias: ["Newton's law of viscosity"],
    def: "Fluid in which shear stress is proportional to shear rate, τ = μ·(du/dy), with a viscosity independent of shear rate. Water, air and most low-molecular-weight liquids are Newtonian.",
  },
  non_newtonian_fluid: {
    term: "Non-Newtonian fluid",
    alias: ["Bingham plastic", "pseudoplastic", "shear-thinning", "dilatant", "power-law fluid"],
    def: "Fluid whose apparent viscosity varies with shear rate: pseudoplastic (shear-thinning, polymer solutions), dilatant (shear-thickening, starch slurries) and Bingham plastic, which flows only above a yield stress (toothpaste). Often described by the power law τ = K·(du/dy)ⁿ.",
  },
  kinematic_viscosity: {
    term: "Kinematic viscosity (ν)",
    alias: ["momentum diffusivity", "centistokes"],
    def: "Viscosity divided by density, ν = μ/ρ. 1 St = 1 cm²/s; water at 20 °C is about 1 cSt (1.0×10⁻⁶ m²/s). The Reynolds number can be written Re = v·D/ν.",
  },
  hydraulic_diameter: {
    term: "Hydraulic diameter (D_h)",
    alias: ["equivalent diameter", "hydraulic radius"],
    def: "Length used to treat a non-circular channel like a round pipe: D_h = 4 × flow area ÷ wetted perimeter. It equals the diameter for a round pipe and D_o − D_i for an annulus; the hydraulic radius is one quarter of it.",
  },
  equivalent_length: {
    term: "Equivalent length (L_e)",
    alias: ["L/D"],
    def: "Friction loss of a valve or fitting expressed as the length of straight pipe giving the same loss, usually as a multiple of diameter L_e/D. Related to the loss coefficient by K = f_D·L_e/D (f_D: Darcy friction factor).",
  },
  moody_chart: {
    term: "Moody chart",
    alias: ["Moody diagram", "Colebrook equation"],
    def: "Chart of the Darcy friction factor against Reynolds number and relative roughness ε/D. Laminar flow is the line f = 64/Re; turbulent flow follows the Colebrook equation, and at very high Re f depends on ε/D only (fully rough).",
  },
  hagen_poiseuille: {
    term: "Hagen–Poiseuille equation",
    alias: ["Poiseuille's law", "laminar pressure drop"],
    def: "Pressure drop for laminar flow in a round pipe, ΔP = 32·μ·L·v/D² = 128·μ·L·Q/(π·D⁴). Pressure drop is proportional to velocity to the first power and the Darcy friction factor is 64/Re. Valid only below Re of about 2100.",
  },
  fanning_friction: {
    term: "Fanning friction factor (f_F)",
    alias: ["Fanning factor", "Darcy vs Fanning"],
    def: "Wall shear stress divided by kinetic energy per volume, f_F = τ_w/(ρv²/2); one quarter of the Darcy factor (f_D = 4·f_F). Pressure drop is ΔP = 4·f_F·(L/D)·ρv²/2 and f_F = 16/Re in laminar flow. Check which factor a textbook or chart uses.",
  },
  cavitation: {
    term: "Cavitation",
    alias: ["cavitation damage"],
    def: "Formation of vapor bubbles where local pressure falls below the liquid vapor pressure, followed by their collapse in higher-pressure regions. Causes noise, vibration, impeller erosion and loss of performance; prevented by keeping NPSHa sufficiently above NPSHr.",
  },
  water_hammer: {
    term: "Water hammer",
    alias: ["hydraulic shock", "surge", "Joukowsky equation"],
    def: "Pressure wave and large pressure surge produced when the flow velocity in a pipe changes suddenly, as on rapid valve closure or pump trip. The maximum rise is estimated by the Joukowsky equation ΔP = ρ·a·Δv (a: wave speed); reduced by slow valve closure, surge tanks or air chambers.",
  },
  affinity_laws: {
    term: "Pump affinity laws",
    alias: ["affinity laws", "similarity laws", "fan laws"],
    def: "For a given centrifugal pump, changing speed N gives flow Q ∝ N, head H ∝ N² and shaft power P ∝ N³. For small impeller trims the approximate relations Q ∝ D, H ∝ D², P ∝ D³ are used.",
  },
  pump_operating_point: {
    term: "Pump curve and operating point",
    alias: ["pump characteristic curve", "system curve", "operating point", "H-Q curve"],
    def: "The pump curve gives head, efficiency, shaft power and NPSHr against flow; the system curve gives the head the piping requires (static head plus losses proportional to flow squared). Their intersection is the operating point, which should lie near the best efficiency point (BEP).",
  },
  centrifugal_pump: {
    term: "Centrifugal pump",
    alias: ["volute pump"],
    def: "Pump in which a rotating impeller gives kinetic energy to the liquid and the casing converts it to pressure. Easy flow control and no pulsation, but poor for high-viscosity liquids; needs priming and is normally started with the discharge valve closed.",
  },
  positive_displacement_pump: {
    term: "Positive displacement pump",
    alias: ["reciprocating pump", "rotary pump", "gear pump", "diaphragm pump"],
    def: "Pump that traps and pushes a fixed volume of liquid: reciprocating (piston, plunger, diaphragm) or rotary (gear, screw). Flow is nearly independent of discharge pressure, so a blocked discharge keeps raising the pressure and a relief valve is fitted on the discharge. Used for viscous, high-pressure and metering duty.",
  },
  compressor: {
    term: "Compressor",
    alias: ["blower", "compression ratio", "surge"],
    def: "Machine that raises gas pressure: reciprocating, rotary, centrifugal or axial. High compression ratios are split into stages with intercooling to reduce power and discharge temperature. Centrifugal compressors surge at low flow.",
  },
  venturi_meter: {
    term: "Venturi meter",
    alias: ["venturi tube"],
    def: "Differential-pressure flowmeter with a gradual contraction and expansion; flow is found from the pressure drop at the throat. Much lower permanent pressure loss than an orifice and a high discharge coefficient (about 0.98), but long and costly.",
  },
  pitot_tube: {
    term: "Pitot tube",
    alias: ["pitot-static tube"],
    def: "Instrument measuring the local point velocity from the difference between the impact (total) pressure and the static pressure, v = √(2·ΔP/ρ). The average velocity requires a traverse of several points across the section.",
  },
  rotameter: {
    term: "Rotameter (variable-area flowmeter)",
    alias: ["variable-area flowmeter", "float meter"],
    def: "Variable-area meter in which a float rises in a vertical tapered tube to a height that depends on flow. Pressure drop stays nearly constant while flow area changes; must be mounted vertically and corrected when fluid density changes.",
  },
  fourier_law: {
    term: "Fourier's law (conduction)",
    alias: ["Fourier law", "law of heat conduction"],
    def: "Conductive heat flux is proportional to the temperature gradient, q″ = −k·dT/dx. Steady conduction through a plane wall is q = k·A·ΔT/L; through a cylinder q = 2πkL·ΔT/ln(r₂/r₁).",
  },
  newton_cooling: {
    term: "Newton's law of cooling (convection)",
    alias: ["Newton's law of cooling", "convection rate equation"],
    def: "Convective heat transfer between a surface and a fluid is proportional to their temperature difference, q = h·A·(T_s − T_∞). The coefficient h depends on fluid properties and flow and is obtained from Nusselt-number correlations.",
  },
  stefan_boltzmann: {
    term: "Stefan–Boltzmann law (radiation)",
    alias: ["Stefan-Boltzmann", "radiation heat transfer"],
    def: "A blackbody emits radiant energy proportional to the fourth power of absolute temperature, E_b = σ·T⁴ (σ = 5.67×10⁻⁸ W/(m²·K⁴)). A real surface emits E = ε·σ·T⁴; net exchange of a small body in large surroundings is q = ε·σ·A·(T_s⁴ − T_sur⁴).",
  },
  blackbody: {
    term: "Blackbody",
    alias: ["blackbody radiation", "Wien's displacement law"],
    def: "Ideal surface that absorbs all incident radiation and emits the maximum possible radiation at a given temperature. The wavelength of peak emission follows Wien's displacement law λ_max·T ≈ 2898 µm·K.",
  },
  emissivity: {
    term: "Emissivity (ε)",
    alias: ["emittance", "absorptivity", "Kirchhoff's law", "gray body"],
    def: "Ratio of a real surface's emitted radiation to that of a blackbody at the same temperature, between 0 and 1. Low for polished metals, high for oxidized or painted surfaces. For a gray surface, Kirchhoff's law makes absorptivity equal to emissivity.",
  },
  grashof: {
    term: "Grashof number (Gr)",
    alias: ["Rayleigh number", "natural convection"],
    def: "Ratio of buoyancy to viscous forces in natural convection, Gr = g·β·(T_s − T_∞)·L³/ν². Natural-convection Nusselt numbers are correlated with the Rayleigh number Ra = Gr·Pr.",
  },
  biot: {
    term: "Biot number (Bi)",
    alias: ["lumped capacitance method"],
    def: "Ratio of internal conduction resistance of a solid to its surface convection resistance, Bi = h·L_c/k_s (L_c = volume/surface area, k_s: solid conductivity). For Bi < 0.1 the solid temperature is nearly uniform and the lumped-capacitance method applies. Distinct from the Nusselt number, which uses the fluid k.",
  },
  fin_efficiency: {
    term: "Fin efficiency",
    alias: ["extended surface", "fin"],
    def: "Heat actually transferred by a fin divided by the heat it would transfer if the whole fin were at the base temperature. For a straight fin of uniform section with an adiabatic tip, η_f = tanh(mL)/(mL), m = √(h·P/(k·A_c)); short fins of high conductivity are more efficient.",
  },
  fouling_factor: {
    term: "Fouling factor",
    alias: ["fouling resistance", "fouling", "scale"],
    def: "Thermal resistance added by scale and deposits that build up on heat transfer surfaces in service. Included in the design overall coefficient, e.g. 1/U = 1/h_o + R_f,o + (wall) + R_f,i + 1/h_i (with area corrections between inside and outside), so that the area has a margin.",
  },
  boiling_curve: {
    term: "Boiling curve (nucleate and film boiling)",
    alias: ["nucleate boiling", "film boiling", "critical heat flux", "Leidenfrost point", "boiling"],
    def: "Boiling heat flux against excess temperature (wall minus saturation temperature): free convection → nucleate boiling (vigorous bubbles, very high heat transfer) → critical heat flux (maximum) → transition boiling → film boiling (a vapor film blankets the wall). The minimum heat flux of film boiling is the Leidenfrost point. In heat-flux-controlled equipment, exceeding the critical heat flux can cause a sudden wall-temperature jump and burnout.",
  },
  condensation: {
    term: "Condensation (film and dropwise)",
    alias: ["film condensation", "dropwise condensation", "Nusselt condensation theory"],
    def: "Change of vapor to liquid on a wall colder than the saturation temperature. Film condensation, where condensate covers the wall, is usual and is analyzed by Nusselt's theory; dropwise condensation gives coefficients several times to an order of magnitude higher. Non-condensable gases sharply reduce heat transfer.",
  },
  effectiveness_ntu: {
    term: "Heat exchanger effectiveness–NTU method",
    alias: ["epsilon-NTU method", "effectiveness", "NTU method", "heat capacity ratio"],
    def: "Exchanger analysis used when outlet temperatures are unknown. Effectiveness ε = q/q_max with q_max = C_min·(T_h,in − T_c,in), NTU = U·A/C_min, capacity ratio C_r = C_min/C_max; q follows from ε–NTU relations or charts for each flow arrangement.",
  },
  shell_and_tube: {
    term: "Shell-and-tube heat exchanger",
    alias: ["tubular exchanger", "baffle", "TEMA"],
    def: "Exchanger with a bundle of tubes in a cylindrical shell; one fluid flows inside the tubes, the other on the shell side. Shell-side baffles redirect the flow to raise heat transfer; for multipass units the LMTD is multiplied by a correction factor F. Fouling, high-pressure or corrosive fluids usually go on the tube side.",
  },
};

Object.assign(window, { GLOSSARY_FLUID_EN });
