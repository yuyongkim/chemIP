# ChemIP — Submission Packages

Three journal submission packages, ready in priority order.
Submit to **SoftwareX first**; if rejected, move to the next.

---

## 1. SoftwareX (1st choice)

| Item | Detail |
|---|---|
| Directory | `softwarex/` |
| APC | $1,560 |
| Review time | ~16 weeks |
| Paper format | LaTeX (elsarticle), ~2,175 words |
| Status | **Ready to submit** |

**Files:**
- `paper_en.tex` — manuscript
- `cover_letter.md` — cover letter
- `highlights.md` — 5 bullets
- `SUBMISSION_CHECKLIST.md` — pre-submission checklist
- `README_SUBMISSION.md` — Elsevier Editorial Manager steps

**Submit at:** https://www.editorialmanager.com/softx/

---

## 2. JOSS (2nd choice — if SoftwareX rejects)

| Item | Detail |
|---|---|
| Directory | `joss/` |
| APC | Free |
| Review time | ~4-8 weeks |
| Paper format | Markdown (`paper.md`), ~1,000 words |
| Status | **Ready to submit** |

**Files:**
- `paper.md` — JOSS-format paper with YAML frontmatter
- `paper.bib` — BibTeX references
- `cover_letter.md` — cover letter
- `SUBMISSION_CHECKLIST.md` — JOSS review criteria checklist
- `README_SUBMISSION.md` — JOSS submission steps

**Submit at:** https://joss.theoj.org/papers/new

**Note:** JOSS reviewers must install and run the software. Ensure the repo README has clear quick-start instructions. The patent DB is optional and not required for review.

---

## 3. Journal of Cheminformatics (3rd choice — highest IF)

| Item | Detail |
|---|---|
| Directory | `jcheminf/` |
| APC | $2,390 |
| Review time | ~14 weeks |
| Paper format | LaTeX, ~4,500-5,000 words (expanded) |
| Status | **Ready to submit** |

**Files:**
- `paper_en.tex` — expanded manuscript (deeper related work, 25-30 refs)
- `cover_letter.md` — cover letter
- `SUBMISSION_CHECKLIST.md` — J. Cheminf checklist
- `README_SUBMISSION.md` — Springer/BMC submission steps

**Submit at:** https://www.editorialmanager.com/jche/

---

## Shared Assets

- **Screenshots:** `screenshots_en/` (English UI, shared across all packages)
- **Repository:** https://github.com/yuyongkim/chemIP
- **License:** AGPL-3.0

## Pre-submission Actions (all journals)

- [ ] Push latest code to GitHub
- [ ] Verify CI passes
- [ ] Add ORCID to author metadata (if available)
- [ ] Compile LaTeX to PDF (SoftwareX, J. Cheminf)
- [ ] Tag a release (e.g., `v1.0.0`) for citation

## Strategy

```
SoftwareX ──reject──> JOSS ──reject──> J. Cheminformatics
   |                    |                      |
   accept              accept                accept
```

Do NOT submit to multiple journals simultaneously.
