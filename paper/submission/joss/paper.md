---
title: 'ChemIP: An open-source platform integrating MSDS, patent, and trade intelligence for chemical safety decision-making'
tags:
  - Python
  - chemical safety
  - MSDS
  - API orchestration
  - decision support
authors:
  - name: Yu Yong Kim
    orcid:
    affiliation: 1
affiliations:
  - name: University of Wisconsin-Madison, United States
    index: 1
date: 2 April 2026
bibliography: paper.bib
---

# Summary

Chemical safety practitioners routinely consult multiple disconnected government portals---each with its own interface, query syntax, and response format---to evaluate a single substance. This fragmented workflow increases investigation time and introduces risks of information omission. **ChemIP** is an open-source, self-hostable web platform that unifies nine Korean and international public data sources---covering MSDS safety data, patents, trade intelligence, pharmaceutical registries, chemical classification, and biomedical literature---into a single-query workflow with adapter-based API orchestration. Built with FastAPI and Next.js, ChemIP supports local deployment for privacy-sensitive environments and includes an optional LLM-assisted summary with a deterministic rule-based fallback. The source code, automated tests, and CI/CD pipeline are publicly available under the AGPL-3.0 license at <https://github.com/yuyongkim/chemIP>.

# Statement of Need

In the Republic of Korea, chemical safety information is managed by separate agencies---KOSHA (occupational safety), KIPRIS (patents), KOTRA (trade), MFDS (pharmaceuticals), KISCHEM (chemical safety), and NCIS/Korea Environment Corporation (substance classification)---each with independent web portals, query interfaces, and response formats. A typical substance evaluation requires sequentially accessing each portal, re-entering search queries, and manually compiling results. This introduces three systemic risks: *information omission* due to variable practitioner expertise, *temporal overhead* from sequential portal access with redundant authentication, and *cross-domain blindness* that prevents identifying connections between safety, patent, and market data.

Existing platforms address parts of this problem but not the whole. PubChem [@pubchem_2023] provides comprehensive chemical properties but does not integrate MSDS operational data, patents, or trade intelligence. SciFinder [@scifinder] and Reaxys [@reaxys] offer patent-integrated molecular search but are commercial products that do not cover Korean regulatory data. OpenFDA [@openfda] covers US drug safety without cross-domain integration.

The core problem is not a lack of public data but **workflow fragmentation**: the information exists across well-maintained government services, yet no open tool integrates them into a unified lookup process. ChemIP addresses this gap by providing adapter-based integration across all nine sources in a single self-hostable application.

# Software Architecture

ChemIP follows a three-tier architecture: a Next.js 16 frontend with React 19, a FastAPI backend with 30+ REST endpoints organized into seven route modules, and a data layer comprising SQLite databases and nine external APIs.

Each external data source is wrapped in a dedicated **adapter module** that handles authentication, request construction, response parsing (XML or JSON), and error normalization. All adapters share a unified HTTP client with connection pooling (20 connections), exponential-backoff retry, and automatic failover on transient errors. This design allows new data sources to be added without modifying existing adapters or route handlers.

The system is designed for **graceful degradation**. If the KOSHA API is down, cached MSDS data is served from the local database. If the optional patent index database is not installed, patent search falls back to live KIPRIS API queries. If the LLM server (Ollama [@ollama]) is offline, a deterministic rule-based report builder generates structured safety summaries from the same evidence bundle. No single component failure prevents the platform from operating.

ChemIP supports three deployment configurations:

- **Minimal**: Core search and MSDS lookup using the terminology database and live API calls. No additional setup required beyond API keys.
- **Standard**: Adds cached MSDS data, guide recommendations, drug cross-reference, and Korean regulatory lookups.
- **Full**: Adds the optional local patent index and LLM-assisted analysis.

# Illustrative Usage

**Substance safety review.** A safety officer evaluates toluene (CAS: 108-88-3) as a candidate solvent. A single search retrieves the full 16-section MSDS with GHS pictograms [@ghs_rev10], matched KOSHA safety guides, KIPRIS patent results, and NCIS classification data---information that would otherwise require visiting at least four separate portals.

**Export regulatory assessment.** A trade analyst checks methanol (CAS: 67-56-1) export requirements for Vietnam. One query retrieves GHS classification, KOTRA entry strategy data, import restriction status, patent landscape, and trade fraud alerts, providing a consolidated regulatory view.

**Pharmaceutical cross-reference.** A researcher investigates salicylic acid (CAS: 69-72-7). The drug workflow aggregates MFDS-approved products, OpenFDA labels with relevant warnings, and recent PubMed articles, alongside the MSDS irritant classification---consolidating sources that span Korean and US regulatory databases.

# Software Quality

The platform includes 19 automated smoke tests covering all API endpoint categories, a GitHub Actions CI/CD pipeline that runs on every push to the main branch, and single-command startup scripts for both development and production environments. The test suite uses monkeypatch-based mocking to ensure no external API calls during testing.

# Acknowledgements

This work utilized public APIs provided by the Korea Occupational Safety and Health Agency (KOSHA), Korea Intellectual Property Rights Information Service (KIPRIS), Korea Trade-Investment Promotion Agency (KOTRA), Ministry of Food and Drug Safety (MFDS), National Institute of Chemical Safety (KISCHEM), and Korea Environment Corporation (NCIS) of the Republic of Korea. The author thanks the respective agencies for maintaining open data services that enable third-party integration.

# References
