// Route groups served by the Worker. New group: one module in routes/ + one line here.
import { routes as ai } from "./ai.js";
import { routes as diag } from "./diag.js";
import { routes as drugs } from "./drugs.js";
import { routes as feedback } from "./feedback.js";
import { routes as reach } from "./reach.js";
import { routes as regulationsKotra } from "./regulations_kotra.js";
import { routes as staticData } from "./static_data.js";
import { routes as trade } from "./trade.js";
import { routes as usage } from "./usage.js";

export const ROUTE_GROUPS = [feedback, usage, ai, drugs, trade, regulationsKotra, reach, staticData, diag];
