# J. Cheminformatics Submission Checklist

## Manuscript Formatting
- [ ] Article type: Software
- [ ] Document class: `article` (not `elsarticle`)
- [ ] Sections present: Background, Implementation, Results and Discussion, Conclusions
- [ ] "Availability and Requirements" section included (project name, URL, OS, language, license, restrictions)
- [ ] Authors' Contributions section included
- [ ] Declaration of Competing Interests section included
- [ ] Abstract: concise, no citations, includes keywords
- [ ] Target length: 4,500-5,000 words (check with `texcount paper_en.tex`)

## References
- [ ] Minimum 25-30 references (currently 30)
- [ ] References formatted in Vancouver/numbered style (BMC standard)
- [ ] All DOIs included where available
- [ ] All URLs have access dates
- [ ] Key cheminformatics tools cited: RDKit, Open Babel, CDK, KNIME
- [ ] Key databases cited: PubChem, ChEBI, ChemSpider, CompTox
- [ ] No self-citations to unpublished or non-existent work

## Figures and Tables
- [ ] All figures referenced in text
- [ ] Figure captions are self-contained
- [ ] Screenshots are legible at print resolution (300 DPI minimum)
- [ ] Tables do not duplicate figure content
- [ ] Feature comparison table is accurate and up-to-date

## Content Accuracy (Rev 3 Alignment)
- [ ] No overclaims about performance metrics (no "78% time reduction")
- [ ] No overclaims about patent record counts (no "350M+ records")
- [ ] Patent index described as optional, not core
- [ ] LLM described as optional with fallback
- [ ] Usage scenarios are "illustrative", not "formal evaluations"
- [ ] Limitations section is present and honest

## Cover Letter
- [ ] Addresses Editor of J. Cheminformatics
- [ ] Specifies "Software" article type
- [ ] Highlights relevance to cheminformatics community
- [ ] No overclaims (aligned with Rev 3)
- [ ] Author contact information included

## Supplementary Materials (if applicable)
- [ ] Source code repository URL provided and accessible
- [ ] README in repository is up-to-date
- [ ] License file present in repository (AGPL-3.0)
- [ ] CI/CD pipeline passing (green badge)
- [ ] Test suite runs successfully

## Submission System Requirements
- [ ] Manuscript file: LaTeX source (.tex) or PDF
- [ ] Figures: separate high-resolution files if required by system
- [ ] Cover letter: uploaded or pasted into submission form
- [ ] ORCID: author ORCID linked (if available)
- [ ] Competing interests declaration completed in submission form
- [ ] Data availability statement: "Source code available at [GitHub URL]"
- [ ] Suggested reviewers (optional but recommended): 2-3 names in cheminformatics/chemical safety software

## Pre-Submission Checks
- [ ] LaTeX compiles without errors
- [ ] All cross-references resolve (no `??`)
- [ ] Spell-check completed
- [ ] Co-authors (if any) have approved the manuscript
- [ ] Repository is public and accessible
