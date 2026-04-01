# Cover Letter — SoftwareX

**To:** Editorial Office, SoftwareX, Elsevier

**From:** Yu Yong Kim
- ykim288@wisc.edu / yuyongkim@gmail.com
- University of Wisconsin-Madison

**Re:** Submission of "ChemIP: An open-source platform integrating MSDS, patent, and trade intelligence for chemical safety decision-making"

---

Dear Editor,

I am submitting the above manuscript for consideration as an Original Software Publication in *SoftwareX*.

**Problem.** Chemical safety practitioners in Korea must navigate up to six separate government portals — each with its own interface, query syntax, and response format — to evaluate a single substance. The core issue is not data availability but workflow fragmentation: well-maintained public data services exist, yet no open tool integrates them.

**Software.** ChemIP is an open-source, self-hostable web platform that unifies nine public data sources (KOSHA MSDS, KIPRIS patents, KOTRA trade intelligence, MFDS/OpenFDA pharmaceuticals, KISCHEM exposure data, NCIS substance classification, PubMed, Naver) into a single-query workflow. The adapter-based architecture supports graceful degradation when individual APIs or optional components are unavailable.

**SoftwareX fit:**
- Adapter-based integration pattern extensible to additional jurisdictions
- Local deployment for privacy-sensitive industrial environments
- Deterministic rule-based fallback when LLM is offline
- Automated tests, GitHub Actions CI, single-command installation
- AGPL-3.0 license with public repository

**Reviewer access.** The platform functions in minimal mode with only API keys from data.go.kr. Installation guide and sample configuration are provided in the repository README. We are prepared to assist reviewers with setup upon request.

This manuscript has not been published elsewhere and is not under consideration by any other journal. No conflicts of interest.

Sincerely,
Yu Yong Kim
