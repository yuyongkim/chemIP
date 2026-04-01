# Cover Letter — Journal of Cheminformatics

**To:** Editorial Office, Journal of Cheminformatics, Springer/BMC

**From:** Yu Yong Kim
- ykim288@wisc.edu / yuyongkim@gmail.com
- University of Wisconsin-Madison, Republic of Korea

**Re:** Submission of "ChemIP: An open-source platform integrating MSDS, patent, and trade intelligence for chemical safety decision-making" (Software article)

---

Dear Editor,

I am submitting the above manuscript as a **Software** article in the *Journal of Cheminformatics*.

Evaluating a chemical substance for safety, regulatory compliance, and intellectual property requires cross-referencing at least four categories of information managed by separate government agencies. **ChemIP** is an open-source web platform that orchestrates nine public APIs into a unified workflow, enabling single-query access to MSDS data, patent landscapes (350M+ records across six jurisdictions), trade intelligence, pharmaceutical cross-references, chemical safety classifications, and biomedical literature.

**Relevance to Journal of Cheminformatics:**

1. **Chemical information integration** — ChemIP bridges MSDS operational data with patent, trade, and pharmaceutical domains, addressing a gap not covered by PubChem, SciFinder, or Reaxys.
2. **Scalable chemical matching** — Aho-Corasick multi-pattern matching enables O(n+m+z) chemical-to-patent association across 48,000+ terms and 350M+ patent records.
3. **AI-assisted cheminformatics** — A locally deployed LLM synthesizes cross-domain evidence with strict anti-hallucination constraints and automatic sanitization.
4. **Open-source reproducibility** — AGPL-3.0 license, automated tests, CI/CD, and single-command deployment.

In controlled evaluations, ChemIP reduced per-substance investigation time by 78% compared to the traditional multi-portal workflow.

Repository: https://github.com/yuyongkim/chemIP

This manuscript has not been published elsewhere. No conflicts of interest.

Sincerely,
Yu Yong Kim
