// /api/ai — analyze, summarize, llm-status with the same response shapes as backend/api/routes/ai.py.
// /recommend, /drug-analysis, /ask need backend-only search/DB data and fall through to the ORIGIN proxy.
// Extra fields only when a limit blocks a new model call: rate_limited ("client"|"global") and llm_note.
import { ANTHROPIC, boolSetting, setting } from "../config.js";
import { bodyString, json, readJsonObject } from "../lib/http.js";
import { generate, llmConfigured } from "../ai/anthropic.js";
import { getCached, setCached } from "../ai/cache.js";
import {
  buildBundle,
  buildFullContext,
  buildSources,
  calculateConfidence,
  containsKiprisEvidence,
  loadSubstance,
  searchTerms,
  sectionContent,
  sectionPoints,
} from "../ai/evidence.js";
import { LIMIT_MESSAGES, reserve } from "../ai/limits.js";
import {
  ANALYZE_SYSTEM,
  SUMMARIZE_SYSTEM,
  analyzePrompt,
  buildReportMarkdown,
  sanitizeLlmOutput,
  summarizePrompt,
  summaryFallback,
} from "../ai/report.js";

// Runs the model only if the key is set and the daily limits allow it.
async function guardedGenerate(request, env, prompt, system) {
  if (!llmConfigured(env)) return { resp: { text: "", model: "", available: false }, limited: null };
  const slot = await reserve(request, env);
  if (!slot.allowed) return { resp: { text: "", model: "", available: false }, limited: slot.reason };
  const resp = await generate(env, prompt, { system });
  if (resp.available && resp.text) await slot.commit();
  return { resp, limited: null };
}

const limitFields = (limited) => (limited ? { rate_limited: limited, llm_note: LIMIT_MESSAGES[limited] } : {});

async function analyze({ request, env }) {
  const body = await readJsonObject(request);
  const chemId = bodyString(body, "chemId");
  const chemicalName = bodyString(body, "chemicalName");
  const useLlm = body.use_llm === undefined ? true : Boolean(body.use_llm);

  let cached = await getCached(env, chemId);
  if (cached && !boolSetting(env, "KIPRIS_IN_AI") && containsKiprisEvidence(cached)) cached = null;
  if (cached && useLlm) return json({ ...cached, cached: true });

  const { record } = await loadSubstance(env, chemId, body.evidence);
  const bundle = buildBundle(env, chemId, chemicalName, record);
  const terms = searchTerms(chemId, chemicalName, record);

  let analysis;
  let model = "";
  let llmUsed = false;
  let limited = null;
  if (useLlm) {
    const out = await guardedGenerate(request, env, analyzePrompt(bundle), ANALYZE_SYSTEM);
    limited = out.limited;
    if (out.resp.available && out.resp.text) {
      analysis = sanitizeLlmOutput(out.resp.text, chemicalName) || out.resp.text;
      model = out.resp.model;
      llmUsed = true;
    }
  }
  if (!llmUsed) analysis = buildReportMarkdown(bundle);

  const result = {
    analysis,
    confidence: calculateConfidence(bundle),
    sources: buildSources(bundle),
    guide_recommendations: bundle.guide_recommendations,
    terms,
    llm_used: llmUsed,
    model,
  };
  if (llmUsed) await setCached(env, chemId, result, model);
  return json({ ...result, ...limitFields(limited) });
}

async function summarize({ request, env }) {
  const body = await readJsonObject(request);
  const chemId = bodyString(body, "chemId").trim();
  if (!chemId) return json({ error: "chemId is required" });

  const cacheKey = `summary:${chemId}`;
  const cached = await getCached(env, cacheKey);
  if (cached) return json({ ...cached, cached: true });

  const { record } = await loadSubstance(env, chemId, body.evidence);
  const { context, name, sources } = buildFullContext(chemId, record);
  const { resp, limited } = await guardedGenerate(request, env, summarizePrompt(context), SUMMARIZE_SYSTEM);
  if (resp.available && resp.text) {
    const result = { chem_id: chemId, chemical_name: name, summary: resp.text.trim(), sources_used: sources, llm_used: true, model: resp.model };
    await setCached(env, cacheKey, result, resp.model);
    return json(result);
  }
  const hazards = sectionPoints(sectionContent(record, 2), 3);
  return json({
    chem_id: chemId,
    chemical_name: name,
    summary: summaryFallback(name, hazards),
    sources_used: sources,
    llm_used: false,
    model: "",
    ...limitFields(limited),
  });
}

async function llmStatus({ env }) {
  const ready = llmConfigured(env);
  return json({ enabled: true, ready, model: setting(env, "AI_MODEL"), base_url: ANTHROPIC.STATUS_BASE_URL });
}

export const routes = [
  { method: "POST", path: "/api/ai/analyze", handler: analyze },
  { method: "POST", path: "/api/ai/summarize", handler: summarize },
  { method: "GET", path: "/api/ai/llm-status", handler: llmStatus },
];
