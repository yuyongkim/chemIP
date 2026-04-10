# JOSS Submission Guide for ChemIP

## What is JOSS?

The Journal of Open Source Software (JOSS) is a developer-friendly, open-access journal for research software packages. Papers are short (~1,000 words) and focus on the software itself. Review happens as a public GitHub issue.

## Submission Process

1. **Pre-submission checks**
   - Complete all items in `SUBMISSION_CHECKLIST.md`.
   - Ensure the repository has: README, LICENSE, tests, CONTRIBUTING.md, CODE_OF_CONDUCT.md.
   - Tag a release version on GitHub (e.g., `v1.0.0`).
   - Create a permanent archive via Zenodo (link your GitHub repo to Zenodo, then create a release -- Zenodo auto-archives and assigns a DOI).

2. **Submit**
   - Go to <https://joss.theoj.org/papers/new>.
   - Log in with GitHub.
   - Enter the repository URL: `https://github.com/yuyongkim/chemIP`
   - The system reads `paper.md` and `paper.bib` from the repository. These files must be committed and pushed before submission.
   - JOSS expects `paper.md` at the repo root or in a `paper/` directory. Decide on placement and update the repo accordingly before submitting.

3. **Pre-review**
   - An editor checks that the submission meets basic criteria (scope, paper format, repository quality).
   - The editor may ask for minor fixes before assigning reviewers.

4. **Review**
   - Review happens as a GitHub issue in the `openjournals/joss-reviews` repository.
   - Two reviewers are assigned. They follow a checklist similar to `SUBMISSION_CHECKLIST.md`.
   - You respond to reviewer comments directly in the GitHub issue.
   - Typical review takes 4--8 weeks.

5. **Acceptance**
   - After reviewers approve, the editor accepts the paper.
   - JOSS generates a DOI and publishes the paper (CrossRef-indexed).

## Files in This Directory

| File | Purpose |
|------|---------|
| `paper.md` | JOSS-format paper with YAML frontmatter |
| `paper.bib` | BibTeX references |
| `cover_letter.md` | Cover letter (not required by JOSS, but useful for pre-review communication) |
| `SUBMISSION_CHECKLIST.md` | Checklist of JOSS review criteria |
| `README_SUBMISSION.md` | This file |

## Key Links

- JOSS submission portal: <https://joss.theoj.org>
- JOSS review criteria: <https://joss.readthedocs.io/en/latest/review_criteria.html>
- JOSS paper format guide: <https://joss.readthedocs.io/en/latest/submitting.html>
- ChemIP repository: <https://github.com/yuyongkim/chemIP>
