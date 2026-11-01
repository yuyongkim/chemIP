// English default text for the shared UI pieces (UI_COMMON_TEXT_KO in ui_common_labels.jsx). Same shape.

const UI_COMMON_TEXT_EN = {
  preparing: "Data is being prepared. It will appear automatically once collection is complete.",
  error: "Could not load.",
  sourceLink: "Original ↗",
  chemNotFound: id => `The requested substance (${id}) was not found. Please search again by name or CAS number.`,
  goSearch: "Go to substance search",
  chemLoading: id => `Loading the requested substance (${id}).`,
};

const UI_COMMON_TEXT = langPick(UI_COMMON_TEXT_KO, UI_COMMON_TEXT_EN);

Object.assign(window, { UI_COMMON_TEXT_EN, UI_COMMON_TEXT });
