# Cover Letter -- JOSS

**To:** Editorial Board, Journal of Open Source Software

**From:** Yu Yong Kim
- ykim288@wisc.edu / yuyongkim@gmail.com
- University of Wisconsin-Madison

**Re:** Submission of "ChemIP: An open-source platform integrating MSDS, patent, and trade intelligence for chemical safety decision-making"

---

Dear Editor,

I am submitting **ChemIP** for review in the Journal of Open Source Software (JOSS).

## What ChemIP does

ChemIP is an open-source, self-hostable web platform (Python/FastAPI + Next.js/React) that addresses workflow fragmentation in chemical safety evaluation. Practitioners who need to assess a substance currently navigate between multiple disconnected government portals---each with its own interface, authentication, and response format---to compile safety, patent, trade, pharmaceutical, and classification data. ChemIP integrates nine Korean and international public data sources into a single-query workflow using an adapter-based API orchestration architecture.

## Technical approach

Each external data source is wrapped in a dedicated adapter module that handles authentication, request construction, response parsing, and error normalization. The platform is designed for graceful degradation: if any individual data source or optional component is unavailable, remaining functionality continues to operate. Key design decisions include:

- **Adapter-based integration**: Nine adapters with a shared HTTP client, connection pooling, exponential-backoff retry, and automatic failover.
- **Deterministic fallback**: When the optional LLM server (Ollama) is offline, a rule-based report builder generates structured safety summaries from the same evidence bundle.
- **Optional components**: The patent index database and LLM integration are optional; the platform operates fully without them using live API queries and rule-based analysis respectively.
- **Self-hosted deployment**: All data stays within the deployment environment, addressing privacy requirements in industrial settings.

## Software quality

- 19 automated smoke tests with monkeypatch-based mocking (no external API calls during testing)
- GitHub Actions CI/CD pipeline running on every push to the main branch
- Single-command startup scripts for development and production environments
- AGPL-3.0 license
- Contributing guide and code of conduct in the repository

## Note on the patent database

The platform includes an optional pre-built patent index for large-scale patent analysis. This component is not required for core functionality---patent search falls back to live KIPRIS API queries when the index is not installed. The platform functions fully without the optional patent index; a reduced demo dataset can be provided to reviewers upon request.

## Repository

<https://github.com/yuyongkim/chemIP>

Sincerely,
Yu Yong Kim
