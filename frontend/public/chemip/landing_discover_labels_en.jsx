// English for the home-screen discovery sections (LANDING_DISCOVER_KO in landing_discover_labels.jsx). Same shape and CAS keys.

const LANDING_DISCOVER_EN = {
  popular: {
    eyebrow: "Popular substances",
    note: "A fixed list of well-documented substances (no view tracking).",
  },
  today: {
    eyebrow: "Substance of the day",
    open: "Open the substance",
    note: "Changes daily · Our own one-line note; check the SDS and regulatory data on the substance page.",
  },
  feed: {
    eyebrow: "Recent chemical incidents",
    more: "See all incident news",
  },
  tools: {
    eyebrow: "Tools",
    count: (n) => `${n}`,
    open: "Open",
    items: {
      calc: { title: "Engineering calculators", desc: "ppm ↔ mg/m³, mixture LFL, ventilation rate, pipe pressure drop and more." },
      label: { title: "GHS label maker", desc: "Print a label with pictograms, signal word and hazard statements from SDS section 2." },
      compat: { title: "Storage compatibility", desc: "Check which substances are dangerous to store together." },
      mixghs: { title: "Mixture GHS classification", desc: "Enter components and concentrations to get the mixture's GHS classes and pictograms." },
      glossary: { title: "Chemical safety glossary", desc: "Process safety, industrial hygiene, dangerous goods and regulatory terms in plain words." },
    },
  },
  names: {
    "71-43-2": "Benzene", "108-88-3": "Toluene", "1330-20-7": "Xylene", "50-00-0": "Formaldehyde", "67-56-1": "Methanol",
    "64-17-5": "Ethanol", "67-64-1": "Acetone", "7664-93-9": "Sulfuric acid", "7697-37-2": "Nitric acid", "1310-73-2": "Sodium hydroxide",
    "7664-41-7": "Ammonia", "100-42-5": "Styrene", "74-90-8": "Hydrogen cyanide", "75-44-5": "Phosgene", "1332-21-4": "Asbestos",
    "107-13-1": "Acrylonitrile", "302-01-2": "Hydrazine", "7440-43-9": "Cadmium", "62-53-3": "Aniline", "74-98-6": "Propane",
    "100-41-4": "Ethylbenzene", "56-23-5": "Carbon tetrachloride", "127-18-4": "Tetrachloroethylene", "75-15-0": "Carbon disulfide",
    "106-99-0": "1,3-Butadiene", "91-20-3": "Naphthalene", "68-12-2": "Dimethylformamide (DMF)", "75-07-0": "Acetaldehyde",
  },
  hooks: {
    "71-43-2": "A Group 1 carcinogen (IARC) also found in petrol. With a flash point near −11 °C it ignites easily at room temperature.",
    "67-64-1": "The main ingredient of nail polish remover. Its flash point is about −20 °C, so keep ignition sources away.",
    "50-00-0": "Known as a cause of 'sick building syndrome' and classed as a Group 1 carcinogen (IARC). A ~37% solution is called formalin.",
    "67-56-1": "Smells like ethanol, but swallowing it can cause blindness or death. Its flame is almost invisible in daylight.",
    "7664-93-9": "One of the most produced industrial chemicals in the world. When diluting, always add the acid slowly to water.",
    "7664-41-7": "Widely used as a refrigerant. It is lighter than air, so a leak rises and spreads upward.",
    "108-88-3": "A common solvent in paints and adhesives, classed as suspected of damaging fertility or the unborn child (GHS Cat. 2).",
    "1330-20-7": "A mixture of the ortho, meta and para isomers. Grouped with benzene, toluene and ethylbenzene as BTEX.",
    "1310-73-2": "Caustic soda. On skin it hurts later than an acid but can damage tissue more deeply.",
    "74-90-8": "Said to smell of bitter almonds, but many people cannot smell it, so never judge safety by smell.",
    "75-44-5": "Used as a war gas in World War I; today it is a building block for polycarbonate and polyurethane.",
    "1332-21-4": "A Group 1 carcinogen (IARC). Korea has fully banned its manufacture, import and use since 2009.",
    "100-42-5": "The monomer behind polystyrene, including expanded foam insulation.",
    "107-13-1": "A raw material for acrylic fibres and ABS plastic. Burning it can release hydrogen cyanide.",
    "64-17-5": "The alcohol in drinks and hand sanitiser. It disinfects best at around 70%.",
    "7697-37-2": "Stains skin yellow by reacting with its proteins (the xanthoproteic reaction). It is also a strong oxidiser.",
    "302-01-2": "Used as a satellite attitude-control propellant. Probably carcinogenic to humans (IARC Group 2A).",
    "7440-43-9": "The cause of Japan's itai-itai disease and a Group 1 carcinogen (IARC).",
    "62-53-3": "The substance that launched the synthetic dye industry. It can cause methaemoglobinaemia, stopping blood from carrying oxygen.",
    "74-98-6": "The main component of LPG. Heavier than air, so a leak collects at floor level and in low spots.",
    "100-41-4": "The E in BTEX. Most of it is used to make styrene.",
    "56-23-5": "Once used in fire extinguishers and cleaners; liver toxicity and ozone depletion now restrict its use strictly.",
    "127-18-4": "A chlorinated solvent long used for dry cleaning.",
    "75-15-0": "Its autoignition temperature is only about 90–100 °C, so touching a hot steam line can ignite it.",
    "106-99-0": "A raw material for synthetic rubber (SBR) and a Group 1 carcinogen (IARC).",
    "91-20-3": "The smell of mothballs. The solid turns straight into vapour without melting (sublimation).",
    "68-12-2": "A solvent that is readily absorbed through the skin and can damage the liver.",
    "75-07-0": "Formed in the body when ethanol is broken down, and blamed for hangovers.",
  },
};

const LANDING_DISCOVER = langPick(LANDING_DISCOVER_KO, LANDING_DISCOVER_EN);

Object.assign(window, { LANDING_DISCOVER_EN, LANDING_DISCOVER });
