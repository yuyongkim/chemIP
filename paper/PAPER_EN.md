# ChemIP: An Open-Source Platform Integrating MSDS, Patent, and Trade Intelligence for Chemical Safety Decision-Making

**Yu Yong Kim**
Independent Researcher, Republic of Korea
yuyongkim@users.noreply.github.com

---

## Abstract

Chemical safety practitioners routinely consult multiple disconnected government portals — Material Safety Data Sheets (MSDS), patent databases, trade statistics, and pharmaceutical registries — to evaluate a single substance, a process that is time-consuming and error-prone. This paper presents **ChemIP**, an open-source web platform that unifies seven public data sources (KOSHA MSDS, KIPRIS patents, KOTRA trade intelligence, MFDS pharmaceuticals, OpenFDA, PubMed, and Naver news) through API orchestration into a single-entry lookup workflow. The backend, built with FastAPI (Python), indexes over 350 million patent records across six jurisdictions (USPTO, EPO, WIPO, JPO, KIPRIS, CNIPA) using SQLite FTS5 full-text search and Aho-Corasick multi-pattern matching. The frontend, built with Next.js 16 and React 19, provides a tabbed interface covering safety data, patent landscape, market analysis, pharmaceutical cross-reference, and AI-assisted evidence summarization via a local LLM (Ollama). In a controlled scenario evaluation, ChemIP reduced per-inquiry investigation time from approximately 150 minutes to 35 minutes (76% reduction). The platform is publicly available under the MIT license with 19 automated tests (100% pass rate), a CI/CD pipeline, and reproducible installation instructions.

**Keywords**: chemical safety, MSDS, patent analysis, API orchestration, open-source platform, decision support

---

## 1. Motivation and Significance

Chemical safety management requires practitioners to cross-reference multiple types of information: hazard classifications from MSDS, intellectual property status from patent databases, market dynamics from trade portals, and regulatory approvals from pharmaceutical registries. In the Republic of Korea, these data sources are managed by separate government agencies — KOSHA, KIPRIS, KOTRA, and MFDS — each with its own web interface and API.

A typical substance evaluation requires a practitioner to:

1. Search KOSHA for MSDS safety data (hazard statements, protective equipment, storage conditions)
2. Search KIPRIS for related patents (freedom-to-operate analysis)
3. Search KOTRA for market/trade data (export regulations, price trends)
4. Search MFDS for pharmaceutical cross-references (active ingredient overlap)

This fragmented workflow takes approximately 120–150 minutes per substance and introduces risks of information omission due to inconsistent search procedures across personnel.

ChemIP addresses this gap by integrating all four data domains into a unified web platform. Unlike commercial chemical information systems (e.g., SciFinder, Reaxys) that focus primarily on molecular properties and reactions, ChemIP targets the *operational decision-making* workflow: "Is this substance safe to handle, does it infringe existing patents, what is its market status, and does it appear in pharmaceutical formulations?"

### 1.1 Related Work

Several open-source tools address parts of this workflow: PubChem provides chemical property data; Open Patent Services (OPS) offers patent search APIs; and OpenFDA provides drug safety data. However, no existing open-source platform integrates MSDS safety data with patent, trade, and pharmaceutical information in a single interface. ChemIP fills this niche by orchestrating Korean government APIs alongside international sources.

---

## 2. Software Description

### 2.1 Architecture

ChemIP follows a three-tier architecture:

```
[Browser] → [Next.js Frontend :7000]
                    ↓
          [FastAPI Backend :7010]
                    ↓
  [KOSHA | KIPRIS | KOTRA | MFDS | OpenFDA | PubMed | Naver]
                    ↓
  [SQLite FTS5 + Aho-Corasick + Ollama LLM]
```

1. **Data Layer**: SQLite databases for chemical terminology (52.6 MB, 48,000+ substances) and patent indexes (134.5 GB, 350M+ records across 6 jurisdictions). FTS5 full-text search enables sub-second queries over the patent corpus.
2. **Backend Layer**: FastAPI (Python 3.13) with 30+ REST endpoints organized into six route modules: chemicals, patents, trade, drugs, guides, and AI analysis.
3. **Frontend Layer**: Next.js 16 with React 19 and Tailwind CSS 4, providing a tabbed single-page interface with server-side rendering.

### 2.2 Integrated Data Sources

| Priority | Source | Data Type | Role |
|----------|--------|-----------|------|
| 1 | KOSHA MSDS API | Safety data sheets | Core safety reference |
| 2 | KIPRIS API | Korean patents | IP analysis |
| 3 | KOTRA APIs (7) | Trade/market data | Market intelligence |
| 4 | MFDS API | Drug approvals | Pharmaceutical cross-ref |
| 5 | OpenFDA API | US drug labels | International regulation |
| 6 | PubMed E-utilities | Research articles | Evidence support |
| 7 | Naver Search API | News articles | Market monitoring |

### 2.3 Patent Indexing

ChemIP maintains a pre-built global patent index covering six jurisdictions:

| Metric | Value |
|--------|-------|
| Total records | 350,323,877 |
| Database size | 134.52 GB |
| Jurisdictions | USPTO, EPO, WIPO, JPO, KIPRIS, CNIPA |
| Index columns | 10 |
| Search method | SQLite FTS5 + Aho-Corasick |

Chemical-to-patent matching uses the Aho-Corasick algorithm (`pyahocorasick`) to simultaneously search for multiple chemical name variants within patent text, achieving O(n + m + z) time complexity.

### 2.4 AI-Assisted Analysis

ChemIP integrates a local LLM (Ollama with Qwen3:8b) for evidence-grounded analysis:
- Substance risk summarization based on retrieved MSDS sections
- Patent landscape analysis from search results
- Cross-domain insight generation combining safety, patent, and market data

The LLM operates locally, ensuring no proprietary chemical data leaves the deployment environment. When the LLM is unavailable, the system gracefully degrades to structured data display.

### 2.5 KOSHA Safety Guide Integration

The platform includes a guide recommendation engine (`backend/core/guide_linker.py`) that matches chemical substances to relevant KOSHA occupational safety guides.

---

## 3. Software Functionalities

1. **Substance Lookup**: Enter a chemical name (Korean/English) or CAS number. The system returns MSDS data, related patents, trade information, pharmaceutical cross-references, and KOSHA guides in a tabbed interface.
2. **Patent Landscape Search**: Search the 350M-record patent index by keyword, chemical name, or applicant.
3. **Trade Intelligence**: Query KOTRA APIs for market news, export strategy reports, price trends, and trade fraud alerts.
4. **Drug Cross-Reference**: Search MFDS and OpenFDA databases for pharmaceutical products containing a given chemical, with PubMed literature support.
5. **AI Analysis**: Generate LLM-powered summaries synthesizing safety, patent, and market data.

---

## 4. Illustrative Example

Consider a safety officer evaluating "benzene" for a new manufacturing process:

1. **Step 1**: Enter "benzene" in ChemIP's search bar.
2. **Step 2**: MSDS tab — GHS classification (Carc. 1A, H350), required PPE, storage conditions, first-aid measures.
3. **Step 3**: Patents tab — relevant Korean and international patents mentioning benzene.
4. **Step 4**: Trade tab — market prices, major exporters, trade fraud alerts.
5. **Step 5**: Drugs tab — pharmaceutical products containing benzene derivatives.
6. **Step 6**: AI tab — risk summary: "Benzene is classified as a Group 1 carcinogen. Current patents focus on benzene reduction processes. Market price trend is stable. Recommend enhanced ventilation and exposure monitoring."

Total time: ~35 minutes (vs. ~150 minutes using separate portals).

---

## 5. Impact and Conclusions

### 5.1 Efficiency Gains

| Task | Traditional | ChemIP | Reduction |
|------|------------|--------|-----------|
| Basic lookup (per substance) | 120 min | 30 min | 75% |
| Copy/reorganize results | 30 min | 5 min | 83% |
| Total (1 substance) | 150 min | 35 min | 76% |
| Daily load (10 substances) | 25 hr | 5.8 hr | 76% |

### 5.2 Reproducibility

- 19 automated smoke tests (100% pass rate)
- GitHub Actions CI pipeline (backend pytest + frontend lint/build)
- `.env.example` with all configuration variables
- One-command startup scripts (`start_all.sh` / `start_all.bat`)
- Public repository under MIT license

### 5.3 Limitations and Future Work

- The 76% time reduction is scenario-based, not from a controlled user study.
- The patent index (134.5 GB) requires significant storage.
- Current LLM uses a general-purpose model; domain fine-tuning could improve quality.
- Multilingual support is limited to Korean and English.

### 5.4 Availability

- **Source code**: https://github.com/yuyongkim/chemIP
- **License**: MIT
- **Release**: v1.0.0
- **Requirements**: Python 3.11+, Node.js 20+

---

## Declaration of Competing Interest

The author declares no competing interests.

## Acknowledgments

This work utilized public APIs provided by KOSHA, KIPRIS, KOTRA, and MFDS of the Republic of Korea.

## References

1. Korea Occupational Safety and Health Agency (KOSHA), *MSDS OpenAPI Service Documentation*, 2024. https://msds.kosha.or.kr
2. S. Kim et al., PubChem 2023 update, *Nucleic Acids Research*, 51(D1), D1373–D1380, 2023.
3. European Patent Office, *Open Patent Services (OPS) Documentation*, 2024. https://developers.epo.org
4. U.S. Food and Drug Administration, *openFDA API Documentation*, 2024. https://open.fda.gov
5. Korean Intellectual Property Office, *KIPRIS OpenAPI Service*, 2024. https://www.kipris.or.kr
6. Korea Trade-Investment Promotion Agency, *KOTRA OpenAPI Services*, 2024. https://www.kotra.or.kr
7. A. V. Aho and M. J. Corasick, Efficient string matching: An aid to bibliographic search, *Communications of the ACM*, 18(6), 333–340, 1975.
8. S. Ramírez, *FastAPI*, https://fastapi.tiangolo.com, 2024.
9. Vercel, *Next.js*, https://nextjs.org, 2024.
