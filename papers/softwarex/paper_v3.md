---
title: "ChemIP: An Open-Source Platform Integrating MSDS, Patent, and Trade Intelligence for Chemical Safety Decision-Making"
author: Yu Yong Kim
affiliation: University of Wisconsin-Madison, United States
email: ykim288@wisc.edu
journal: SoftwareX
version: v3.1
date: 2026-04-07
status: draft — style-polished, reviewer-defensible
keywords:
  - chemical safety
  - MSDS
  - API orchestration
  - open-source
  - decision support
  - public data integration
changes_from_v2:
  - Abstract last sentence hedged for repo continuity ("will remain available for the foreseeable future")
  - C3 reworded as archived snapshot statement
  - ICCA figure loosened to "on the order of tens of thousands"
  - Eurostat year expression softened to "most recent available year"
  - KISCHEM full English name added (Korea Information System for Chemical Safety)
  - NICS abbreviation introduced in Section 1, consistent with Acknowledgments
  - KOSHA/data.go.kr fallback sentence anchored to official documentation
  - Comparison claim appended with "based on a literature and product documentation review conducted in early 2026 [4-7]"
  - Table 1 caveat sentence added ("indicative, not exhaustive")
  - Time-reduction caveat expanded ("scripted scenario walkthroughs by the author, indicative rather than definitive")
  - Test count softened from "19" to general description tied to v1.0.0
  - Section 4.2 version pinned to "as of ChemIP v1.0.0"
---

# ChemIP: An Open-Source Platform Integrating MSDS, Patent, and Trade Intelligence for Chemical Safety Decision-Making

## Abstract

Chemical safety practitioners must routinely consult multiple disconnected government portals — each with its own interface, query syntax, and response format — to evaluate a single substance. This fragmented workflow increases investigation time and introduces risks of information omission. ChemIP is an open-source, self-hostable web platform that unifies nine external service endpoints spanning Korean and international public data — covering MSDS safety data, patents, trade intelligence, pharmaceutical registries, chemical classification, and biomedical literature — into a single-query workflow with adapter-based API orchestration. The platform is built with FastAPI and Next.js, supports local deployment for privacy-sensitive environments, and includes an optional LLM-assisted summary with deterministic rule-based fallback. The source code, automated tests, and CI/CD configuration are hosted in a public GitHub repository and will remain available under the AGPL-3.0 license for the foreseeable future, and an archived snapshot of ChemIP v1.0.0 will be deposited on Zenodo with a citable DOI prior to final submission.

## Code Metadata (SoftwareX Mandatory)

| Nr. | Description |
|-----|-------------|
| C1 | Current code version: v1.0.0 |
| C2 | Permanent link to code/repository: https://github.com/yuyongkim/chemIP |
| C3 | Archived snapshot (Zenodo DOI, to be minted prior to final submission) |
| C4 | Legal Code License: AGPL-3.0 |
| C5 | Code versioning system used: git |
| C6 | Software code languages, tools, and services used: Python 3.13, TypeScript 5, FastAPI, Next.js 16, React 19, SQLite, Ollama |
| C7 | Compilation requirements, operating environments & dependencies: Python 3.11+, Node.js 20+, 34 Python packages, 9 npm packages; Windows/Linux/macOS |
| C8 | Link to developer documentation: https://github.com/yuyongkim/chemIP/blob/main/README.md |
| C9 | Support email for questions: ykim288@wisc.edu |

---

## 1. Motivation and Significance

The global chemical industry involves a large number of commercially circulated substances. The International Council of Chemical Associations reports on the order of tens of thousands of chemical products in active commercial use worldwide [1]. Eurostat trade statistics report that EU exports of chemicals and related products were on the order of €560 billion in the most recent available year [2]. Evaluating a single substance for market entry or regulatory compliance requires cross-referencing at least four categories of information: (1) hazard classifications from Material Safety Data Sheets (MSDS); (2) patent status for freedom-to-operate analysis; (3) trade regulations and market dynamics; and (4) pharmaceutical regulatory status when chemicals overlap with drug formulations.

This cross-referencing burden falls disproportionately on two underserved groups: **Korean small and medium-sized enterprises (SMEs) preparing chemical exports**, which must verify that target substances meet destination-country regulations and do not infringe existing patents; and **foreign companies entering the Korean market**, which must navigate Korea-specific safety classifications, labeling requirements, and substance restrictions before domestic distribution.

In the Republic of Korea, these domains are managed by separate agencies — KOSHA (Korea Occupational Safety and Health Agency, occupational safety), KIPRIS (Korea Intellectual Property Rights Information Service, patents), KOTRA (Korea Trade-Investment Promotion Agency, trade), MFDS (Ministry of Food and Drug Safety, pharmaceuticals), KISCHEM (Korea Information System for Chemical Safety, exposure and first-aid data), and NCIS (National Chemical Information System, substance classification), both operated by the National Institute of Chemical Safety (NICS) under the Ministry of Environment — each with independent web portals, query interfaces, and response formats. A typical evaluation requires sequentially accessing each portal, re-entering search queries, and manually compiling results into a working document. This fragmented workflow introduces four systemic inefficiencies, as documented in an internal deployment plan [3]:

1. **Fragmented query channels** — safety, patent, and market data reside in separate portals with no cross-linking;
2. **Process delays** — per-substance investigation time is dominated by repetitive manual lookups across portals;
3. **Inconsistent results** — investigation quality varies with individual practitioner expertise, as no standardized procedure exists; and
4. **Broken follow-up workflows** — after MSDS review, patent and market investigation is often interrupted, leaving cross-domain risks unidentified.

The core problem is not a lack of public data, but **workflow fragmentation**: the information exists across well-maintained government services, yet no open tool integrates them into a unified lookup process for the SMEs and compliance teams that need it most.

### Comparison with Existing Platforms

Table 1 compares ChemIP with existing platforms based on publicly available product documentation. PubChem [4] provides comprehensive chemical properties and partial substance classification but does not integrate MSDS operational data, Korean patents, or trade intelligence. SciFinder [5] and Reaxys [6] offer patent-integrated molecular search but are commercial, subscription-based products that do not cover Korean regulatory data or trade information. OpenFDA [7] provides US drug safety data without cross-domain integration. We are not aware of an existing open-source, self-hostable platform that combines Korean regulatory data sources (KOSHA MSDS, KISCHEM, NCIS) with patent search (KIPRIS) and trade intelligence (KOTRA) in a single integrated workflow, based on a literature and product documentation review conducted in early 2026 [4–7]. Table 1 should therefore be interpreted as an indicative rather than exhaustive comparison.

**Table 1.** Feature comparison of chemical information platforms. Y = supported, partial = limited support, -- = not available. Comparison based on publicly available product documentation as of early 2026.

| Feature | ChemIP | PubChem | SciFinder | Reaxys | OPS | OpenFDA | KOSHA Web |
|---------|:------:|:-------:|:---------:|:------:|:---:|:-------:|:---------:|
| Open-source | Y | Y | -- | -- | Y | Y | -- |
| MSDS integration | Y | -- | partial | -- | -- | -- | Y |
| Patent search | Y | -- | Y | Y | Y | -- | -- |
| Trade intelligence | Y | -- | -- | -- | -- | -- | -- |
| Drug cross-ref | Y | partial | -- | -- | -- | Y | -- |
| Substance classif. | Y | partial | -- | -- | -- | -- | -- |
| Multi-API orchestr. | Y | -- | -- | -- | -- | -- | -- |
| Self-hosted | Y | -- | -- | -- | -- | -- | -- |

---

## 2. Software Description

### 2.1 Software Architecture

ChemIP follows a three-tier architecture (Fig. 1): a Next.js 16 frontend with React 19, a FastAPI backend with 30+ REST endpoints organized into seven route modules, and a data layer comprising SQLite databases and nine external service endpoints.

```
[Web Browser]
    |
    v  REST/JSON proxy
[Next.js 16 / React 19 — port 7000]
    |
    v
[FastAPI Backend — port 7010]
  30+ endpoints · 5-layer middleware · 7 route modules
    |              |              |
    v              v              v
[External APIs]  [SQLite DBs]   [Local LLM]
 KOSHA, KIPRIS,   terminology.db  Ollama
 KOTRA (7), MFDS, (FTS5 index)   (optional)
 OpenFDA, PubMed, patent_index.db
 Naver, KISCHEM,  (optional)
 NCIS
```

**Fig. 1.** Three-tier architecture. The frontend proxies API requests to the backend, which orchestrates nine external service endpoints, local databases, and an optional LLM. Components marked "optional" are not required for core functionality.

**Adapter-based integration.** Each external data source is wrapped in a dedicated adapter module (Table 2) that handles authentication, request construction, response parsing (XML or JSON), and error normalization. All adapters share a unified HTTP client (`backend/api/http_client.py`) with connection pooling (20 connections), exponential-backoff retry (t_k = 0.5 × 2^k s, max 3 retries), automatic failover on transient errors (HTTP 502/503/504), and an SSRF-protection allow-list that restricts outbound requests to known government API hosts. This design allows new data sources to be added without modifying existing adapters or route handlers.

The KOSHA MSDS adapter implements a fallback mechanism (verified in source code `backend/api/kosha_msds_adapter.py`): when the primary API endpoint (`msds.kosha.or.kr`) [14] is unreachable, requests are automatically rerouted to the `data.go.kr` public data portal proxy endpoint [15], ensuring continued access during service outages. Both endpoints expose the same underlying KOSHA MSDS dataset, as described in the official KOSHA MSDS Open API documentation [14] and the corresponding entry on the Korea Public Data Portal [15].

**Table 2.** Integrated data sources and adapter characteristics. LOC counted from source files in the `backend/api/` directory as of ChemIP v1.0.0.

| Source | Format | LOC | Scope |
|--------|--------|----:|-------|
| KOSHA MSDS [14] | XML | 98 | 16-section safety data (with data.go.kr fallback [15]) |
| KIPRIS Patents | XML | 209 | Korean patent search/detail |
| KOTRA (7 APIs) | JSON/XML | 422 | Trade intelligence |
| MFDS | JSON | 70 | Korean drug approvals |
| OpenFDA [7] | JSON | 30 | US drug labels |
| PubMed | JSON | 66 | Biomedical literature |
| Naver | JSON | 54 | Korean news search |
| KISCHEM | XML | 82 | Exposure symptoms, first-aid |
| NCIS | JSON | 78 | Substance classification |

**Note:** The platform integrates nine distinct external service endpoints. KOTRA provides seven sub-APIs (market news, entry strategy, price info, fraud cases, national info, enterprise success, import restrictions) counted as one source group in the adapter architecture.

**Graceful degradation.** The system is designed to function when individual components are unavailable. If the KOSHA API is down, cached MSDS data is served from the local database. If the optional patent index database is not installed, patent search falls back to live KIPRIS API queries. If the LLM server (Ollama) is offline, a deterministic rule-based report builder generates structured safety summaries from the same evidence bundle, with a confidence score C = min(0.95, 0.4 + 0.04 × N_evidence).

**Optional patent search backend.** For deployments requiring large-scale patent analysis, ChemIP supports an optional pre-built patent index using Aho-Corasick multi-pattern matching [8] over an FTS5-indexed SQLite database [9]. This component is not required for core platform functionality and is documented separately in the repository.

**Guide recommendation.** A multi-criteria engine scores chemical–guide matches using weighted exact-match scoring: S = 4|M_CAS| + 3|M_title| + 2|M_body|, with deterministic 8-tuple ranking for reproducible ordering.

### 2.2 Software Functionalities

ChemIP provides six integrated workflows through a tabbed interface (Fig. 2):

1. **Substance safety lookup**: A single query (chemical name, CAS number, or English name) retrieves all 16 MSDS sections with GHS pictograms, cached locally after first retrieval.
2. **Patent landscape**: Dual-track search combining real-time KIPRIS API queries with optional local index lookups. Results are classified as exclusion, usage, or mention by context analysis.
3. **Trade intelligence**: Four analytical views (market news, entry strategy, price trends, fraud alerts) plus HS-code-based import restriction checking via KOTRA APIs.
4. **Pharmaceutical cross-reference**: Aggregates Korean drug approvals (MFDS), US drug labels (OpenFDA), and biomedical literature (PubMed) for the queried substance.
5. **Korean regulatory classification**: Aggregates KISCHEM exposure symptom and first-aid data with NCIS substance classification (toxic, restricted, accident-preparedness) and molecular data.
6. **AI-assisted synthesis**: Collects evidence across all domains and generates a natural-language safety summary. When the LLM is unavailable, a rule-based fallback produces a structured report with source attribution.

**Fig. 2.** ChemIP user interface. (a) Unified search with autocomplete. (b) Eight-tab chemical detail view. (c) Patent search with optional local index backend. (d) Trade analysis hub.

> Screenshots: `figures/cap_main.png`, `figures/cap_chemical.png`, `figures/cap_patents.png`, `figures/cap_trade.png`

---

## 3. Illustrative Usage Scenarios

The following scenarios illustrate how ChemIP consolidates multi-portal workflows into unified queries, drawn from documented use cases in an internal project deployment plan [3]. These are representative usage examples, not formal evaluations; no controlled user study has been conducted.

### Scenario 1: SME Export Pre-screening

A Korean SME plans to export toluene (CAS: 108-88-3) as an industrial solvent to Vietnam. Before shipment, the compliance officer must verify hazard classification, destination-country import restrictions, and patent freedom-to-operate — information spread across KOSHA, KOTRA, and KIPRIS portals. A single ChemIP query retrieves the full 16-section MSDS (GHS pictograms GHS02, GHS07, GHS08; TWA: 50 ppm), KOTRA entry strategy data with import restriction status, KIPRIS patent results, trade fraud alerts, and three matched KOSHA safety guides. The conventional workflow requires accessing at least four portals with separate authentication; ChemIP consolidates this into one tabbed interface with persistent search context.

### Scenario 2: Foreign Company Korean Market Entry

A multinational chemical distributor evaluates methanol (CAS: 67-56-1) for domestic distribution in Korea. Korean regulations require substance-specific safety classification (NCIS), exposure symptom data (KISCHEM), and MSDS compliance (KOSHA) before market entry — each managed by a different agency. One ChemIP query retrieves NCIS classification (toxic substance, accident-preparedness chemical), KISCHEM first-aid and exposure data, the full KOSHA MSDS, and MFDS pharmaceutical cross-references, enabling the compliance team to identify all Korea-specific requirements in a single session.

### Scenario 3: Pharmaceutical Ingredient Cross-reference

A raw material supplier investigates salicylic acid (CAS: 69-72-7) after a client reports regulatory concerns. The drug workflow aggregates MFDS-approved products, OpenFDA labels with relevant warnings, and recent PubMed articles, alongside the MSDS irritant classification — consolidating Korean and US regulatory databases that would otherwise require three separate searches with different query syntaxes.

---

## 4. Impact

### 4.1 Practical Utility

ChemIP addresses a concrete workflow problem: the manual effort required to navigate between disconnected government data portals during substance evaluation. By consolidating nine external service endpoints into a single-query interface, the platform eliminates redundant search entry, provides local caching of previously retrieved data, and enables tab-based cross-domain navigation without portal switching.

A preliminary internal workflow analysis based on standard evaluation scenarios estimates that per-substance investigation time may decrease from approximately 150 minutes (sequential multi-portal access with separate authentication) to approximately 35 minutes (single-query consolidated retrieval), suggesting a potential reduction of roughly 76% [3]. These figures are based on scripted scenario walkthroughs by the author, not on controlled time-and-motion studies, and should therefore be interpreted as indicative rather than definitive. The estimates reflect the elimination of redundant authentication, repeated query entry, and manual result compilation across portals. A formal time-motion study with domain practitioners is planned as future work to validate these figures.

During a two-day internal deployment exercise (February 2026), four issues were identified and resolved: (1) fallback query logic was added for KOTRA endpoints that returned zero results for certain keywords; (2) the export strategy screen was redesigned to emphasize actionable risk summaries rather than raw country listings; (3) trade fraud data encoding was normalized for readability; and (4) GHS hazard statement collection was converted to a batch pipeline to improve coverage beyond English-name matching [3]. These refinements demonstrate that the adapter-based architecture supports rapid iteration in response to real-world data quality issues.

The self-hosted architecture ensures that chemical inquiry patterns — which may reveal proprietary formulations or pending patent strategies — remain within the deployment environment. This is particularly relevant for Korean SMEs evaluating export candidates and foreign companies conducting pre-entry compliance reviews, where substance evaluation patterns constitute trade-sensitive information.

### 4.2 Software Quality and Reproducibility

The repository includes automated smoke tests (in `tests/test_api_smoke.py`) that cover all API endpoint categories. The test suite uses monkeypatch-based mocking to ensure no external API calls during testing, and the full suite passes as of ChemIP v1.0.0. A GitHub Actions CI/CD workflow configuration is included in the repository (`.github/workflows/`), and single-command startup scripts are provided for both development and production environments. Reviewers can verify the test suite by running `pytest tests/test_api_smoke.py` after following the setup instructions in `README.md`.

### 4.3 Deployment Modes

ChemIP supports three deployment configurations:

- **Minimal**: Core search and MSDS lookup using the terminology database and live API calls. No additional setup required beyond API keys from `data.go.kr`.
- **Standard**: Adds cached MSDS data, guide recommendations, drug cross-reference, and Korean regulatory lookups.
- **Full**: Adds the optional local patent index and LLM-assisted analysis.

### 4.4 Limitations

- No formal user study has been conducted; the time-reduction estimates are based on internal scenario walkthroughs, not controlled measurements. Usability evaluation with domain practitioners is planned as future work.
- Some workflows depend on external government APIs that may change specifications or experience outages, as observed with intermittent KOSHA service interruptions during development. The adapter-based design mitigates this through fallback mechanisms.
- The optional patent index requires substantial storage and is not necessary for core platform functionality.
- The LLM component (Qwen3:8b via Ollama) is a general-purpose model; domain-specific fine-tuning could improve the relevance of generated analyses.
- Full deployment requires API keys from Korean government data portals (`data.go.kr`), though the platform operates in degraded mode without them.
- The feature comparison in Table 1 is based on publicly available documentation and may not reflect all capabilities of commercial platforms (SciFinder, Reaxys) that are behind subscription paywalls.

---

## 5. Conclusions

ChemIP provides an open-source, adapter-based integration platform that unifies nine external service endpoints — spanning MSDS safety data, patents, trade intelligence, pharmaceutical registries, chemical classification, and biomedical literature — into a single-query workflow for chemical safety practitioners. The platform is designed for local deployment, supports graceful degradation when individual components are unavailable, and includes automated tests with CI/CD. Future work includes a formal usability study with domain practitioners, expansion to additional regulatory jurisdictions, and exploration of domain-specific LLM fine-tuning. The source code is available at https://github.com/yuyongkim/chemIP under the AGPL-3.0 license.

---

## Declaration of Competing Interest

The author declares no competing interests.

## Acknowledgments

This work utilized public APIs provided by the Korea Occupational Safety and Health Agency (KOSHA), Korea Intellectual Property Rights Information Service (KIPRIS), Korea Trade-Investment Promotion Agency (KOTRA), Ministry of Food and Drug Safety (MFDS), and the National Institute of Chemical Safety (NICS), which operates the KISCHEM and NCIS services under the Ministry of Environment of the Republic of Korea. The author thanks the respective agencies for maintaining open data services that enable third-party integration.

---

## References

1. International Council of Chemical Associations (ICCA), Global Chemical Industry Overview, 2024. https://www.icca-chem.org/global-chemical-industry-overview (Accessed: March 2026)
2. Eurostat, "International trade in chemicals and related products (SITC 5)," Eurostat Statistics Explained, updated January 2025. https://ec.europa.eu/eurostat/statistics-explained/index.php?title=International_trade_in_chemicals_and_related_products (Accessed: March 2026)
3. Y.Y. Kim, ChemIP Platform Adoption Playbook (internal deployment plan), 2026. Available in project repository: `docs/API_ADOPTION_PLAYBOOK.md`.
4. S. Kim, J. Chen, T. Cheng, et al., PubChem 2023 update, Nucleic Acids Research 51(D1) (2023) D1373–D1380.
5. Chemical Abstracts Service, SciFinder-n: Chemical Research Platform, 2024. https://scifinder-n.cas.org (Accessed: March 2026)
6. Elsevier, Reaxys: Chemistry Research Platform, 2024. https://www.reaxys.com (Accessed: March 2026)
7. U.S. Food and Drug Administration, openFDA API Documentation, 2024. https://open.fda.gov (Accessed: March 2026)
8. A.V. Aho, M.J. Corasick, Efficient string matching: An aid to bibliographic search, Communications of the ACM 18(6) (1975) 333–340.
9. D.R. Hipp, SQLite FTS5 Extension Documentation, 2024. https://www.sqlite.org/fts5.html
10. Ollama, Run Large Language Models Locally, 2024. https://ollama.com
11. United Nations Economic Commission for Europe, Globally Harmonized System of Classification and Labelling of Chemicals (GHS Rev. 10), 2023.
12. S. Ramirez, FastAPI: Modern, Fast Web Framework for Building APIs with Python, https://fastapi.tiangolo.com, 2024.
13. Vercel, Next.js: The React Framework for the Web, https://nextjs.org, 2025.
14. Korea Occupational Safety and Health Agency (KOSHA), MSDS Open API Service, 2024. https://msds.kosha.or.kr/MSDSInfo/kcic/openapikosha.do (Accessed: March 2026)
15. Korea Public Data Portal (data.go.kr), "KOSHA Material Safety Data Sheet Inquiry Service (물질안전보건자료 조회 서비스)," Service No. 15157612, 2024. https://www.data.go.kr/data/15157612/openapi.do (Accessed: March 2026)
