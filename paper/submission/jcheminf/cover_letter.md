# Cover Letter --- Journal of Cheminformatics

**To:** Editorial Office, Journal of Cheminformatics, Springer/BMC

**From:** Yu Yong Kim
- ykim288@wisc.edu / yuyongkim@gmail.com
- University of Wisconsin-Madison

**Re:** Submission of "ChemIP: An open-source platform integrating MSDS, patent, and trade intelligence for chemical safety decision-making" (Software article)

---

Dear Editor,

I am pleased to submit the above manuscript for consideration as a **Software** article in the *Journal of Cheminformatics*.

**Problem addressed.** Chemical safety practitioners routinely consult multiple disconnected government portals---each with distinct interfaces, query syntax, and response formats---to evaluate a single substance. In the Republic of Korea, at least six agencies maintain independent web portals for MSDS data, patents, trade intelligence, pharmaceutical approvals, chemical safety classifications, and substance classification. This fragmented workflow introduces risks of information omission and imposes unnecessary overhead on practitioners who must re-enter queries across portals and manually compile results.

**What ChemIP provides.** ChemIP is an open-source, self-hostable web platform that orchestrates nine public data sources into a unified single-query workflow. The platform is built with FastAPI and Next.js, uses an adapter-based architecture that isolates each data source integration, and supports graceful degradation when individual components are unavailable. An optional locally deployed LLM provides evidence synthesis, with a deterministic rule-based fallback ensuring the platform remains fully functional without any AI dependency.

**Relevance to Journal of Cheminformatics:**

1. **Chemical information integration gap.** While the cheminformatics community has developed excellent molecular-level tools (RDKit, Open Babel, CDK) and comprehensive databases (PubChem, ChEBI, ChemSpider), there is limited open-source tooling for integrating operational chemical data---MSDS sections, patent claims, trade restrictions, and regulatory classifications---across multiple government APIs into a unified workflow. ChemIP addresses this integration layer.

2. **Adapter-based architecture as design contribution.** The paper describes an adapter pattern for multi-API orchestration with connection pooling, exponential-backoff retry, endpoint-level fallback, and failure isolation. This architecture is extensible to additional data sources and may serve as a reference design for similar integration efforts in cheminformatics.

3. **Open-source reproducibility.** ChemIP is released under the AGPL-3.0 license with automated tests, CI/CD via GitHub Actions, and single-command deployment scripts. The complete source code is available at https://github.com/yuyongkim/chemIP.

4. **Software article type.** The manuscript describes the software's background, implementation, and illustrative usage scenarios, consistent with the Journal of Cheminformatics Software article requirements. An "Availability and Requirements" section is included.

This manuscript has not been published or submitted elsewhere. The author declares no competing interests.

Sincerely,
Yu Yong Kim
University of Wisconsin-Madison
ykim288@wisc.edu
