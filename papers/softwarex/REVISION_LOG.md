# Revision Log — ChemIP Paper

## Rev 3 — 2026-04-01: Positioning Redesign

**Trigger:** External review feedback — paper was over-claiming with unverified metrics.

**Core change:** Repositioned from "large-scale benchmark paper" to "reusable research software for fragmented public data integration."

### Removed / Reduced
- Abstract: removed "350M+ patent records", "78% time reduction"
- Impact: deleted time comparison table (single-operator estimates, not validated)
- "first open-source platform" → "one of the few openly available tools"
- "100% endpoint coverage" removed
- Patent index demoted from headline feature to "optional backend" (1 paragraph)
- LLM demoted from core contribution to "optional, with deterministic fallback"

### Added / Strengthened
- New framing: "The core problem is not data availability but workflow fragmentation"
- Adapter-based integration pattern highlighted as design contribution
- Graceful degradation section (KOSHA fallback, LLM offline, no patent DB)
- 3-tier deployment modes (Minimal / Standard / Full)
- Limitations expanded to 5 honest items (no user study, API dependency, storage, LLM quality, key requirement)
- Illustrative Examples explicitly marked "not formal evaluations"
- Cover letter rewritten: journal-fit + reviewer access guidance

### Highlights (new, ≤85 chars each)
1. Integrates nine public chemical safety data sources in one workflow.
2. Adapter-based design supports graceful degradation and extensibility.
3. Self-hostable deployment keeps sensitive inquiry patterns private.
4. AI-assisted summaries with deterministic rule-based fallback.
5. Open-source (AGPL-3.0) with automated tests, CI/CD, and docs.

---

## Rev 2 — 2026-04-01: English UI + Screenshots

- Frontend fully translated to English (334 Korean strings → 0 user-visible)
- Captured 5 English-language screenshots for paper figures
- Paper figure paths updated to `screenshots_en/`

---

## Rev 1 — 2026-03-31: SoftwareX Format + Source Expansion

- Restructured paper from ~5,700 words to ~2,100 words (SoftwareX 3,000 limit)
- Added mandatory Code Metadata table (C1–C9)
- Abstract reduced to ~100 words
- Added KISCHEM and NCIS as data sources (7 → 9)
- Backend: KOSHA data.go.kr fallback, kischem_adapter.py, ncis_adapter.py
- Frontend: KoreanRegulationPanel.tsx + "KR Regulation" tab
- Author updated: Independent Researcher → University of Wisconsin-Madison
- Email updated: ykim288@wisc.edu

---

## Rev 0 — 2026-03-25: Initial Draft

- Original paper_en.tex (~5,700 words, elsarticle format)
- 7 data sources, Korean-language UI screenshots
- Targeting SoftwareX
