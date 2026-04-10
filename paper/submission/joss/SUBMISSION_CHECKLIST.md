# JOSS Submission Checklist

Based on the JOSS review criteria: <https://joss.readthedocs.io/en/latest/review_criteria.html>

## Paper (`paper.md`)

- [x] Title, authors, affiliations in YAML frontmatter
- [ ] ORCID for all authors (fill in before submission)
- [x] `date` field set
- [x] `bibliography: paper.bib` specified
- [x] Summary section
- [x] Statement of Need section with references to related work
- [x] Acknowledgements section
- [x] References in `paper.bib` (BibTeX format)
- [x] Approximately 1,000 words
- [ ] No overclaims (verify: no "78% time reduction", no "350M+ patent records")

## Repository Requirements

- [x] **README**: Installation instructions, usage examples, dependencies
- [x] **LICENSE**: AGPL-3.0 (file exists at repo root)
- [x] **Tests**: 19 smoke tests in `tests/` directory
- [ ] **Contributing guide**: `CONTRIBUTING.md` at repo root (verify exists)
- [ ] **Code of conduct**: `CODE_OF_CONDUCT.md` at repo root (verify exists)
- [x] **CI/CD**: GitHub Actions workflow (`.github/workflows/`)

## Functionality

- [ ] Software installs successfully following README instructions
- [ ] Core functionality works without optional components (patent index, LLM)
- [ ] Automated tests pass (`pytest tests/`)
- [ ] Example usage in README can be reproduced

## Documentation

- [x] README documents installation steps
- [x] README documents how to run the software
- [x] API keys / environment variables documented
- [x] Deployment modes documented (minimal, standard, full)

## Pre-Submission Actions

- [ ] Fill in ORCID in `paper.md` frontmatter
- [ ] Verify `CONTRIBUTING.md` exists at repo root; create if missing
- [ ] Verify `CODE_OF_CONDUCT.md` exists at repo root; create if missing
- [ ] Run full test suite and confirm all tests pass
- [ ] Verify GitHub Actions CI is green on main branch
- [ ] Tag a release version (e.g., `v1.0.0`) on GitHub
- [ ] Create a Zenodo DOI or archive (JOSS requires a permanent archive)
- [ ] Proofread `paper.md` one final time
- [ ] Submit at <https://joss.theoj.org>
