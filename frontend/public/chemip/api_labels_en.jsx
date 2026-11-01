// English for the API-layer messages (API_LABELS_KO in api_labels.jsx). Same shape.

const API_LABELS_EN = {
  offline: "Cannot connect right now. Please try again shortly.",
  liveOnly: "This item comes from a live lookup and is not shown right now.",
};

const API_LABELS = langPick(API_LABELS_KO, API_LABELS_EN);

Object.assign(window, { API_LABELS_EN, API_LABELS });
