// English for the home-screen use-case FAQ (LANDING_FAQ_KO in landing_faq_labels.jsx). Same shape.
// The screenshots (faq/*.png) are captures of the Korean screen and are not localized.

const LANDING_FAQ_EN = {
  eyebrow: "Use cases",
  title: "How ChemIP solves everyday compliance questions",
  lede: "Common situations from day-to-day work. The screenshot under each answer is a real lookup of benzene (CAS 71-43-2) on the Korean-language screen. (The situations are fictional examples, not customer testimonials.)",
  items: [
    {
      role: "Export manager",
      q: "We want to export benzene to the US and don't know what to check.",
      a: "Search the substance and choose the trade direction in the 'Regulations & permits / Trade' tab. You get whether customs confirmation applies, import/export declaration duties and the legal basis. Export it as a checklist for customs preparation.",
      img: "faq/faq1_export.png",
      alt: "Benzene's Korean import/export obligations — customs confirmation, import declaration duty and legal basis",
      cap: "Korean import/export obligations · customs confirmation and legal basis",
    },
    {
      role: "Manufacturer without a regulatory team",
      q: "I can't tell whether a new raw material falls under the Chemicals Control Act or needs a notification.",
      a: "Enter the substance name or CAS number and it is checked at once against the lists designated under each Korean law, such as the Chemicals Control Act, the Clean Air Conservation Act and the Cosmetics Act.",
      img: "faq/faq2_domestic.png",
      alt: "Benzene's listings under Korean laws — Clean Air Conservation Act, Cosmetics Act and other lists",
      cap: "Regulation by Korean law · listing on each statutory list",
    },
    {
      role: "Health and safety officer",
      q: "I need to check the SDS for a chemical arriving on site, quickly.",
      a: "Look up all 16 SDS sections (hazards, GHS classification, hazard statements, first aid and more) by CAS number, with no sign-up or payment.",
      img: "faq/faq3_msds.png",
      alt: "Benzene SDS section 2, hazard identification — GHS classification and H/P statements",
      cap: "16 SDS sections · hazard identification (GHS, H/P statements)",
    },
    {
      role: "Import and purchasing",
      q: "When importing this raw material, I want to see partner-country and international rules too.",
      a: "Choose a partner country to see its regulatory listings, international conventions and import requirements together, along with candidate HS codes.",
      img: "faq/faq4_import.png",
      alt: "Benzene's partner-country regulations — Swiss PIC and China's hazardous chemicals catalogue",
      cap: "Partner-country regulations · national lists and international conventions",
    },
    {
      role: "Technology and patent analyst",
      q: "I want to find patents related to this substance, by substance.",
      a: "ChemIP queries KIPRIS patents live by substance name and links straight to them. A substance–patent mapping index also gathers patents by substance.",
      img: "faq/faq5_patents.png",
      alt: "Benzene patent search — live KIPRIS search link",
      cap: "Patents · direct link to live KIPRIS search",
    },
    {
      role: "Permitting officer",
      q: "I don't know which permits or notifications this substance requires.",
      a: "Procedures this substance triggers, such as handling-facility permits, emission-facility permits and business licences or notifications, are listed by law.",
      img: "faq/faq6_permit.png",
      alt: "Benzene permits and notifications — permits and notifications under the air, water and soil conservation acts",
      cap: "Permits and notifications · permit and notification duties by law",
    },
  ],
};

const LANDING_FAQ = langPick(LANDING_FAQ_KO, LANDING_FAQ_EN);

Object.assign(window, { LANDING_FAQ_EN, LANDING_FAQ });
