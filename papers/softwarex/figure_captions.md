# Figure Captions — paper_v3

## Fig. 1 (Architecture diagram)
Three-tier architecture. The frontend proxies API requests to the backend, which orchestrates nine external service endpoints, local databases, and an optional LLM. Components marked "optional" are not required for core functionality.

## Fig. 2 (Screenshots — 2x2 subfigure grid)

**Overall:** ChemIP platform user interface screenshots illustrating the four primary modules. Each view is accessible via the persistent top navigation bar.

**(a) Home page** (`figures/cap_main.png`):
The ChemIP home page provides a unified search bar accepting chemical names or CAS registry numbers, with a badge indicating nine integrated public data sources. Below the search bar, frequently searched substances are displayed as quick-access cards showing GHS hazard classifications, and a footer summarizes the platform's coverage: MSDS 16 sections, 350M+ patents across 6 jurisdictions, and KOSHA safety guides.

**(b) Chemical detail** (`figures/cap_chemical.png`):
The chemical detail page for Guanidine Hydrochloride (CAS 50-01-1), showing a left-side table of contents with all 16 MSDS sections and a main content panel displaying PubChem safety data including signal word, hazard statements (H302, H315, H319), and precautionary statements. Eight horizontal tabs at the top (MSDS Data, Bilingual Safety, Patents, Trade & Market, Safety Guides, Drugs, KR Regulation, AI Analysis) allow navigation across different data domains for the same substance.

**(c) Patent search** (`figures/cap_patents.png`):
The Global Patent Search interface provides keyword-based search across a patent index covering major international patent offices (USPTO, EPO, WIPO, JPO). The page features a central search bar with placeholder text guiding users to search by chemical name or keyword.

**(d) Trade analysis** (`figures/cap_trade.png`):
The KOTRA Trade Data Analysis Hub presents a dashboard for global market intelligence, organized into four analysis tabs: Products DB, Market Strategy, Price Info, and Trade Fraud. The interface includes country-level filtering, keyword-based search, and a summary panel showing total results, number of countries covered, and current filter criteria.

## Layout decision
Keep 2x2 grid. Compact, balanced, covers all four core modules.
