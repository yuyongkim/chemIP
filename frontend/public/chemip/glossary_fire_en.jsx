// 용어사전 자료 · 화재·폭발 — 영어판. key 는 glossary_fire.jsx(GLOSSARY_FIRE_KO)와 같습니다.
// 한글이 든 필드(term·def·alias·law·ref)만 영어로 둡니다. exams·calc·see·src·lawUrl 은 한국어 파일에서 읽습니다.

const GLOSSARY_FIRE_EN = {
  flash_point: {
    term: "Flash point",
    alias: ["Flash point", "closed-cup flash point", "open-cup flash point"],
    def: "The lowest liquid temperature at which the vapor above the surface, mixed with air, ignites momentarily when an external flame is applied. At this temperature the vapor concentration is roughly at the lower flammable limit. Closed-cup methods (Tag, Pensky-Martens) give lower values than open-cup methods (Cleveland).",
  },
  fire_point: {
    term: "Fire point",
    alias: ["Fire point", "fire temperature"],
    def: "The lowest liquid temperature at which enough vapor is supplied for the flame to keep burning after ignition. It is taken as the temperature at which burning lasts at least 5 s in an open-cup test, and is usually a few °C above the flash point.",
  },
  autoignition_temp: {
    term: "Autoignition temperature (AIT)",
    alias: ["ignition temperature", "kindling point", "self-ignition temperature", "AIT"],
    def: "The lowest temperature at which a substance ignites by itself in air from heating alone, without an external flame. It depends on vessel size, pressure and oxygen concentration, and is the basis for choosing the temperature class of explosion-protected equipment.",
  },
  mie: {
    term: "Minimum ignition energy (MIE)",
    alias: ["MIE", "minimum ignition energy", "minimum spark ignition energy"],
    def: "The smallest electric spark energy that can ignite a flammable mixture. It is usually lowest slightly rich of stoichiometric, decreases with pressure and increases with added inert gas. Propane is about 0.25 mJ and hydrogen about 0.02 mJ, so even electrostatic discharges can ignite them.",
  },
  fire_triangle: {
    term: "Fire triangle and fire tetrahedron",
    alias: ["fire triangle", "fire tetrahedron", "fire triangle", "Fire tetrahedron"],
    def: "Combustion needs fuel, an oxidizer and an ignition source (heat) together: the fire triangle. Adding the chain reaction that sustains flaming combustion gives the fire tetrahedron. Extinguishment removes one or more of these.",
  },
  combustion_mode: {
    term: "Modes of combustion",
    alias: ["surface combustion", "decomposition combustion", "evaporative combustion", "self-combustion", "diffusion combustion", "premixed combustion"],
    def: "Ways of burning classified by state. Gases burn by diffusion or premixed combustion; liquids mainly by evaporative combustion. Solids show surface combustion (charcoal, coke, metal powder), decomposition combustion (wood, paper, coal), evaporative combustion (sulfur, naphthalene, paraffin) and self-combustion of materials containing oxygen in the molecule, such as nitrocellulose.",
  },
  spontaneous_ignition: {
    term: "Spontaneous ignition",
    alias: ["spontaneous ignition", "self-heating", "Spontaneous combustion"],
    def: "Ignition without an external source, in which heat from oxidation, decomposition, adsorption, polymerization or microbial fermentation builds up inside a material faster than it escapes until the ignition temperature is reached. Large surface area, low thermal conductivity and high ambient temperature favor it. Rags soaked in drying oil, coal piles and activated carbon are examples.",
  },
  extinguishing_principle: {
    term: "Principles of fire extinguishment",
    alias: ["cooling", "smothering", "fuel removal", "inhibition", "chemical flame inhibition"],
    def: "Classified by which element of combustion is cut off. Cooling lowers the temperature, for example with water; smothering lowers oxygen, usually to 15 % or less; removal takes away or cuts off the fuel; inhibition (negative catalysis) uses halon or dry chemical agents to capture the active radicals of the chain reaction. Dilution and emulsification are also used.",
  },
  fire_class: {
    term: "Fire classes (A, B, C, D, K)",
    alias: ["fire classification", "ordinary combustible fire", "flammable liquid fire", "electrical fire", "metal fire", "kitchen fire"],
    def: "Korean fire safety standards use Class A (ordinary combustibles: wood, paper, textiles), Class B (flammable liquids, including gases), Class C (energized electrical equipment) and Class K (cooking oil); textbooks add Class D (combustible metals such as sodium and magnesium). European EN 2 uses Class C for gas fires and Class F for cooking oil fires, so care is needed when reading foreign extinguisher labels.",
  },
  deflagration: {
    term: "Deflagration",
    alias: ["Deflagration", "deflagration"],
    def: "Combustion in which the flame front travels through the unburned mixture by heat and mass diffusion at less than the speed of sound. In a closed vessel, a hydrocarbon-air deflagration reaches a maximum pressure of roughly 8 to 10 times the initial pressure.",
  },
  detonation: {
    term: "Detonation",
    alias: ["Detonation", "detonation wave"],
    def: "Combustion in which a shock wave coupled to the reaction zone travels through the unburned mixture faster than sound (typically thousands of m/s). Pressure jumps discontinuously across the shock, producing far greater pressure and damage than a deflagration. The detonable concentration range is narrower than the flammable range.",
  },
  ddt: {
    term: "Deflagration-to-detonation transition (DDT)",
    alias: ["DDT", "deflagration to detonation transition", "run-up distance"],
    def: "The change of a deflagration into a detonation as turbulence accelerates the flame in long pipes or congested spaces. The distance the flame travels before transition is the run-up distance; it is shorter for smaller pipe diameters, higher pressures and faster-burning mixtures.",
  },
  bleve: {
    term: "Boiling liquid expanding vapor explosion (BLEVE)",
    alias: ["BLEVE", "BLEVE"],
    def: "An explosion caused when a pressure vessel holding liquid above its atmospheric boiling point ruptures and the contents flash and expand instantly. It usually follows an external fire heating and weakening the wall at the vapor space; if the contents are flammable, a fireball follows.",
  },
  vce: {
    term: "Vapor cloud explosion (VCE, UVCE)",
    alias: ["VCE", "UVCE", "unconfined vapor cloud explosion", "vapor cloud explosion"],
    def: "An explosion producing overpressure when a large release of flammable gas or vapor mixes with air into a cloud and is ignited after a delay. The overpressure depends strongly on equipment congestion and confinement, and is estimated by the TNT equivalence, TNO multi-energy or BST methods.",
  },
  flash_fire: {
    term: "Flash fire",
    alias: ["Flash fire", "flash fire"],
    def: "A fire in which an ignited flammable vapor cloud burns through the cloud (roughly to the lower flammable limit boundary) in an instant, with the flame moving too slowly to cause significant overpressure. It is lethal to people inside the cloud.",
  },
  pool_fire: {
    term: "Pool fire",
    alias: ["Pool fire", "liquid pool fire"],
    def: "A fire in which vapor from a pool of flammable liquid on the ground or inside a dike burns above the liquid surface. The burning rate is expressed as mass per unit pool area, and harm is assessed mainly from the flame's thermal radiation.",
  },
  jet_fire: {
    term: "Jet fire",
    alias: ["Jet fire", "jet flame"],
    def: "A fire in which pressurized flammable gas or two-phase fluid escapes through an opening at high velocity and ignites, forming a long, intense flame. Equipment hit directly by the flame can fail within a short time, leading to knock-on events such as a BLEVE.",
  },
  fireball: {
    term: "Fireball",
    alias: ["Fireball", "fireball"],
    def: "A rising, roughly spherical burning mass formed when a large quantity of flammable material released at once mixes with air and burns. It lasts only seconds to tens of seconds but its thermal radiation is very high; it usually follows a BLEVE.",
  },
  dust_explosion: {
    term: "Dust explosion",
    alias: ["dust explosion", "Dust explosion", "secondary explosion", "explosion pentagon"],
    def: "An explosion that occurs when combustible dust dispersed in air within its explosible concentration range is ignited. The explosion pentagon (the fire triangle plus dispersion and confinement) must be complete. The blast of a primary explosion often lifts settled dust and causes a larger secondary explosion.",
  },
  kst: {
    term: "Deflagration index (Kst)",
    alias: ["Kst", "KG", "cube-root law", "Cube-root law"],
    def: "The maximum rate of pressure rise in a dust explosion multiplied by the cube root of vessel volume, a measure of explosion violence independent of vessel size. Kst = (dP/dt)max · V^(1/3), in bar·m/s. The same form for gases is KG.",
  },
  pmax: {
    term: "Maximum explosion pressure (Pmax)",
    alias: ["Pmax", "maximum explosion pressure", "(dP/dt)max"],
    def: "The highest explosion pressure obtained in a closed test vessel (20 L sphere or 1 m³ vessel) over a range of concentrations. The maximum rate of pressure rise (dP/dt)max measured at the same time is used to calculate Kst.",
  },
  dust_class_st: {
    term: "Dust explosion class (St 0-3)",
    alias: ["St1", "St2", "St3", "St class", "dust explosion class"],
    def: "Classes of dust explosion violence by Kst: St 0 is Kst = 0 (no explosion), St 1 is above 0 up to 200, St 2 is above 200 up to 300, and St 3 is above 300 (bar·m/s). It is an input to the design of explosion vents and suppression systems.",
  },
  explosion_proof_d: {
    term: "Flameproof enclosure (Ex d)",
    alias: ["flameproof", "Ex d", "Flameproof"],
    def: "A protection type in which the enclosure withstands an internal explosion of gas that has entered it, and the flame passing through joint gaps (flame paths) is cooled so it does not ignite the surrounding gas.",
  },
  explosion_proof_p: {
    term: "Pressurized enclosure (Ex p)",
    alias: ["pressurization", "Ex p", "Pressurized"],
    def: "A protection type that keeps clean air or inert gas inside the enclosure at a pressure above the outside, so the surrounding explosive gas cannot enter. It has devices to alarm or cut power when the pressure drops.",
  },
  explosion_proof_e: {
    term: "Increased safety (Ex e)",
    alias: ["increased safety", "Ex e", "Increased safety"],
    def: "A protection type for equipment that does not arc or spark in normal operation, with additional measures on insulation, temperature rise and connections to reduce the chance of excessive temperatures or sparks. Used for terminal boxes, induction motors and the like.",
  },
  explosion_proof_i: {
    term: "Intrinsic safety (Ex i)",
    alias: ["intrinsic safety", "Ex ia", "Ex ib", "Intrinsic safety"],
    def: "A protection type that limits circuit voltage, current and stored energy so that sparks or heating cannot ignite explosive gas in normal operation or under specified faults. Level ia, which allows for two faults, may be used in Zone 0; level ib, allowing for one fault, up to Zone 1. Mainly used for instruments and sensors.",
  },
  explosion_proof_o: {
    term: "Liquid immersion (Ex o)",
    alias: ["oil immersion", "Ex o", "Oil immersion", "liquid immersion"],
    def: "A protection type in which parts that can spark or get hot are immersed in a protective liquid such as oil so that explosive gas above the surface is not ignited. Used for transformers, switchgear and the like.",
  },
  explosion_proof_q: {
    term: "Powder filling (Ex q)",
    alias: ["powder filling", "Ex q", "Powder filling"],
    def: "A protection type in which parts that could be an ignition source are covered by filling with a solid powder such as quartz sand, so an internal arc does not ignite the outside gas.",
  },
  explosion_proof_m: {
    term: "Encapsulation (Ex m)",
    alias: ["encapsulation", "Ex m", "Encapsulation"],
    def: "A protection type in which parts that could be an ignition source are fully enclosed in a compound such as resin so they cannot contact explosive gas. Used for small electronic parts, solenoid coils and the like.",
  },
  explosion_proof_n: {
    term: "Non-sparking / type of protection n (Ex n)",
    alias: ["type n", "Ex n", "Non-sparking"],
    def: "A protection type built so that in normal operation it does not ignite the surrounding explosive gas and faults that could cause ignition are unlikely. It is used only in Zone 2, where an explosive atmosphere is rare and short-lived.",
  },
  hazardous_area_gas: {
    term: "Gas hazardous areas (Zone 0, 1, 2)",
    alias: ["hazardous area", "Zone 0 area", "Zone 1 area", "Zone 2 area", "Zone 0", "Zone 1", "Zone 2"],
    def: "Areas classified by how often and how long an explosive gas atmosphere is present. Zone 0 is present continuously or for long periods (e.g. vapor space inside a tank); Zone 1 is likely to occur occasionally in normal operation; Zone 2 is not likely in normal operation and, if it occurs, persists only briefly. The zone determines which protection types may be used.",
    law: "Occupational Safety and Health Standards Rules",
  },
  hazardous_area_dust: {
    term: "Dust hazardous areas (Zone 20, 21, 22)",
    alias: ["dust hazardous area", "Zone 20 area", "Zone 21 area", "Zone 22 area", "Zone 20", "Zone 21", "Zone 22"],
    def: "Areas classified by how often and how long a combustible dust cloud is present. Zone 20 is present continuously or for long periods (e.g. inside silos and hoppers); Zone 21 is likely occasionally in normal operation; Zone 22 is not likely in normal operation and, if it occurs, persists only briefly.",
    law: "Occupational Safety and Health Standards Rules",
  },
  gas_group: {
    term: "Gas groups (IIA, IIB, IIC)",
    alias: ["explosion group", "gas group", "IIA", "IIB", "IIC"],
    def: "Groups of explosive gases by how hard it is to stop flame transmission. By MESG, IIA is above 0.9 mm (e.g. propane), IIB is 0.5 to 0.9 mm (e.g. ethylene) and IIC is below 0.5 mm (e.g. hydrogen, acetylene). IIC equipment may also be used for IIA and IIB. Firedamp (methane) in mines is Group I.",
  },
  temp_class: {
    term: "Temperature class (T1-T6)",
    alias: ["temperature class", "T1", "T6", "maximum surface temperature"],
    def: "Classes by the maximum surface temperature of explosion-protected equipment: T1 450 °C, T2 300 °C, T3 200 °C, T4 135 °C, T5 100 °C and T6 85 °C or less. Equipment must be chosen with a class below the autoignition temperature of the surrounding gas.",
  },
  mesg: {
    term: "Maximum experimental safe gap (MESG)",
    alias: ["MESG", "maximum experimental safe gap", "safe gap"],
    def: "The largest gap, with a 25 mm gap length, through which an explosion inside a standard test vessel does not ignite the gas outside. It is the basis for flameproof joint design and for gas group classification.",
  },
  quenching_distance: {
    term: "Quenching distance",
    alias: ["quenching distance", "Quenching distance", "quenching diameter"],
    def: "The narrowest spacing between two plates or within a tube through which a flame can pass. Below it, heat loss to the walls extinguishes the flame. Flame arresters use this principle, and mixtures with larger quenching distances also have larger minimum ignition energies.",
  },
  static_charging: {
    term: "Electrostatic charging",
    alias: ["static electricity", "frictional charging", "flow charging", "separation charging", "spray charging"],
    def: "The build-up of charge on one side when dissimilar materials contact and separate. By mechanism it is divided into friction, separation, flow (liquid in pipes), spray, impact, stirring and induction charging. It is especially large when low-conductivity hydrocarbon liquids or powders are moved quickly.",
  },
  static_dissipation: {
    term: "Static charge relaxation and control",
    alias: ["charge relaxation", "relaxation time", "static eliminator", "antistatic agent", "Relaxation time"],
    def: "Removing accumulated charge or preventing its build-up. Charge on a body falls to about 37 % of its initial value in one relaxation time τ = ε/σ (permittivity divided by conductivity). Measures include grounding and bonding, limiting pipe flow velocity, raising humidity, antistatic additives and ionizers, and allowing a relaxation time after filling a tank.",
  },
  grounding_bonding: {
    term: "Grounding and bonding",
    alias: ["grounding", "bonding", "Grounding", "Bonding"],
    def: "Bonding connects conductors to each other so they share the same potential and cannot discharge between them; grounding (earthing) connects a conductor to earth so charge drains away. For static control a resistance to ground of about 1 MΩ or less is generally considered sufficient. It does not work on insulators.",
  },
  inerting_purge: {
    term: "Inerting (purging)",
    alias: ["purging", "vacuum purging", "pressure purging", "sweep-through purging", "siphon purging", "Inerting"],
    def: "Using an inert gas such as nitrogen or carbon dioxide to bring oxygen safely below the limiting oxygen concentration (LOC). Vacuum and pressure purging repeat evacuation or pressurization; after j cycles the oxygen mole fraction is yⱼ = y₀(P_L/P_H)ʲ. Sweep-through purging feeds gas in at one end and out at the other; siphon purging fills the vessel with liquid and drains it while admitting inert gas.",
  },
  flame_arrester: {
    term: "Flame arrester",
    alias: ["flame arrester", "Flame arrester", "flame screen"],
    def: "A device that removes heat from a flame in an element with many narrow passages so that the flame is quenched and cannot travel through piping or vents. By location it is end-of-line or in-line; by duty, deflagration or detonation type; it is selected for the gas group concerned.",
  },
  explosion_vent: {
    term: "Explosion vent",
    alias: ["explosion venting", "vent panel", "Explosion vent", "explosion pressure relief"],
    def: "A device in which a weak panel or door opens first during a deflagration inside a vessel, releasing pressure and flame in a safe direction and keeping the pressure below what the vessel can withstand (reduced explosion pressure Pred). Vent area is set from Kst, Pmax, vessel volume and strength.",
  },
  explosion_suppression: {
    term: "Explosion suppression",
    alias: ["explosion suppression", "suppression system", "Explosion suppression", "explosion isolation"],
    def: "A protection method that detects the early pressure rise of a deflagration within milliseconds and injects an extinguishing agent instantly, putting out the explosion before it grows. It is used with explosion isolation, which keeps the flame from spreading to connected equipment.",
  },
  hazard_index_h: {
    term: "Hazard index H",
    alias: ["degree of hazard", "flammability range hazard index"],
    def: "The width of the flammable range relative to the lower limit, H = (U − L) / L, where U and L are the upper and lower flammable limits (vol%). A larger value indicates a more hazardous substance.",
  },
  burgess_wheeler: {
    term: "Burgess-Wheeler law",
    alias: ["Burgess-Wheeler", "Burgess-Wheeler"],
    def: "An empirical rule that for saturated hydrocarbons the product of the lower flammable limit L (vol%) and the molar heat of combustion Q (kcal/mol) is nearly constant, L × Q ≈ 1,050. The temperature corrections LFL_T = LFL₂₅ − 0.75(T − 25)/ΔHc and UFL_T = UFL₂₅ + 0.75(T − 25)/ΔHc are also known by this name.",
  },
  jones_eq: {
    term: "Jones equations",
    alias: ["Jones equation", "Jones equation"],
    def: "Empirical equations that estimate the flammable limits of many hydrocarbons from the stoichiometric concentration Cst: LFL ≈ 0.55·Cst and UFL ≈ 3.50·Cst, with Cst obtained from the moles of oxygen needed to burn 1 mol of fuel completely.",
  },
  thermal_runaway: {
    term: "Thermal runaway (runaway reaction)",
    alias: ["thermal runaway", "runaway reaction", "runaway", "Runaway reaction"],
    def: "An uncontrollable acceleration in which heat generation from an exothermic reaction exceeds cooling capacity, the temperature rises and the higher temperature speeds the reaction further. Because heat generation grows exponentially with temperature while heat removal grows roughly linearly, past the point where the curves no longer meet the situation cannot be recovered (Semenov theory).",
  },
  adiabatic_temp_rise: {
    term: "Adiabatic temperature rise (ΔTad)",
    alias: ["adiabatic temperature rise", "ΔTad", "MTSR"],
    def: "The temperature rise when cooling is lost completely and all remaining reaction heat goes into heating the reaction mass: ΔTad = (−ΔHr)·C₀ / (ρ·cp). The process temperature plus ΔTad for the unreacted accumulation is the maximum temperature of the synthesis reaction (MTSR), used to rank reaction hazards.",
  },
  tmr_ad: {
    term: "Time to maximum rate under adiabatic conditions (TMRad)",
    alias: ["TMRad", "TD24", "time to maximum rate"],
    def: "The time for a decomposition or reaction to reach its maximum rate once conditions become adiabatic. With a zero-order approximation, TMRad = cp·R·T² / (q·Ea). The temperature at which TMRad equals 24 h is TD24, used to judge the safety margin of the process temperature.",
  },
  self_reactive: {
    term: "Self-reactive substance",
    alias: ["self-reactive substance", "Self-reactive substance", "self-reactive"],
    def: "A thermally unstable substance that can decompose strongly exothermically by itself, without oxygen supply. GHS divides them into types A to G by explosive properties and violence of decomposition; Korean hazardous materials rules treat them as Class 5 (self-reactive substances).",
  },
  sadt: {
    term: "Self-accelerating decomposition temperature (SADT)",
    alias: ["SADT", "self-accelerating decomposition temperature"],
    def: "The lowest ambient temperature at which a substance in its transport packaging can undergo self-accelerating decomposition. It is the basis for setting control and emergency temperatures when transporting self-reactive substances and organic peroxides.",
  },
};

Object.assign(window, { GLOSSARY_FIRE_EN });
