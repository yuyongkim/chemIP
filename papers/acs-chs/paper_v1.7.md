---
title: "ChemIP: An Open-Source Web Platform for Unified Chemical Safety Data Retrieval across Korean and International Regulatory Sources"
author: Yuyong Kim
affiliation: University of Wisconsin-Madison, United States
email: ykim288@wisc.edu
orcid: 0009-0006-4842-666X
journal: ACS Chemical Health & Safety
version: v1.7
date: 2026-04-08
status: figures added (6 total), submission-ready
article_type: Article
keywords:
  - chemical safety
  - MSDS
  - GHS
  - risk assessment
  - open-source software
  - data integration
---

# ChemIP: An Open-Source Web Platform for Unified Chemical Safety Data Retrieval across Korean and International Regulatory Sources

## Abstract

Chemical safety practitioners evaluating a substance for regulatory compliance must consult multiple disconnected government portals, each with its own interface, query syntax, and response format. In the Republic of Korea, hazard data, substance classifications, patent status, and pharmaceutical registrations are managed by separate agencies with no cross-portal integration. This fragmented workflow increases investigation time, introduces risks of information omission, and creates inconsistent evaluation quality across practitioners. ChemIP is an open-source, self-hostable web platform that integrates Korean and international safety, regulatory, and patent data sources into a single-query workflow. Its core functionality spans Material Safety Data Sheet (MSDS) retrieval with GHS classifications, Korean substance regulatory lookup, patent landscape search for freedom-to-operate analysis, pharmaceutical cross-reference, and AI-assisted safety synthesis. The platform employs an adapter-based architecture with graceful degradation, ensuring continued operation when individual data sources are unavailable. A preliminary workflow analysis suggests that per-substance investigation time may be reduced from approximately 150 min to 35 min by eliminating redundant authentication and manual data compilation across portals. The source code, automated tests, and CI/CD configuration are hosted in a public GitHub repository (https://github.com/yuyongkim/chemIP), and an archived snapshot of the software is deposited on Zenodo (DOI: 10.5281/zenodo.19447588).

## Introduction

The safe handling, transport, and trade of chemical substances requires practitioners to cross-reference multiple categories of regulatory and safety information. For a single substance, this typically includes (1) hazard classifications from Material Safety Data Sheets (MSDS), including GHS pictograms, signal words, and H-statements; (2) substance-specific regulatory classifications such as toxicity designations and accident-preparedness requirements; (3) patent status for freedom-to-operate analysis; and (4) pharmaceutical regulatory status when chemicals overlap with drug formulations.

The global chemical industry involves a large number of commercially circulated substances. The International Council of Chemical Associations reports that there are on the order of tens of thousands of chemical products in active commercial use worldwide.^1 Eurostat trade statistics report that EU exports of chemicals and related products were on the order of €560 billion in the most recent available year.^2 The scale of this industry underscores the need for efficient safety data retrieval tools.

In the Republic of Korea, the Chemical Substances Control Act^16 and the Occupational Safety and Health Act^17 distribute chemical safety responsibilities across six agencies: the Korea Occupational Safety and Health Agency (KOSHA) for MSDS and occupational exposure data; the Korea Intellectual Property Rights Information Service (KIPRIS) for patent search; the Korea Trade-Investment Promotion Agency (KOTRA) for trade intelligence; the Ministry of Food and Drug Safety (MFDS) for pharmaceutical registrations; and the Korea Information System for Chemical Safety (KISCHEM) and the National Chemical Information System (NCIS), both operated by the National Institute of Chemical Safety (NICS) under the Ministry of Environment, for substance classification and exposure data. Each agency maintains an independent web portal with its own query interface and response format.

A typical substance evaluation requires a practitioner to sequentially access each portal, re-enter search queries, and manually compile results into a working document. An internal deployment plan documented four systemic inefficiencies in this workflow:^3 (1) fragmented query channels with no cross-portal linking; (2) process delays dominated by repetitive manual lookups; (3) inconsistent results due to variable practitioner expertise; and (4) broken follow-up workflows where patent and market investigation is interrupted after initial MSDS review.

This cross-referencing burden falls disproportionately on two groups: Korean small and medium-sized enterprises (SMEs) preparing chemical exports, which must verify that target substances meet destination-country regulations and do not infringe existing patents; and foreign companies entering the Korean market, which must navigate Korea-specific safety classifications and substance restrictions before domestic distribution.

The core problem is not a lack of public data — the information exists across well-maintained government services — but workflow fragmentation: no open tool integrates these sources into a unified lookup process. Existing platforms address parts of this problem: PubChem^4 provides comprehensive chemical properties, GHS hazard classification summaries, and patent-extracted chemical structures, but does not provide full 16-section MSDS documents or multi-source orchestration across Korean regulatory portals; SciFinder^5 and Reaxys^6 offer patent-integrated molecular search but are commercial products that do not cover Korean regulatory data; OpenFDA^7 covers US drug safety without cross-domain integration. While PubChem provides GHS classification data and patent search capabilities, and SciFinder and Reaxys offer drug cross-referencing, none of these platforms integrate Korean-specific regulatory data sources (KOSHA full MSDS, KISCHEM, NCIS) with patent search in a unified safety evaluation workflow. To our knowledge, there is no publicly documented open-source, self-hostable platform that orchestrates live queries across these Korean regulatory portals alongside international sources in a single workflow, based on a literature and product documentation review conducted in early 2026.^4-7

In contrast to prior tools that focus primarily on chemical structure or property search, ChemIP is designed explicitly around the end-to-end workflow of regulatory safety evaluation for export-bound and imported substances in the Korean context. This article presents ChemIP, an open-source web platform that integrates safety, regulatory, and patent data sources into a single-query chemical safety investigation workflow, and describes its architecture, safety-relevant functionalities, and preliminary deployment experience.

## Platform Design

**Architecture.** ChemIP follows a three-tier architecture (Figure 1): a browser-based interface,^13 a Python server layer (FastAPI^12) handling queries to multiple safety, regulatory, and patent data sources, and a local data cache for offline access. The server orchestrates external data sources, local databases, and an optional local language model (Ollama^10) for safety report generation. Hazard classifications follow the Globally Harmonized System (GHS Rev. 10).^11

**Adapter-based integration.** Each external data source is wrapped in a dedicated adapter module (Table 1) that handles authentication, request construction, response parsing (XML or JSON), and error normalization. All adapters share a communication layer with automatic retry and failover when government portals experience temporary outages, ensuring reliable safety data retrieval. For deployments requiring large-scale patent analysis, ChemIP supports an optional pre-built patent index using efficient multi-keyword search^8 over a locally cached patent corpus.^9

**Table 1.** Integrated data sources and adapter characteristics as of ChemIP v1.1.1.

| Source | Format | Scope |
|--------|--------|-------|
| KOSHA MSDS^14 | XML | 16-section safety data with GHS classifications (with data.go.kr fallback^15) |
| KIPRIS Patents | XML | Korean patent search and detail retrieval |
| KOTRA (7 sub-APIs) | JSON/XML | Market news, entry strategy, price info, fraud cases, import restrictions |
| MFDS | JSON | Korean drug approval data |
| OpenFDA^7 | JSON | US drug labels and adverse event data |
| PubMed | JSON | Biomedical literature search |
| Naver | JSON | Korean news search |
| KISCHEM | XML | Exposure symptoms and first-aid data |
| NCIS | JSON | Substance classification (toxic, restricted, accident-preparedness) |

**Graceful degradation.** The system is designed to function when individual components are unavailable, which is important for reliable safety information retrieval. If the KOSHA API is down, cached MSDS data is served from the local database. The KOSHA MSDS adapter implements a fallback mechanism: when the primary API endpoint (msds.kosha.or.kr)^14 is unreachable, requests are automatically rerouted to the data.go.kr public data portal proxy endpoint,^15 as described in the official KOSHA MSDS Open API documentation. If the optional patent index database is not installed, patent search falls back to live KIPRIS API queries. If the LLM server (Ollama) is offline, a deterministic rule-based report builder generates structured safety summaries with source attribution.

**Self-hosted deployment for chemical safety confidentiality.** The platform supports local deployment, ensuring that chemical inquiry patterns — which may reveal proprietary formulations or pending patent strategies — remain within the organization's network. This is particularly relevant for SMEs evaluating export candidates and companies conducting pre-entry compliance reviews, where substance evaluation patterns constitute trade-sensitive information. A step-by-step installation guide and example configuration files are provided in the public repository README, enabling practitioners to reproduce the deployment in their own environments.

## Safety-Relevant Functionalities

ChemIP provides five core safety workflows through a tabbed interface (Figure 2):

1. **Substance safety lookup.** A single query (chemical name, CAS number, or English name) retrieves all 16 MSDS sections with GHS pictograms, hazard statements (H-codes), precautionary statements (P-codes), and signal words, cached locally after first retrieval (Figure 3).

2. **Korean regulatory classification.** Aggregates KISCHEM exposure symptom and first-aid data with NCIS substance classification (toxic substance, restricted substance, accident-preparedness substance) and molecular data. This consolidates information that Korean regulations require before market entry.

3. **Patent landscape.** Dual-track search combining real-time KIPRIS API queries with optional local index lookups, supporting freedom-to-operate analysis for export-bound substances (Figure 4). Linking regulatory safety data with patent status in a single workflow enables practitioners to identify both compliance requirements and intellectual property constraints without switching between portals.

4. **Pharmaceutical cross-reference.** Aggregates Korean drug approvals (MFDS), US drug labels (OpenFDA), and biomedical literature (PubMed) for substances that overlap with pharmaceutical formulations (Figure 5).

5. **AI-assisted safety synthesis.** Collects evidence across safety, regulatory, and patent domains and generates a natural-language safety summary. When the LLM is unavailable, a rule-based fallback produces a structured report with source attribution and a confidence score.

The platform also provides supplementary trade intelligence (market news, entry strategy, import restrictions via KOTRA APIs) and Korean news search, which support broader export pre-screening workflows beyond the core safety evaluation.

**Safety guide recommendation.** A multi-criteria engine scores chemical–guide matches using weighted exact-match scoring across CAS numbers, title keywords, and document body text, with deterministic ranking for reproducible ordering of KOSHA safety guide recommendations.

## Use Cases for Chemical Safety Practice

The following scenarios illustrate how ChemIP consolidates multi-portal workflows into unified queries, drawn from documented use cases in an internal deployment plan.^3 These are representative usage examples, not formal evaluations.

**SME export pre-screening.** A Korean SME plans to export toluene (CAS: 108-88-3) as an industrial solvent to Vietnam. Before shipment, the compliance officer must verify hazard classification (GHS pictograms GHS02, GHS07, GHS08; TWA: 50 ppm) and patent freedom-to-operate — information spread across KOSHA and KIPRIS portals. A single ChemIP query retrieves the full 16-section MSDS with GHS classifications, KIPRIS patent results for freedom-to-operate analysis, NCIS regulatory classification, and three matched KOSHA safety guides. Supplementary trade data (import restrictions, entry strategy) is available in an additional tab. The conventional workflow requires accessing multiple portals with separate authentication; ChemIP consolidates safety, regulatory, and patent data into one interface.

**Foreign company Korean market entry.** A multinational chemical distributor evaluates methanol (CAS: 67-56-1) for domestic distribution in Korea. Korean regulations require substance-specific safety classification (NCIS), exposure symptom data (KISCHEM), and MSDS compliance (KOSHA) before market entry — each managed by a different agency. One ChemIP query retrieves NCIS classification (toxic substance, accident-preparedness chemical), KISCHEM first-aid and exposure data, the full KOSHA MSDS, and MFDS pharmaceutical cross-references, enabling the compliance team to identify all Korea-specific safety requirements in a single session.

**Pharmaceutical ingredient safety cross-reference.** A raw material supplier investigates salicylic acid (CAS: 69-72-7) after a client reports regulatory concerns. The drug workflow aggregates MFDS-approved products, OpenFDA labels with relevant warnings, and recent PubMed articles, alongside the MSDS irritant classification — consolidating Korean and US regulatory databases that would otherwise require three separate searches.

## Results and Discussion

**Preliminary workflow analysis.** An internal workflow analysis based on three standard evaluation scenarios (toluene export screening, methanol market entry, salicylic acid cross-reference) estimates that per-substance investigation time may decrease from approximately 150 min (sequential multi-portal access with separate authentication) to approximately 35 min (single-query consolidated retrieval), suggesting a potential reduction of roughly 76% (Figure 6).^3 In terms of discrete workflow steps, the number of separate portal accesses is reduced from at least four (with separate authentication for each) to one, and manual result compilation across portals is eliminated entirely. These figures are based on scripted scenario walkthroughs by the author using these three representative cases, not on controlled time-and-motion studies, and should therefore be interpreted as indicative rather than definitive. We emphasize that these values are rough, order-of-magnitude estimates intended to illustrate potential time savings, rather than statistically validated performance metrics. A formal time-motion study with domain practitioners is planned as future work.

**Deployment experience.** During a two-day internal deployment exercise (February 2026), several issues were identified and resolved, including: (1) GHS hazard statement collection was converted to a batch pipeline to improve coverage beyond English-name matching; (2) KOSHA MSDS fallback logic was refined for edge cases where the primary endpoint returned incomplete data; and (3) NCIS classification display was restructured to clearly distinguish toxic, restricted, and accident-preparedness substance categories.^3 These refinements demonstrate that the adapter-based architecture supports rapid iteration in response to real-world data quality issues encountered in safety information retrieval. These observations are consistent with broader ACS guidance emphasizing systematic hazard recognition and risk assessment as foundational to chemical safety practice.^18

**Software quality.** The repository includes unit-level smoke tests with mocked external dependencies, covering all API endpoint categories. The test suite runs in an isolated environment that does not contact external services, and the full suite passes as of ChemIP v1.1.1. Automated quality checks run on every code update. API endpoint documentation is available via the platform's built-in documentation interface.

**Deployment modes.** ChemIP supports three deployment configurations: (1) Minimal — core search and MSDS lookup using the terminology database and live API calls, requiring only API keys from data.go.kr; (2) Standard — adds cached MSDS data, guide recommendations, drug cross-reference, and Korean regulatory lookups; and (3) Full — adds the optional local patent index and LLM-assisted analysis.

**Comparison with existing tools.** Table 2 compares ChemIP with existing platforms based on publicly available product documentation as of early 2026. The comparison should be interpreted as an indicative rather than exhaustive survey.

**Table 2.** Feature comparison of chemical safety information platforms. Y = supported, partial = limited support, -- = not available. "Full MSDS" refers to structured 16-section MSDS documents per GHS/OSHA format; "GHS classification data" refers to hazard pictograms, H-codes, and signal words. Comparison based on publicly available product documentation as of early 2026.

| Feature | ChemIP | PubChem | SciFinder | Reaxys | OpenFDA | KOSHA Web |
|---------|:------:|:-------:|:---------:|:------:|:-------:|:---------:|
| Open-source | Y | --^a | -- | -- | partial^b | -- |
| Full MSDS (16 sections) | Y | -- | -- | -- | -- | Y |
| GHS classification data | Y | Y | partial | -- | -- | Y |
| Patent search | Y | Y | Y | Y | -- | -- |
| Drug cross-ref | Y | Y | partial | partial | Y | -- |
| Substance classification | Y | partial | partial | -- | -- | partial |
| Multi-source orchestration | Y | -- | -- | -- | -- | -- |
| Self-hosted deployment | Y | -- | -- | -- | -- | -- |

^a PubChem data is open-access, but the platform software is not open-source. ^b OpenFDA API client libraries are open-source, but the backend infrastructure is government-hosted and not redistributable.

**Limitations.** No formal user study has been conducted; usability evaluation with domain practitioners is planned. Some workflows depend on external government APIs that may change specifications or experience outages, as observed with intermittent KOSHA service interruptions during development; the adapter-based design mitigates this through fallback mechanisms. Locally cached MSDS data may become stale if upstream agencies update their records; the current implementation does not include an automatic cache invalidation mechanism, and users should be aware that cached safety data may not reflect the most recent regulatory changes. The Korean regulatory data sources (KOSHA, KISCHEM, NCIS) return data primarily in Korean; while the platform provides bilingual display for some MSDS fields, non-Korean-speaking users may find limited utility in the Korean regulatory classification modules. The LLM component (Qwen3:8b via Ollama) is a general-purpose model; domain-specific fine-tuning could improve relevance of generated safety analyses. Full deployment requires API keys from Korean government data portals (data.go.kr), though the platform operates in degraded mode without them. The platform aggregates and displays data from government open APIs under their respective terms of service; users should consult each agency's data usage policies for redistribution or commercial use.

## Conclusions

ChemIP provides an open-source, adapter-based integration platform that unifies safety, regulatory, patent, and pharmaceutical data sources into a single-query workflow for chemical safety practitioners. The platform addresses the workflow fragmentation that currently requires Korean SMEs and foreign market entrants to navigate multiple disconnected government portals for substance evaluation. The self-hosted architecture preserves confidentiality of chemical inquiry patterns, and the graceful degradation design ensures continued operation when individual data sources are unavailable. Future work includes a formal usability study with domain practitioners, expansion to additional regulatory jurisdictions, and exploration of domain-specific LLM fine-tuning for safety analysis. The source code is available at https://github.com/yuyongkim/chemIP under the AGPL-3.0 license, and an archived snapshot is deposited on Zenodo (DOI: 10.5281/zenodo.19447588).

## Associated Content

**Supporting Information.** Platform installation and configuration guide, complete API endpoint reference (80+ endpoints across 7 modules), database schema documentation, annotated user interface screenshots (Korean and English), and deployment mode specifications (PDF).

## Author Information

**Corresponding Author:** Yuyong Kim — University of Wisconsin-Madison, United States; orcid.org/0009-0006-4842-666X; Email: ykim288@wisc.edu

**Notes:** The author declares no competing financial interest.

## Acknowledgments

This work utilized public APIs provided by the Korea Occupational Safety and Health Agency (KOSHA), Korea Intellectual Property Rights Information Service (KIPRIS), Korea Trade-Investment Promotion Agency (KOTRA), Ministry of Food and Drug Safety (MFDS), and the National Institute of Chemical Safety (NICS), which operates the KISCHEM and NCIS services under the Ministry of Environment of the Republic of Korea. The author thanks the respective agencies for maintaining open data services that enable third-party integration. This manuscript was prepared with the assistance of Claude (Anthropic), which was used for drafting, editing, and code review.

## References

1. International Council of Chemical Associations (ICCA). Global Chemical Industry Overview, 2024. https://www.icca-chem.org/global-chemical-industry-overview (accessed March 2026).
2. Eurostat. International Trade in Chemicals and Related Products (SITC 5). Eurostat Statistics Explained, updated January 2025. https://ec.europa.eu/eurostat/statistics-explained/index.php?title=International_trade_in_chemicals_and_related_products (accessed March 2026).
3. Kim, Y. Y. ChemIP Platform Adoption Playbook (Internal Deployment Plan), 2026. Available in project repository: docs/API_ADOPTION_PLAYBOOK.md.
4. Kim, S.; Chen, J.; Cheng, T.; et al. PubChem 2023 Update. *Nucleic Acids Res.* **2023**, *51* (D1), D1373–D1380. DOI: 10.1093/nar/gkac956.
5. Chemical Abstracts Service. SciFinder-n: Chemical Research Platform, 2024. https://scifinder-n.cas.org (accessed March 2026).
6. Elsevier. Reaxys: Chemistry Research Platform, 2024. https://www.reaxys.com (accessed March 2026).
7. U.S. Food and Drug Administration. openFDA API Documentation, 2024. https://open.fda.gov (accessed March 2026).
8. Aho, A. V.; Corasick, M. J. Efficient String Matching: An Aid to Bibliographic Search. *Commun. ACM* **1975**, *18* (6), 333–340. DOI: 10.1145/360825.360855.
9. Hipp, D. R. SQLite FTS5 Extension Documentation, 2024. https://www.sqlite.org/fts5.html (accessed March 2026).
10. Ollama. Run Large Language Models Locally, 2024. https://ollama.com (accessed March 2026).
11. United Nations Economic Commission for Europe. Globally Harmonized System of Classification and Labelling of Chemicals (GHS Rev. 10), ST/SG/AC.10/30/Rev.10, 2023.
12. Ramirez, S. FastAPI: Modern, Fast Web Framework for Building APIs with Python, 2024. https://fastapi.tiangolo.com (accessed March 2026).
13. Vercel. Next.js: The React Framework for the Web, 2025. https://nextjs.org (accessed March 2026).
14. Korea Occupational Safety and Health Agency (KOSHA). MSDS Open API Service, 2024. https://msds.kosha.or.kr/MSDSInfo/kcic/openapikosha.do (accessed March 2026).
15. Korea Public Data Portal (data.go.kr). KOSHA Material Safety Data Sheet Inquiry Service, Service No. 15157612, 2024. https://www.data.go.kr/data/15157612/openapi.do (accessed March 2026).
16. Republic of Korea. Chemical Substances Control Act (화학물질관리법), Act No. 16084, 2018.
17. Republic of Korea. Occupational Safety and Health Act (산업안전보건법), Act No. 16272, 2019.
18. American Chemical Society Committee on Chemical Safety. Identifying and Evaluating Hazards in Research Laboratories; ACS: Washington, DC, 2015.
