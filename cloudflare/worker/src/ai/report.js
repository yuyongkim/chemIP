// Report text: rule-based markdown, LLM prompts and output sanitising.
// Prompts are copied verbatim from backend/core/report_builder.py and backend/api/routes/ai.py.

export const ANALYZE_SYSTEM = `You are a chemical safety analyst assistant.
Given MSDS evidence, KOSHA guide data, and patent evidence for a chemical substance,
write a concise safety analysis report in Korean.
Structure: 1) 안전 요약  2) 규제/가이드 인사이트  3) 특허 시그널  4) 후속 조치 제안.
Base every claim on the provided evidence. If evidence is insufficient, say so.
Keep the report under 500 words. Use markdown formatting.
Do not invent dates, publication metadata, authors, standard numbers, measurements, or guide identifiers unless they are explicitly present in the evidence.
Do not add a 작성일, date, version, or source section unless the evidence explicitly contains it.
If regulatory evidence is limited, state that the evidence is limited instead of guessing.
Only mention KOSHA guides that are present in the provided evidence block.
Prefer plain-language safety guidance over technical method details.
Do not quote clause numbers, article numbers, internal IDs, method codes, molecular formulas, or instrument codes unless absolutely necessary and explicitly evidenced.`;

export const SUMMARIZE_SYSTEM =
  "You are a chemical safety expert with access to MSDS, drug databases, and safety guides. " +
  "Write a comprehensive safety summary in Korean. " +
  "Include: 1) 위험도 등급 (상/중/하) + 근거, 2) 주요 위험요소 (MSDS 기반), " +
  "3) 의약품 연관성 (FDA/MFDS 데이터가 있으면 어떤 약에 사용되는지), " +
  "4) 필수 보호장비, 5) KOSHA 가이드 참조사항, 6) 긴급 대응 요약. " +
  "출처(MSDS, MFDS, OpenFDA, PubMed, KOSHA)를 명시. " +
  "Under 400 words. Markdown format. Evidence-based only.";

export function summarizePrompt(context) {
  return `${context}\n\n위 모든 데이터를 바탕으로 종합 안전 요약을 작성하세요.`;
}

const DIGITS = /^\d+$/;
const CAS_FULL = /^\d{2,7}-\d{2}-\d$/;

export function buildEvidenceContext(b) {
  const parts = [`화학물질: ${b.chemical_name} (ID: ${b.chem_id})`];
  if (b.section2_points.length) {
    parts.push("\n[MSDS 2항 - 유해위험성]");
    for (const p of b.section2_points) parts.push(`  - ${p}`);
  }
  if (b.section15_points.length) {
    parts.push("\n[MSDS 15항 - 법적규제현황]");
    for (const p of b.section15_points) parts.push(`  - ${p}`);
  }
  if (b.hazard_statements.length) {
    parts.push("\n[GHS 유해성 문구 (영문)]");
    for (const h of b.hazard_statements) parts.push(`  - ${h}`);
  }
  if (b.guide_recommendations.length) {
    parts.push("\n[KOSHA 안전보건 가이드]");
    for (const rec of b.guide_recommendations.slice(0, 4)) {
      const terms = (rec.match_terms || [])
        .map((t) => String(t).trim())
        .filter((t) => t && !DIGITS.test(t) && !CAS_FULL.test(t))
        .slice(0, 3)
        .join(", ");
      parts.push(terms ? `  - ${rec.title || ""} (matched: ${terms})` : `  - ${rec.title || ""}`);
    }
  }
  if (b.patent_highlights.length) {
    parts.push("\n[특허 근거]");
    for (const it of b.patent_highlights.slice(0, 4)) {
      const title = String(it.title || "").trim();
      const snippet = String(it.snippet || "").trim();
      const label = String(it.type_label || "Patent");
      if (title && snippet) parts.push(`  - [${label}] ${title}: ${snippet}`);
      else if (title) parts.push(`  - [${label}] ${title}`);
    }
  }
  return parts.join("\n");
}

export function analyzePrompt(b) {
  return `다음 화학물질의 안전 분석 리포트를 작성하세요.\n\n${buildEvidenceContext(b)}\n\n위 근거를 바탕으로 안전 분석 리포트를 markdown으로 작성하세요.`;
}

export function buildReportMarkdown(b) {
  let safety = [...b.section2_points.slice(0, 4), ...b.hazard_statements.slice(0, 3)];
  if (!safety.length) {
    safety = [
      "Detailed hazard section is not yet cached for this chemical.",
      "Please review MSDS section details directly for official handling guidance.",
    ];
  }
  const guideTitles = b.guide_recommendations.filter((x) => x.title).map((x) => String(x.title).trim()).slice(0, 3);
  const patentLines = b.patent_highlights
    .slice(0, 4)
    .filter((it) => it.title && it.snippet)
    .map((it) => `- [${it.type_label || "Patent"}] ${it.title}: ${it.snippet}`);

  const lines = [`## AI Insight Report: ${b.chemical_name}`, "", "### 1. Safety Summary", `Chemical ID: \`${b.chem_id}\``, ""];
  for (const s of safety.slice(0, 6)) lines.push(`- ${s}`);
  lines.push("", "### 2. Regulatory and Guide Insights");
  if (b.section15_points.length) for (const s of b.section15_points.slice(0, 4)) lines.push(`- ${s}`);
  else lines.push("- Regulatory section evidence is limited in current cache.");
  lines.push(guideTitles.length ? `- Related KOSHA Guides: ${guideTitles.join(", ")}` : "- No strongly matched KOSHA guide found for current query terms.");
  lines.push("", "### 3. Patent Signals");
  if (patentLines.length) lines.push(...patentLines);
  else lines.push("- Patent evidence is limited for the current query.");
  lines.push(
    "",
    "### 4. Follow-up Actions",
    "- Validate exposure controls and PPE requirements before handling or scale-up decisions.",
    "- Cross-check patent scope and application themes before commercialization decisions.",
    "- Use guide documents as operational context, and MSDS as authoritative chemical-level safety reference.",
    "",
    "---",
    "Note: This report is retrieval-assisted (MSDS + KOSHA Guide + Patent evidence) and should be reviewed by a domain expert.",
  );
  return lines.join("\n");
}

const FORBIDDEN_METADATA = /^\s*(?:\*{0,2})?(?:작성일|일자|date|report date|generated on|version)\s*[:：\-].*$/i;

export function sanitizeLlmOutput(text, chemicalName) {
  const cleaned = [];
  let started = false;
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim();
    if (FORBIDDEN_METADATA.test(stripped)) continue;
    if (!started && !stripped) continue;
    started = true;
    cleaned.push(line.replace(/\s+$/, ""));
  }
  while (cleaned.length && !cleaned[cleaned.length - 1].trim()) cleaned.pop();
  if (!cleaned.length) return "";
  if (!cleaned[0].trimStart().startsWith("## ")) cleaned.unshift(`## ${chemicalName} 안전 분석 리포트`, "");
  return cleaned.join("\n").trim();
}

export function summaryFallback(name, hazards) {
  let out = `## ${name} 위험도 요약\n\n`;
  if (hazards.length) out += "### 주요 위험요소\n" + hazards.map((h) => `- ${h}`).join("\n");
  else out += "MSDS 데이터가 충분하지 않아 자동 요약을 생성할 수 없습니다.";
  return out;
}
