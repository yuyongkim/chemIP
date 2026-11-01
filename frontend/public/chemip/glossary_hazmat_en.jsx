// 용어사전 자료 · 위험물(위험물안전관리법) — 영어판. 키와 순서는 glossary_hazmat.jsx 와 같습니다.
// 한국어에 한글이 들어간 필드(term·def·alias·law)만 둡니다. exams·calc·see·src·lawUrl 은 한국어 파일에서 읽습니다.

const HM_LAW_NAMES = {
  act: "Dangerous Substances Safety Management Act",
  decree: "Enforcement Decree of the Dangerous Substances Safety Management Act",
  rule: "Enforcement Rule of the Dangerous Substances Safety Management Act",
};

const GLOSSARY_HAZMAT_EN = {
  // Basic concepts
  hazmat_definition: {
    term: "Dangerous substance (hazmat)",
    alias: ["hazardous material", "dangerous goods under the Act"],
    def: "An article with flammable, ignitable or similar properties that is specified by Presidential Decree. Annex 1 of the Enforcement Decree breaks it down into Classes 1 to 6, each with item names and designated quantities.",
    law: HM_LAW_NAMES.act + ", Article 2; " + HM_LAW_NAMES.decree + ", Annex 1",
  },
  designated_quantity: {
    term: "Designated quantity",
    alias: ["threshold quantity"],
    def: "The quantity set by Presidential Decree for each kind of dangerous substance in view of its hazard, serving as the minimum threshold for facility permits and similar controls. Storing or handling at or above it brings the Act into force; below it, municipal or provincial ordinances apply.",
    law: HM_LAW_NAMES.act + ", Articles 2 and 4; " + HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_multiple: {
    term: "Multiple of the designated quantity",
    alias: ["designated quantity multiple", "sum of multiples"],
    def: "The amount stored or handled divided by the designated quantity. When substances with different item names or designated quantities are kept in one place, the ratios (amount / designated quantity) for each item are summed; a total of 1 or more counts as handling at or above the designated quantity.",
    law: HM_LAW_NAMES.act + ", Article 5",
  },
  hazmat_temporary_storage: {
    term: "Temporary storage of dangerous substances",
    alias: ["temporary storage", "provisional storage"],
    def: "Dangerous substances at or above the designated quantity may not be stored or handled outside a licensed facility, but with the approval of the competent fire station chief they may be stored or handled temporarily for up to 90 days. Temporary storage by military units for military purposes is also excepted.",
    law: HM_LAW_NAMES.act + ", Article 5",
  },
  hazmat_install_permit: {
    term: "Facility installation permit",
    alias: ["installation permit", "modification permit"],
    def: "Installing a manufacturing, storage or handling facility, or changing important aspects of its location, structure or equipment, requires a permit from the mayor or provincial governor. After the permit, the tank safety performance test (if tanks are involved) and the completion inspection must be passed before use.",
    law: HM_LAW_NAMES.act + ", Article 6",
  },

  // Classes 1-6
  hazmat_class1: {
    term: "Class 1 dangerous substance (oxidizing solid)",
    alias: ["oxidizing solid", "Class 1"],
    def: "A solid that shows specified behaviour in tests of latent oxidizing hazard or sensitivity to impact. It is non-combustible itself but releases oxygen and supports combustion of fuels. Items include chlorites, chlorates, perchlorates and inorganic peroxides (designated quantity 50 kg), bromates, nitrates and iodates (300 kg), and permanganates and dichromates (1,000 kg).",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_class2: {
    term: "Class 2 dangerous substance (flammable solid)",
    alias: ["combustible solid", "Class 2"],
    def: "A solid that shows specified behaviour in tests of ignition by flame or flammability; these are reducing substances that ignite at relatively low temperatures. Items include phosphorus sulfides, red phosphorus and sulfur (designated quantity 100 kg), iron powder, metal powders and magnesium (500 kg), and flammable solids (1,000 kg).",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_class3: {
    term: "Class 3 dangerous substance (pyrophoric and water-reactive substances)",
    alias: ["pyrophoric and water-reactive substances", "Class 3"],
    def: "A solid or liquid that may ignite spontaneously in air, or that ignites or evolves flammable gas on contact with water. Items include potassium, sodium, alkylaluminium and alkyllithium (designated quantity 10 kg), white phosphorus (20 kg), alkali and alkaline-earth metals and organometallic compounds (50 kg), and metal hydrides, metal phosphides and calcium or aluminium carbides (300 kg).",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_class4: {
    term: "Class 4 dangerous substance (flammable liquid)",
    alias: ["flammable liquid", "Class 4"],
    def: "A liquid with a flammability hazard (for Class 3 and Class 4 petroleums and animal/vegetable oils, one that is liquid at 1 atm and 20 °C). It is divided into special flammables, Class 1 petroleums, alcohols, Class 2, 3 and 4 petroleums, and animal/vegetable oils, mainly according to flash point.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_class5: {
    term: "Class 5 dangerous substance (self-reactive substance)",
    alias: ["self-reactive substance", "Class 5"],
    def: "A solid or liquid that shows specified behaviour in tests of explosive hazard or violence of thermal decomposition. Because the molecule carries its own oxygen, it decomposes and burns without external oxygen, so smothering is ineffective. Items include organic peroxides, nitrate esters, nitro compounds, nitroso compounds, azo compounds, diazo compounds and hydrazine derivatives; the designated quantity depends on the type (Type 1 or Type 2) assigned from test results.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_class6: {
    term: "Class 6 dangerous substance (oxidizing liquid)",
    alias: ["oxidizing liquid", "Class 6"],
    def: "A liquid that shows specified behaviour in tests of latent oxidizing hazard. It is non-combustible itself but supports combustion of fuels. Items include perchloric acid, hydrogen peroxide and nitric acid, with a designated quantity of 300 kg.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },

  // Item names
  hazmat_flammable_solid: {
    term: "Flammable solid (Class 2 item)",
    alias: ["flammable solid", "solid alcohol"],
    def: "Solid alcohol and other solids with a flash point below 40 °C at 1 atm. It belongs to Class 2 with a designated quantity of 1,000 kg.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_metal_powder: {
    term: "Metal powder",
    alias: ["metal powders"],
    def: "Powders of metals other than alkali metals, alkaline-earth metals, iron and magnesium, classified under Class 2. Copper and nickel powders, and powders of which less than 50 wt% passes a 150 µm sieve, are excluded. Because they can release hydrogen with water, water-based extinguishing is avoided.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_pyrophoric: {
    term: "Pyrophoric substance",
    alias: ["pyrophoric", "air-reactive substance"],
    def: "A Class 3 substance that may ignite spontaneously in air, typified by white phosphorus and alkylaluminium. White phosphorus is stored under water and alkylaluminium is blanketed with inert gas to keep air out.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_water_reactive: {
    term: "Water-reactive substance",
    alias: ["water-reactive", "substance prohibited from water contact"],
    def: "A Class 3 substance that ignites or evolves flammable gas on contact with water. Potassium and sodium release hydrogen, calcium carbide releases acetylene and calcium phosphide releases phosphine, so water extinguishing is prohibited and dry sand or similar is used to smother fires.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  special_flammable: {
    term: "Special flammable",
    alias: ["special flammable substance", "extremely flammable liquid"],
    def: "Carbon disulfide, diethyl ether and other substances with an autoignition temperature of 100 °C or below at 1 atm, or a flash point of -20 °C or below and a boiling point of 40 °C or below. It is the most hazardous Class 4 item, with a designated quantity of 50 L, and falls in hazard grade I.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  petroleum_class1: {
    term: "Class 1 petroleum",
    alias: ["first petroleum class"],
    def: "Acetone, gasoline and other liquids with a flash point below 21 °C at 1 atm. The designated quantity is 200 L for water-insoluble and 400 L for water-soluble liquids.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_alcohols: {
    term: "Alcohols (Class 4 item)",
    alias: ["alcohols (dangerous substance)"],
    def: "Saturated monohydric alcohols with one to three carbon atoms per molecule (including denatured alcohol), namely methanol, ethanol and propanol. Aqueous solutions below 60 wt% and certain others are excluded; the designated quantity is 400 L.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  petroleum_class2: {
    term: "Class 2 petroleum",
    alias: ["second petroleum class"],
    def: "Kerosene, diesel and other liquids with a flash point of 21 °C or above and below 70 °C at 1 atm. The designated quantity is 1,000 L for water-insoluble and 2,000 L for water-soluble liquids.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  petroleum_class3: {
    term: "Class 3 petroleum",
    alias: ["third petroleum class"],
    def: "Heavy oil, creosote oil and other liquids with a flash point of 70 °C or above and below 200 °C at 1 atm. The designated quantity is 2,000 L for water-insoluble and 4,000 L for water-soluble liquids.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  petroleum_class4: {
    term: "Class 4 petroleum",
    alias: ["fourth petroleum class"],
    def: "Gear oil, cylinder oil and other liquids with a flash point of 200 °C or above and below 250 °C at 1 atm. The designated quantity is 6,000 L.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_animal_vegetable_oil: {
    term: "Animal and vegetable oils",
    alias: ["animal/vegetable oils", "drying oil"],
    def: "Oils extracted from animal tissue or from plant seeds or pulp with a flash point below 250 °C at 1 atm. The designated quantity is 10,000 L; drying oils with a high iodine value carry a significant risk of spontaneous ignition.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_water_soluble: {
    term: "Water-soluble liquid",
    alias: ["water-soluble", "water-insoluble"],
    def: "The criterion used to split Class 4 designated quantities into water-soluble and water-insoluble: a liquid that, after being gently mixed with an equal volume of distilled water under set conditions, keeps a uniform appearance once flow stops. A water-soluble liquid has twice the designated quantity of the insoluble one under the same item name.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_organic_peroxide: {
    term: "Organic peroxide",
    alias: ["organic peroxides"],
    def: "A Class 5 substance with an -O-O- bond, formally hydrogen peroxide with hydrogen replaced by organic groups, such as benzoyl peroxide or methyl ethyl ketone peroxide. It readily decomposes or explodes by heat, impact or friction, so it is kept cool and free of contamination.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_perchloric_acid: {
    term: "Perchloric acid",
    def: "A Class 6 substance with a designated quantity of 300 kg. It is strongly oxidizing and corrosive and may explode when heated or mixed with organic matter.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_hydrogen_peroxide: {
    term: "Hydrogen peroxide",
    def: "Only solutions of 36 wt% or more are Class 6 substances, with a designated quantity of 300 kg. Because it releases oxygen as it decomposes, it is kept in vented containers so gas can escape, and stabilizers are sometimes added.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },
  hazmat_nitric_acid: {
    term: "Nitric acid",
    alias: ["HNO3", "fuming nitric acid"],
    def: "Only nitric acid with a specific gravity of 1.49 or more is a Class 6 substance, with a designated quantity of 300 kg. Light decomposes it to nitrogen dioxide, so it is kept in brown bottles in a cool, dark place.",
    law: HM_LAW_NAMES.decree + ", Annex 1",
  },

  // Hazard grades
  hazmat_grade1: {
    term: "Hazard grade I",
    alias: ["hazard grade 1", "packing hazard grade I"],
    def: "The most hazardous grade in the transport rules. It covers Class 1 items with a 50 kg designated quantity, Class 3 items with a 10 kg designated quantity plus white phosphorus, Class 4 special flammables, Class 5 items with a 10 kg designated quantity, and all Class 6 substances.",
    law: HM_LAW_NAMES.rule + ", Annex 19",
  },
  hazmat_grade2: {
    term: "Hazard grade II",
    alias: ["hazard grade 2", "packing hazard grade II"],
    def: "Covers Class 1 items with a 300 kg designated quantity, Class 2 items with a 100 kg designated quantity (phosphorus sulfides, red phosphorus, sulfur), Class 3 items with a 50 kg designated quantity, Class 4 Class 1 petroleums and alcohols, and Class 5 substances not in grade I.",
    law: HM_LAW_NAMES.rule + ", Annex 19",
  },
  hazmat_grade3: {
    term: "Hazard grade III",
    alias: ["hazard grade 3", "packing hazard grade III"],
    def: "All dangerous substances not in grades I or II, for example Class 2 iron powder, metal powders, magnesium and flammable solids, and Class 4 Class 2, 3 and 4 petroleums and animal/vegetable oils.",
    law: HM_LAW_NAMES.rule + ", Annex 19",
  },

  // Facility types
  hazmat_facilities: {
    term: "Manufacturing, storage and handling facilities",
    alias: ["hazmat facilities", "licensed facilities"],
    def: "The collective term for manufacturing facilities, storage facilities and handling facilities. Dangerous substances at or above the designated quantity may in principle be stored or handled only in such facilities.",
    law: HM_LAW_NAMES.act + ", Article 2",
  },
  hazmat_manufacturing: {
    term: "Manufacturing facility",
    alias: ["hazmat manufacturing plant"],
    def: "A place permitted to handle dangerous substances at or above the designated quantity for the purpose of manufacturing them. Its location, structure and equipment standards (safety distance, open space, signs, ventilation and exhaust, lightning protection, etc.) are set in Annex 4 of the Enforcement Rule.",
    law: HM_LAW_NAMES.act + ", Article 2; " + HM_LAW_NAMES.rule + ", Annex 4",
  },
  hazmat_storage: {
    term: "Storage facility",
    alias: ["hazmat storage"],
    def: "A place permitted to store dangerous substances at or above the designated quantity. There are eight types: indoor storage, outdoor tank storage, indoor tank storage, underground tank storage, simple tank storage, mobile tank storage, outdoor storage and rock cavern tank storage.",
    law: HM_LAW_NAMES.act + ", Article 2; " + HM_LAW_NAMES.decree + ", Annex 2",
  },
  hazmat_indoor_storage: {
    term: "Indoor storage facility",
    alias: ["indoor storehouse", "storage warehouse"],
    def: "A storage facility that keeps dangerous substances indoors, in a place enclosed by a roof and columns or walls. The warehouse is in principle a single-storey building less than 6 m from ground to eaves, with a floor that water cannot penetrate.",
    law: HM_LAW_NAMES.decree + ", Annex 2",
  },
  hazmat_outdoor_storage: {
    term: "Outdoor storage facility",
    alias: ["outdoor storage yard"],
    def: "A storage facility that keeps dangerous substances in an outdoor area. Only certain substances may be stored: Class 2 sulfur or flammable solids (flash point 0 °C or above), Class 4 Class 1 petroleums (flash point 0 °C or above), alcohols, Class 2, 3 and 4 petroleums and animal/vegetable oils, Class 6 substances, and a few others.",
    law: HM_LAW_NAMES.decree + ", Annex 2",
  },
  hazmat_outdoor_tank: {
    term: "Outdoor tank storage facility",
    alias: ["outdoor storage tank", "aboveground outdoor tank"],
    def: "A storage facility that keeps dangerous substances in tanks located outdoors. Tanks of liquid substances are surrounded by a dike, and those above a certain size are subject to periodic examination.",
    law: HM_LAW_NAMES.decree + ", Annex 2",
  },
  hazmat_indoor_tank: {
    term: "Indoor tank storage facility",
    alias: ["indoor storage tank", "dedicated tank room"],
    def: "A storage facility that keeps dangerous substances in tanks located indoors, in principle inside a dedicated tank room of a single-storey building. The capacity of an indoor storage tank is limited to 40 times the designated quantity or less.",
    law: HM_LAW_NAMES.decree + ", Annex 2",
  },
  hazmat_underground_tank: {
    term: "Underground tank storage facility",
    alias: ["underground storage tank", "UST"],
    def: "A storage facility that keeps dangerous substances in tanks buried underground. Tanks are in principle placed in a dedicated tank chamber, with the tank top at least 0.6 m below ground level, and are fitted with leak detection such as leak inspection pipes.",
    law: HM_LAW_NAMES.decree + ", Annex 2",
  },
  hazmat_simple_tank: {
    term: "Simple tank storage facility",
    alias: ["simple storage tank", "small tank storage"],
    def: "A storage facility using simple tanks. Each simple storage tank holds 600 L or less, and one facility may have at most three tanks (with no more than one tank for the same grade of substance).",
    law: HM_LAW_NAMES.decree + ", Annex 2",
  },
  hazmat_mobile_tank: {
    term: "Mobile tank storage facility",
    alias: ["tank lorry", "tank truck", "mobile storage tank"],
    def: "A storage facility that keeps dangerous substances in a tank fixed to a vehicle (including trailers). The tank interior is divided by partitions of steel plate at least 3.2 mm thick for every 4,000 L or less; each compartment has a safety device, and compartments above a certain volume have baffles.",
    law: HM_LAW_NAMES.decree + ", Annex 2",
  },
  hazmat_rock_cavern_tank: {
    term: "Rock cavern tank storage facility",
    alias: ["rock cavern tank", "underground rock cavern storage"],
    def: "A storage facility that keeps liquid dangerous substances in a tank formed by a cavity in rock. Containment usually relies on groundwater pressure, and these facilities must prepare prevention rules and undergo periodic inspection.",
    law: HM_LAW_NAMES.decree + ", Annex 2",
  },
  hazmat_handling: {
    term: "Handling facility",
    alias: ["hazmat handling facility"],
    def: "A place permitted to handle dangerous substances at or above the designated quantity for purposes other than manufacturing. There are four types: fueling, sales, pipeline transfer and general handling facilities.",
    law: HM_LAW_NAMES.act + ", Article 2; " + HM_LAW_NAMES.decree + ", Annex 3",
  },
  hazmat_fueling: {
    term: "Fueling handling facility",
    alias: ["filling station", "gas station"],
    def: "A place that handles dangerous substances to refuel vehicles, aircraft, ships and the like directly through fixed dispensing equipment. A fueling apron at least 15 m wide and 6 m long is kept around the fixed dispensers.",
    law: HM_LAW_NAMES.decree + ", Annex 3",
  },
  hazmat_sales: {
    term: "Sales handling facility",
    alias: ["hazmat retail store"],
    def: "A shop that handles up to 40 times the designated quantity in order to sell dangerous substances in containers. Up to 20 times is a Type 1 and up to 40 times a Type 2 sales handling facility.",
    law: HM_LAW_NAMES.decree + ", Annex 3",
  },
  hazmat_pipeline: {
    term: "Pipeline transfer handling facility",
    alias: ["transfer facility", "hazmat pipeline"],
    def: "A place that transfers dangerous substances through piping and attached equipment. Some cases, such as piping within a single site, are excluded; these facilities must prepare prevention rules and undergo periodic inspection.",
    law: HM_LAW_NAMES.decree + ", Annex 3",
  },
  hazmat_general_handling: {
    term: "General handling facility",
    alias: ["general handling site"],
    def: "A handling facility other than fueling, sales and pipeline transfer facilities, for example plants that consume dangerous substances in boilers or burners or that decant them into containers.",
    law: HM_LAW_NAMES.decree + ", Annex 3",
  },

  // Siting and equipment standards
  hazmat_safety_distance: {
    term: "Safety distance",
    alias: ["separation distance"],
    def: "The horizontal distance to be kept between a facility and nearby protected objects. For a manufacturing facility: at least 10 m to residential buildings, 20 m to high-pressure gas facilities, 30 m to schools, hospitals, theatres and similar places of assembly, 50 m to designated cultural heritage, 3 m to overhead lines above 7,000 V up to 35,000 V and 5 m to lines above 35,000 V. It does not apply to Class 6 manufacturing facilities.",
    law: HM_LAW_NAMES.rule + ", Annex 4",
  },
  hazmat_open_space: {
    term: "Retained open space",
    alias: ["clear space", "open space around facility"],
    def: "Clear space to be kept around buildings or equipment handling dangerous substances, to limit fire spread and allow firefighting. For a manufacturing facility the width is at least 3 m up to 10 times the designated quantity and at least 5 m above that.",
    law: HM_LAW_NAMES.rule + ", Annex 4",
  },
  hazmat_dike: {
    term: "Dike (bund)",
    alias: ["bund", "oil retaining wall"],
    def: "An embankment built around outdoor tanks of liquid dangerous substances to keep spills from spreading. For flammable liquid tanks, its capacity is at least 110% of the tank volume for one tank, or 110% of the largest tank for two or more, and its height is between 0.5 m and 3 m.",
    law: HM_LAW_NAMES.rule + ", Annex 6",
  },
  hazmat_lightning: {
    term: "Lightning protection system",
    alias: ["lightning rod"],
    def: "Lightning protection required for manufacturing facilities handling 10 times the designated quantity or more (except Class 6 facilities), unless the surroundings make it unnecessary for safety.",
    law: HM_LAW_NAMES.rule + ", Annex 4",
  },

  // Transport
  hazmat_mixed_loading: {
    term: "Mixed-loading rule for different classes",
    alias: ["mixed loading of dangerous substances", "segregation rule", "compatible classes"],
    def: "The rule limiting which classes may be loaded together for transport. Permitted combinations are Class 1 with 6, Class 2 with 4 and 5, Class 3 with 4, and Class 4 with 5 (mnemonic '423, 524, 61'); all other pairs are prohibited. It does not apply to quantities of 1/10 of the designated quantity or less.",
    law: HM_LAW_NAMES.rule + ", Annex 19",
  },
  hazmat_container_marking: {
    term: "Transport container marking",
    alias: ["container labelling", "precautionary marking"],
    def: "The outside of a transport container is marked with the item name, hazard grade, chemical name and water solubility (for water-soluble Class 4), quantity and precautions. Examples of precautions: Class 4 'keep away from fire', Class 5 'keep away from fire, avoid impact', Class 6 'avoid contact with combustibles', Class 3 water-reactive 'keep away from water', Class 3 pyrophoric 'keep away from fire, avoid contact with air'.",
    law: HM_LAW_NAMES.act + ", Article 20; " + HM_LAW_NAMES.rule + ", Annex 19",
  },

  // Safety management
  hazmat_safety_manager: {
    term: "Dangerous substances safety manager",
    alias: ["safety manager", "hazmat safety officer"],
    def: "A qualified person appointed by the facility's responsible party to manage safety in handling dangerous substances. After dismissal or retirement, a successor must be appointed within 30 days and reported to the fire headquarters chief or fire station chief within 14 days of appointment.",
    law: HM_LAW_NAMES.act + ", Article 15",
  },
  hazmat_prevention_rules: {
    term: "Prevention rules",
    alias: ["fire prevention rules"],
    def: "Rules prepared by the responsible party of larger facilities for fire prevention and emergency measures and submitted to the mayor or provincial governor. They apply to manufacturing and general handling facilities of 10 times the designated quantity or more, outdoor storage of 100 times or more, indoor storage of 150 times or more, outdoor tank storage of 200 times or more, rock cavern tank storage and pipeline transfer facilities (with some general handling exceptions).",
    law: HM_LAW_NAMES.act + ", Article 17; " + HM_LAW_NAMES.decree + ", Article 15",
  },
  hazmat_periodic_inspection: {
    term: "Periodic inspection (self-inspection)",
    alias: ["periodic self-inspection"],
    def: "An inspection the responsible party carries out at least once a year to check that the facility meets technical standards, keeping the records. It covers facilities subject to prevention rules, underground and mobile tank storage, and manufacturing, fueling and general handling facilities with buried tanks.",
    law: HM_LAW_NAMES.act + ", Article 18; " + HM_LAW_NAMES.decree + ", Article 16",
  },
  hazmat_periodic_exam: {
    term: "Periodic examination",
    alias: ["periodic official examination"],
    def: "An examination of structure and equipment that outdoor tank storage facilities holding 500,000 L or more of liquid dangerous substances must periodically undergo by the fire authorities. It is distinct from the self-performed periodic inspection.",
    law: HM_LAW_NAMES.act + ", Article 18; " + HM_LAW_NAMES.decree + ", Article 17",
  },
  hazmat_tank_test: {
    term: "Tank safety performance test",
    alias: ["tank safety test", "water fill and hydrostatic test"],
    def: "A test taken before the completion inspection when a dangerous substance tank is installed or modified. It comprises foundation and ground tests, water-fill or hydrostatic tests, weld tests and rock cavern tank tests, with the required tests depending on tank type and capacity.",
    law: HM_LAW_NAMES.act + ", Article 8",
  },
  hazmat_completion_inspection: {
    term: "Completion inspection",
    alias: ["hazmat completion inspection"],
    def: "An inspection by the mayor or provincial governor after installation or modification work on a permitted facility is finished; the facility may be used only once found to meet technical standards.",
    law: HM_LAW_NAMES.act + ", Article 9",
  },
  hazmat_self_fire_brigade: {
    term: "In-house fire brigade",
    alias: ["chemical fire engine", "plant fire brigade"],
    def: "A fire brigade kept on site by the responsible party of manufacturing or general handling facilities, among others, that handle 3,000 times the designated quantity or more of Class 4 substances. Below 120,000 times: 1 chemical fire engine and 5 persons; below 240,000 times: 2 and 10; below 480,000 times: 3 and 15; 480,000 times or more: 4 and 20.",
    law: HM_LAW_NAMES.act + ", Article 19; " + HM_LAW_NAMES.decree + ", Article 18",
  },

  // Fire protection
  hazmat_required_unit: {
    term: "Required unit (extinguishing demand unit)",
    alias: ["required unit"],
    def: "The base unit expressing the size of a building or the amount of dangerous substance for which extinguishing equipment is required. For manufacturing and handling buildings, 100 m² of floor area with fire-resistant exterior walls (50 m² otherwise) is one unit; for storage buildings, 150 m² (75 m² otherwise); for substances, 10 times the designated quantity is one unit.",
    law: HM_LAW_NAMES.rule + ", Annex 17",
  },
  hazmat_capacity_unit: {
    term: "Capacity unit (extinguishing capacity unit)",
    alias: ["extinguishing capacity unit"],
    def: "The unit of extinguishing capacity matched against the required unit; the sum of capacity units of installed equipment must be at least the required units. For example, an 8 L fire bucket is 0.3 and 50 L of dry sand (with one shovel) is 0.5 capacity units.",
    law: HM_LAW_NAMES.rule + ", Annex 17",
  },
  hazmat_fire_difficulty: {
    term: "Fire-extinguishing difficulty grade",
    alias: ["difficulty grade I", "difficulty grade II", "difficulty grade III"],
    def: "A grading of facilities into I, II and III by how hard a fire would be to extinguish, based on size, quantity handled and structure. The grade determines the extinguishing systems required (indoor and outdoor hydrants, water spray, foam, small and large portable extinguishers, etc.); grade I is the strictest.",
    law: HM_LAW_NAMES.rule + ", Annex 17",
  },
};

Object.assign(window, { GLOSSARY_HAZMAT_EN });
