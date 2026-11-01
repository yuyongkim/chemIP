// Anthropic Messages API client (raw fetch; the Worker has no build step or npm deps).
// Mirrors backend/core/llm_client.generate(): never throws, returns {text, model, available, error}.
// claude-haiku-5-5: adaptive thinking is on by default and non-default temperature is rejected, so the
// request sets only effort; thinking blocks in the response are skipped and only text blocks are used.
import { ANTHROPIC, SECRETS, intSetting, setting } from "../config.js";
import { UpstreamTimeout, fetchWithTimeout } from "../lib/upstream.js";

export function llmConfigured(env) {
  return Boolean(String(env[SECRETS.ANTHROPIC] || "").trim());
}

export async function generate(env, prompt, { system = "" } = {}) {
  const model = setting(env, "AI_MODEL");
  if (!llmConfigured(env)) return { text: "", model: "", available: false, error: "LLM not configured" };
  const body = {
    model,
    max_tokens: intSetting(env, "AI_MAX_TOKENS"),
    output_config: { effort: setting(env, "AI_EFFORT") },
    messages: [{ role: "user", content: prompt }],
  };
  if (system) body.system = system;
  try {
    const res = await fetchWithTimeout(
      ANTHROPIC.URL,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": String(env[SECRETS.ANTHROPIC]).trim(),
          "anthropic-version": ANTHROPIC.VERSION,
        },
        body: JSON.stringify(body),
      },
      intSetting(env, "AI_TIMEOUT_MS"),
    );
    if (res.status !== 200) {
      console.warn(`LLM request failed: Anthropic HTTP ${res.status}`);
      return { text: "", model, available: false, error: `Anthropic HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.stop_reason === "refusal") return { text: "", model, available: false, error: "refusal" };
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return { text, model: data.model || model, available: true, error: "" };
  } catch (e) {
    const error = e instanceof UpstreamTimeout ? "timeout" : "request failed";
    console.warn(`LLM generation error: ${error}`);
    return { text: "", model: error === "timeout" ? model : "", available: false, error };
  }
}
