# arXiv Submission Metadata

## Title

ChemIP: An Open-Source Platform Integrating MSDS, Patent, and Trade Intelligence for Chemical Safety Decision-Making

## Authors

Yu Yong Kim

## Abstract

ChemIP is an open-source web platform that unifies chemical safety (KOSHA MSDS), patent (KIPRIS), trade/market (KOTRA), and pharmaceutical (MFDS/OpenFDA/PubMed) data through API orchestration into a single-entry lookup workflow. Built with a FastAPI backend and Next.js frontend, the system indexes over 350 million patent records across six jurisdictions (USPTO, EPO, WIPO, JPO, KIPRIS, CNIPA) using SQLite FTS5 full-text search and Aho-Corasick multi-pattern matching. A local LLM module (Ollama) provides evidence-grounded analysis without external API dependency. Preliminary evaluation on standard chemical inquiry scenarios estimates a 76% reduction in per-query investigation time compared to manual multi-site lookup. The platform is publicly available under the MIT license with reproducible installation, automated test suites (19 tests, 100% pass rate), and CI/CD pipelines.

## Primary Category

cs.SE (Software Engineering)

## Cross-list Categories

- cs.IR (Information Retrieval)
- cs.CY (Computers and Society)

## MSC Classes

68N99, 68U35

## ACM Classes

H.3.5, D.2.11

## Journal Reference

(To be added after acceptance - target: SoftwareX)

## DOI

(To be added after publication)

## Comments

Source code: https://github.com/yuyongkim/chemIP | MIT License | 19 automated tests | 350M+ patent records indexed

## License

MIT
