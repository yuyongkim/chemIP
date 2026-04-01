# Cover Letter — JOSS

**To:** Editorial Board, Journal of Open Source Software

**From:** Yu Yong Kim
- ykim288@wisc.edu / yuyongkim@gmail.com
- University of Wisconsin-Madison

**Re:** Submission of "ChemIP: An open-source platform for chemical safety decision-making"

---

Dear Editor,

I am submitting **ChemIP** for review in JOSS.

ChemIP is an open-source web platform (Python/FastAPI + Next.js/React) that unifies nine Korean and international public data sources — MSDS safety data, patent databases, trade intelligence, pharmaceutical registries, chemical classification, and biomedical literature — into a single-query workflow for chemical safety practitioners.

**Key technical features:**
- 350M+ patent records indexed across 6 jurisdictions using Aho-Corasick multi-pattern matching
- SQLite FTS5 full-text search over 48,000+ chemical terms
- Local LLM integration (Ollama) with evidence-grounded safety synthesis
- Five-layer middleware stack with rate limiting, request tracing, and security headers

**Software quality:**
- 19 automated smoke tests with 100% endpoint coverage
- GitHub Actions CI/CD pipeline
- Comprehensive README with installation guide
- AGPL-3.0 license

**Note on the patent database:** The full 134.5 GB patent index is not included in the repository. The platform functions fully without it (KIPRIS live API search remains available). A reduced demo dataset can be provided to reviewers upon request.

Repository: https://github.com/yuyongkim/chemIP

Sincerely,
Yu Yong Kim
