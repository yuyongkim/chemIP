# Submitting to Journal of Cheminformatics (Springer/BMC)

## Submission Portal

Submit via the Springer/BMC editorial system:
- URL: https://www.editorialmanager.com/jcheminf/
- Article type: **Software**

## Account Setup

1. Go to the editorial manager URL above.
2. Create an account or log in with an existing Springer Nature account.
3. Select "Submit New Manuscript" from the author dashboard.

## Submission Steps

### Step 1: Article Type
- Select **"Software"** as the article type.

### Step 2: Manuscript Files
- Upload `paper_en.tex` as the main manuscript (or compile to PDF first and upload the PDF).
- If LaTeX source is uploaded, include all referenced image files from `../screenshots_en/`.
- Alternatively, compile locally and upload the resulting PDF.

### Step 3: Cover Letter
- Paste the content of `cover_letter.md` into the cover letter field, or upload as a separate file.

### Step 4: Metadata
- Title: "ChemIP: An open-source platform integrating MSDS, patent, and trade intelligence for chemical safety decision-making"
- Authors: Yu Yong Kim (University of Wisconsin-Madison)
- Corresponding author email: ykim288@wisc.edu
- Keywords: chemical safety, MSDS, API orchestration, open-source, decision support, public data integration, cheminformatics

### Step 5: Declarations
- Competing interests: "The author declares no competing interests."
- Data availability: "The source code is available at https://github.com/yuyongkim/chemIP under the AGPL-3.0 license."
- Funding: Declare any funding or "No funding was received for this work."

### Step 6: Suggested Reviewers (Optional)
Consider suggesting 2-3 reviewers with expertise in:
- Cheminformatics software development
- Chemical safety information systems
- Open-source scientific software

### Step 7: Review and Submit
- Review all entered information.
- Confirm submission.
- Note the manuscript ID for future correspondence.

## After Submission

- You will receive a confirmation email with a manuscript tracking number.
- Typical review timeline: 4-8 weeks for initial decision.
- Monitor status via the editorial manager dashboard.

## Compiling the LaTeX Manuscript

To compile locally before submission:

```bash
cd paper/submission/jcheminf/
pdflatex paper_en.tex
bibtex paper_en       # if using .bib file; otherwise skip
pdflatex paper_en.tex
pdflatex paper_en.tex
```

Note: The manuscript uses `\begin{thebibliography}` (inline references), so `bibtex` is not needed. Two `pdflatex` passes should suffice for cross-references.

## File Inventory

| File | Purpose |
|------|---------|
| `paper_en.tex` | Main manuscript (LaTeX source) |
| `cover_letter.md` | Cover letter for submission |
| `SUBMISSION_CHECKLIST.md` | Pre-submission quality checklist |
| `README_SUBMISSION.md` | This file |
| `../screenshots_en/*.png` | Figure files referenced by the manuscript |
