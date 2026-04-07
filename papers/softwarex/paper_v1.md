---
title: "ChemIP: An Open-Source Platform Integrating MSDS, Patent, and Trade Intelligence for Chemical Safety Decision-Making"
author: Yu Yong Kim
affiliation: University of Wisconsin-Madison, United States
email: ykim288@wisc.edu
journal: SoftwareX
version: v1.0
date: 2026-04-06
status: draft
keywords:
  - chemical safety
  - MSDS
  - API orchestration
  - open-source
  - decision support
  - public data integration
---

# ChemIP: An Open-Source Platform Integrating MSDS, Patent, and Trade Intelligence for Chemical Safety Decision-Making

## Abstract

Chemical safety practitioners must routinely consult multiple disconnected government portals — each with its own interface, query syntax, and response format — to evaluate a single substance. This fragmented workflow increases investigation time and introduces risks of information omission. ChemIP is an open-source, self-hostable web platform that unifies nine Korean and international public data sources — covering MSDS safety data, patents, trade intelligence, pharmaceutical registries, chemical classification, and biomedical literature — into a single-query workflow with adapter-based API orchestration. The platform is built with FastAPI and Next.js, supports local deployment for privacy-sensitive environments, and includes an optional LLM-assisted summary with deterministic rule-based fallback. The source code, automated tests, and CI/CD pipeline are publicly available under the AGPL-3.0 license.

## Code Metadata (SoftwareX Mandatory)

| Nr. | Description |
|-----|-------------|
| C1 | Current code version: v1.0.0 |
| C2 | Permanent link to code/repository: https://github.com/yuyongkim/chemIP |
| C3 | Permanent link to Reproducible Capsule: -- |
| C4 | Legal Code License: AGPL-3.0 |
| C5 | Code versioning system used: git |
| C6 | Software code languages, tools, and services used: Python 3.13, TypeScript 5, FastAPI, Next.js 16, React 19, SQLite, Ollama |
| C7 | Compilation requirements, operating environments & dependencies: Python 3.11+, Node.js 20+, 34 Python packages, 9 npm packages; Windows/Linux/macOS |
| C8 | Link to developer documentation: https://github.com/yuyongkim/chemIP/blob/main/README.md |
| C9 | Support email for questions: ykim288@wisc.edu |

---

## 1. Motivation and Significance

The global chemical industry involves an estimated 40,000–60,000 commercially circulated substances [1], with EU chemical-related exports alone reaching €560 billion in 2024 [2]. Evaluating a single substance for market entry or regulatory compliance requires cross-referencing at least four categories of information: (1) hazard classifications from Material Safety Data Sheets (MSDS); (2) patent status for freedom-to-operate analysis; (3) trade regulations and market dynamics; and (4) pharmaceutical regulatory status when chemicals overlap with drug formulations.

This cross-referencing burden falls disproportionately on two underserved groups: **Korean small and medium-sized enterprises (SMEs) preparing chemical exports**, which must verify that target substances meet destination-country regulations and do not infringe existing patents; and **foreign companies entering the Korean market**, which must navigate Korea-specific safety classifications, labeling requirements, and substance restrictions before domestic distribution.

In the Republic of Korea, these domains are managed by separate agencies — KOSHA (occupational safety), KIPRIS (patents), KOTRA (trade), MFDS (pharmaceuticals), KISCHEM (chemical safety), and NCIS/Korea Environment Corporation (substance classification) — each with independent web portals, query interfaces, and response formats. A typical evaluation requires sequentially accessing each portal, re-entering search queries, and manually compiling results into a working document. This fragmented workflow introduces four systemic inefficiencies [3]:

1. **Fragmented query channels** — safety, patent, and market data reside in separate portals with no cross-linking;
2. **Process delays** — per-substance investigation time is dominated by repetitive manual lookups;
3. **Inconsistent results** — investigation quality varies with individual practitioner expertise, as no standardized procedure exists; and
4. **Broken follow-up workflows** — after MSDS review, patent and market investigation is often interrupted, leaving cross-domain risks unidentified.

The core problem is not a lack of public data, but **workflow fragmentation**: the information exists across well-maintained government services, yet no open tool integrates them into a unified lookup process for the SMEs and compliance teams that need it most.

### Comparison with Existing Platforms

Table 1 compares ChemIP with existing platforms. PubChem [4] provides comprehensive chemical properties but does not integrate MSDS operational data, patents, or trade intelligence. SciFinder [5] and Reaxys [6] offer patent-integrated molecular search but are commercial products that do not cover Korean regulatory data. OpenFDA [7] covers US drug safety without cross-domain integration. ChemIP is, to the best of our knowledge, one of the few openly available tools that integrates MSDS, patent, trade, pharmaceutical, chemical classification, and literature data in a single self-hostable workflow.

**Table 1.** Feature comparison of chemical information platforms.

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

ChemIP follows a three-tier architecture (Fig. 1): a Next.js 16 frontend with React 19, a FastAPI backend with 30+ REST endpoints organized into seven route modules, and a data layer comprising SQLite databases and nine external APIs.

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

**Fig. 1.** Three-tier architecture. The frontend proxies API requests to the backend, which orchestrates nine external APIs, local databases, and an optional LLM. Components marked "optional" are not required for core functionality.

**Adapter-based integration.** Each external data source is wrapped in a dedicated adapter module (Table 2) that handles authentication, request construction, response parsing (XML or JSON), and error normalization. All adapters share a unified HTTP client with connection pooling (20 connections), exponential-backoff retry (t_k = 0.5 × 2^k s, max 3 retries), and automatic failover on transient errors (HTTP 502/503/504). This design allows new data sources to be added without modifying existing adapters or route handlers.

The KOSHA MSDS adapter includes a fallback mechanism: when the primary API endpoint (`msds.kosha.or.kr`) is unreachable, requests are automatically rerouted to the `data.go.kr` proxy endpoint, ensuring continued access during service outages.

**Table 2.** Integrated data sources and adapter characteristics.

| Source | Format | LOC | Scope |
|--------|--------|----:|-------|
| KOSHA MSDS | XML | 98 | 16-section safety data (with fallback) |
| KIPRIS Patents | XML | 209 | Korean patent search/detail |
| KOTRA (7 APIs) | JSON/XML | 422 | Trade intelligence |
| MFDS | JSON | 70 | Korean drug approvals |
| OpenFDA | JSON | 30 | US drug labels |
| PubMed | JSON | 66 | Biomedical literature |
| Naver | JSON | 54 | Korean news search |
| KISCHEM | XML | 82 | Exposure symptoms, first-aid |
| NCIS | JSON | 78 | Substance classification |

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

The following scenarios illustrate how ChemIP consolidates multi-portal workflows into unified queries, drawn from documented use cases in the project deployment plan [3]. These are representative usage examples, not formal evaluations.

### Scenario 1: SME Export Pre-screening

A Korean SME plans to export toluene (CAS: 108-88-3) as an industrial solvent to Vietnam. Before shipment, the compliance officer must verify hazard classification, destination-country import restrictions, and patent freedom-to-operate — information spread across KOSHA, KOTRA, and KIPRIS portals. A single ChemIP query retrieves the full 16-section MSDS (GHS pictograms GHS02, GHS07, GHS08; TWA: 50 ppm), KOTRA entry strategy data with import restriction status, KIPRIS patent results, trade fraud alerts, and three matched KOSHA safety guides. The conventional workflow requires accessing at least four portals with separate authentication; ChemIP consolidates this into one tabbed interface with persistent search context.

### Scenario 2: Foreign Company Korean Market Entry

A multinational chemical distributor evaluates methanol (CAS: 67-56-1) for domestic distribution in Korea. Korean regulations require substance-specific safety classification (NCIS), exposure symptom data (KISCHEM), and MSDS compliance (KOSHA) before market entry — each managed by a different agency. One ChemIP query retrieves NCIS classification (toxic substance, accident-preparedness chemical), KISCHEM first-aid and exposure data, the full KOSHA MSDS, and MFDS pharmaceutical cross-references, enabling the compliance team to identify all Korea-specific requirements in a single session.

### Scenario 3: Pharmaceutical Ingredient Cross-reference

A raw material supplier investigates salicylic acid (CAS: 69-72-7) after a client reports regulatory concerns. The drug workflow aggregates 23 MFDS-approved products, OpenFDA labels with relevant warnings, and recent PubMed articles, alongside the MSDS irritant classification — consolidating Korean and US regulatory databases that would otherwise require three separate searches with different query syntaxes.

---

## 4. Impact

### 4.1 Practical Utility

ChemIP addresses a concrete workflow problem: the manual effort required to navigate between disconnected government data portals during substance evaluation. By consolidating nine data sources into a single-query interface, the platform eliminates redundant search entry, provides local caching of previously retrieved data, and enables tab-based cross-domain navigation without portal switching.

A preliminary workflow analysis based on standard evaluation scenarios estimates that per-substance investigation time decreases from approximately 150 minutes (sequential multi-portal access) to approximately 35 minutes (single-query consolidated retrieval), representing a reduction of roughly 76% [3]. This estimate reflects the elimination of redundant authentication, repeated query entry, and manual result compilation across portals. A formal time-motion study with domain practitioners is planned as future work to validate these preliminary figures.

During a two-day operational trial (February 2026), four issues were identified and resolved: (1) fallback query logic was added for KOTRA endpoints that returned zero results for certain keywords; (2) the export strategy screen was redesigned to emphasize actionable risk summaries rather than raw country listings; (3) trade fraud data encoding was normalized for readability; and (4) GHS hazard statement collection was converted to a batch pipeline to improve coverage beyond English-name matching [3]. These refinements demonstrate that the adapter-based architecture supports rapid iteration in response to real-world data quality issues.

The self-hosted architecture ensures that chemical inquiry patterns — which may reveal proprietary formulations or pending patent strategies — remain within the deployment environment. This is particularly relevant for Korean SMEs evaluating export candidates and foreign companies conducting pre-entry compliance reviews, where substance evaluation patterns constitute trade-sensitive information.

### 4.2 Software Quality and Reproducibility

The platform includes 19 automated smoke tests covering all API endpoint categories, a GitHub Actions CI/CD pipeline that runs on every push to the main branch, and single-command startup scripts for both development and production environments. The test suite uses monkeypatch-based mocking to ensure no external API calls during testing.

### 4.3 Deployment Modes

ChemIP supports three deployment configurations:

- **Minimal**: Core search and MSDS lookup using the terminology database and live API calls. No additional setup required beyond API keys.
- **Standard**: Adds cached MSDS data, guide recommendations, drug cross-reference, and Korean regulatory lookups.
- **Full**: Adds the optional local patent index and LLM-assisted analysis.

### 4.4 Limitations

- No formal user study has been conducted; usability evaluation with domain practitioners is planned as future work.
- Some workflows depend on external government APIs that may change specifications or experience outages, as observed with intermittent KOSHA service interruptions during development.
- The optional patent index requires substantial storage and is not necessary for core platform functionality.
- The LLM component (Qwen3:8b) is a general-purpose model; domain-specific fine-tuning could improve the relevance of generated analyses.
- Full deployment requires API keys from Korean government data portals (`data.go.kr`), though the platform operates in degraded mode without them.

---

## 5. Conclusions

ChemIP provides an open-source, adapter-based integration platform that unifies nine public data sources — spanning MSDS safety data, patents, trade intelligence, pharmaceutical registries, chemical classification, and biomedical literature — into a single-query workflow for chemical safety practitioners. The platform is designed for local deployment, supports graceful degradation when individual components are unavailable, and includes automated tests with CI/CD. Future work includes a formal usability study with domain practitioners, expansion to additional regulatory jurisdictions, and exploration of domain-specific LLM fine-tuning. The complete source code is available at https://github.com/yuyongkim/chemIP under the AGPL-3.0 license.

---

## Declaration of Competing Interest

The author declares no competing interests.

## Acknowledgments

This work utilized public APIs provided by the Korea Occupational Safety and Health Agency (KOSHA), Korea Intellectual Property Rights Information Service (KIPRIS), Korea Trade-Investment Promotion Agency (KOTRA), Ministry of Food and Drug Safety (MFDS), National Institute of Chemical Safety (KISCHEM), and Korea Environment Corporation (NCIS) of the Republic of Korea. The author thanks the respective agencies for maintaining open data services that enable third-party integration.

---

## References

1. International Council of Chemical Associations (ICCA), Global Chemical Industry Overview, 2024. https://www.icca-chem.org/global-chemical-industry-overview
2. Eurostat, EU Trade in Chemicals and Related Products, 2024. https://ec.europa.eu/eurostat/
3. Y.Y. Kim, ChemIP Platform Adoption Playbook (internal deployment plan), 2026. Available in project repository: `docs/API_ADOPTION_PLAYBOOK.md`.
4. S. Kim, J. Chen, T. Cheng, et al., PubChem 2023 update, Nucleic Acids Research 51(D1) (2023) D1373–D1380.
5. Chemical Abstracts Service, SciFinder-n: Chemical Research Platform, 2024. https://scifinder-n.cas.org
6. Elsevier, Reaxys: Chemistry Research Platform, 2024. https://www.reaxys.com
7. U.S. Food and Drug Administration, openFDA API Documentation, 2024. https://open.fda.gov
8. A.V. Aho, M.J. Corasick, Efficient string matching: An aid to bibliographic search, Communications of the ACM 18(6) (1975) 333–340.
9. D.R. Hipp, SQLite FTS5 Extension Documentation, 2024. https://www.sqlite.org/fts5.html
10. Ollama, Run Large Language Models Locally, 2024. https://ollama.com
11. United Nations Economic Commission for Europe, Globally Harmonized System of Classification and Labelling of Chemicals (GHS Rev. 10), 2023.
12. S. Ramirez, FastAPI: Modern, Fast Web Framework for Building APIs with Python, https://fastapi.tiangolo.com, 2024.
13. Vercel, Next.js: The React Framework for the Web, https://nextjs.org, 2025.
14. Korea Occupational Safety and Health Agency (KOSHA), MSDS OpenAPI Service Technical Documentation, 2024. https://msds.kosha.or.kr
