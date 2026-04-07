# Paper Changelog — SoftwareX Submission

## v3.0 (2026-04-07) — Reviewer-defensible revision
- **Abstract**: Hedged repo availability ("will remain available for the foreseeable future"), added Zenodo snapshot sentence
- **C3**: Reworded from placeholder to "will be deposited on Zenodo with a citable DOI prior to final submission"
- **ICCA figure**: "roughly 40,000–60,000" → "on the order of tens of thousands" (loosened to avoid unverifiable precision)
- **Eurostat figure**: "€560 billion in 2024" → "on the order of €560 billion in the most recent available year"
- **KISCHEM**: Added full English name "Korea Information System for Chemical Safety"
- **NICS**: Introduced abbreviation in Section 1 ("hereafter NICS"), consistent with Acknowledgments
- **KOSHA fallback**: Added "as described in the official KOSHA Open API documentation [14] and the corresponding entry on the Korea Public Data Portal [15]"
- **Comparison claim**: Appended "based on a literature and product documentation review conducted in early 2026 [4–7]"
- **Table 1**: Added caveat sentence "Table 1 should therefore be interpreted as an indicative, not exhaustive, comparison."
- **Time reduction**: Expanded caveat to "scripted scenario walkthroughs by the author, not on controlled time-and-motion studies, indicative rather than definitive"
- **Test count**: "19 automated smoke tests ... all 19 tests pass" → "automated smoke tests ... the full suite passes as of ChemIP v1.0.0"
- **Table 2 LOC**: Added "as of ChemIP v1.0.0" to caption
- **Acknowledgments**: Restructured NICS sentence for consistency with Section 1

## v2.0 (2026-04-07) — Fact-check revision
- **Comparison claim**: "one of the few openly available tools" → narrowed to specific scope ("no existing open-source self-hostable platform combining Korean regulatory + trade + patent")
- **Statistics**: ICCA/Eurostat figures hedged with "estimates" and "approximately"; specific Eurostat dataset URL added
- **Time reduction**: 76% figure explicitly marked as "preliminary internal estimates, not measured user-study data" (bold)
- **Operational trial**: "two-day operational trial" → "two-day internal deployment exercise"
- **Nine sources**: Clarified as "nine external service endpoints" throughout; added note explaining KOTRA 7-API grouping
- **NCIS attribution**: Fixed from "Korea Environment Corporation" to "National Institute of Chemical Safety under Ministry of Environment"
- **Repository**: Verified public (GitHub API: private=false, license=AGPL-3.0); kept factual statement
- **C3 Reproducible Capsule**: Changed from "--" to "Zenodo DOI to be generated before submission"
- **Comparison table**: Added caveat that SciFinder/Reaxys features may not be fully verifiable due to paywall
- **Limitations**: Added 6th limitation about comparison table based on public docs only
- **KOSHA fallback**: Added source file reference (`kosha_msds_adapter.py`) and data.go.kr service number [15]
- **References**: Added [14] KOSHA API portal, [15] data.go.kr service page; added "(Accessed: March 2026)" to all URLs
- **SSRF protection**: Mentioned in adapter description (reflects actual code change)
- **Acknowledgments**: Fixed NCIS agency name to "National Institute of Chemical Safety (NICS)"

## v1.0 (2026-04-06)
- Converted from LaTeX (`paper_en.tex`) to Markdown (`paper_v1.md`)
- **Motivation**: Added industry scale statistics (ICCA, Eurostat), explicit target users (Korean SME exporters, foreign companies entering Korean market), 4 systemic inefficiencies (enumerated)
- **Scenarios**: Rewritten from generic safety lookups to business-contextualized use cases (SME export pre-screening, foreign market entry compliance, pharmaceutical ingredient cross-reference)
- **Impact**: Added 76% time-reduction estimate with caveat, 2-day operational trial results (4 issues identified/resolved), SME/foreign company privacy framing
- **References**: Added ICCA [1], Eurostat [2], API Adoption Playbook [3]; total 14 references

## v0.3 (2026-04-01) — Rev 3
- Repositioned from "benchmark platform" to "reusable research software"
- Removed overclaims (78% time reduction, 350M+ patent records as headline)
- Patent index demoted to "optional backend"
- LLM demoted to "optional with deterministic fallback"
- Added honest 5-item limitations section
- Strengthened: adapter-based design, graceful degradation, 3-tier deployment modes

## v0.2 (2026-04-01) — Rev 2
- Frontend fully translated to English (334 Korean strings removed)
- 5 English-language screenshots captured
- Figure paths updated to `screenshots_en/`

## v0.1 (2026-03-31) — Rev 1
- Paper restructured from ~5,700 to ~2,100 words (SoftwareX limit)
- Added 7 → 9 data sources (KISCHEM, NCIS)
- KOSHA data.go.kr fallback added
- Author affiliation updated to University of Wisconsin-Madison
- Code Metadata table (C1–C9) added

## v0.0 (2026-03-25) — Rev 0
- Initial draft (~5,700 words, elsarticle format)
- 7 data sources, Korean-language UI screenshots
