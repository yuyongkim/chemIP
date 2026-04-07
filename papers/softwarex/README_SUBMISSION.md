# ChemIP -- SoftwareX Submission Package

This directory contains the final submission materials for the SoftwareX journal.

## File Inventory

| File | Description |
|------|-------------|
| `paper_en.tex` | Main manuscript in LaTeX (elsarticle class, SoftwareX format). Includes Code Metadata table (C1-C9), all required sections, and 11 references. Approximately 2,175 words, within the 3,000-word limit. |
| `cover_letter.md` | Cover letter addressed to the SoftwareX editorial office. Summarizes the problem, software, and fit for the journal. |
| `highlights.md` | Five highlight bullets, each 85 characters or fewer, as required by Elsevier. |
| `SUBMISSION_CHECKLIST.md` | Pre-submission checklist tracking manuscript, document, repository, and action items. |
| `README_SUBMISSION.md` | This file. |

## Screenshots

Screenshots are located in `../screenshots_en/` (not duplicated here to avoid bloat). The manuscript references them via relative path `screenshots_en/`. When compiling the PDF, run LaTeX from the parent directory (`paper/submission/`) or copy/symlink the `screenshots_en/` folder into this directory.

Five screenshots are included:
- `cap_main.png` -- Home page with unified search
- `cap_chemical.png` -- Chemical detail view with MSDS and GHS data
- `cap_patents.png` -- Patent search interface
- `cap_trade.png` -- KOTRA trade intelligence dashboard
- `cap_ai.png` -- AI-assisted analysis (not referenced in paper but available)

## Submission Steps for Elsevier Editorial Manager

1. **Compile the PDF.** From `paper/submission/`, run:
   ```
   pdflatex paper_en.tex
   bibtex paper_en       # (not needed -- bibliography is inline)
   pdflatex paper_en.tex
   pdflatex paper_en.tex
   ```
   Alternatively, use Overleaf: upload `paper_en.tex` and the `screenshots_en/` folder.

2. **Go to Editorial Manager.** Navigate to https://www.editorialmanager.com/softx/ and log in (or create an account).

3. **Start a new submission.** Select article type "Original Software Publication".

4. **Upload files in order:**
   - **Manuscript:** Upload the compiled `paper_en.pdf` (or the `.tex` source if the system accepts LaTeX).
   - **Cover letter:** Paste the content of `cover_letter.md` into the cover letter field (or upload as a separate file).
   - **Highlights:** Paste the five bullets from `highlights.md` into the highlights field.
   - **Figures:** Upload screenshots from `../screenshots_en/` as figure files if they are not embedded in the PDF.

5. **Fill in metadata:**
   - Title: "ChemIP: An open-source platform integrating MSDS, patent, and trade intelligence for chemical safety decision-making"
   - Author: Yu Yong Kim, University of Wisconsin-Madison, ykim288@wisc.edu
   - Keywords: chemical safety, MSDS, API orchestration, open-source, decision support, public data integration
   - Software repository URL: https://github.com/yuyongkim/chemIP

6. **Review and submit.** Verify the PDF rendering, check that all figures appear, and confirm the submission.

## Repository

Source code: https://github.com/yuyongkim/chemIP
License: AGPL-3.0
