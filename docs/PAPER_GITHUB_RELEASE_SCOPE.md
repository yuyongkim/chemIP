# Paper GitHub Release Scope

This document defines the recommended public GitHub scope for the SoftwareX paper release of ChemIP.

## Goal

The paper describes a web software workflow centered on:

- MSDS retrieval
- patent retrieval
- evidence-assisted backend analysis

Because the manuscript discusses an integrated web platform, the public paper repository should include the frontend as well as the backend.

## Include

- `README.md`
- `README.ko.md`
- `LICENSE`
- `.env.example`
- `requirements.txt`
- `pytest.ini`
- `backend/`
- `frontend/`
- `tests/`
- `scripts/build_uspto_index.py`
- `scripts/build_global_index.py`
- `scripts/test_kipris_live.py`
- `scripts/verify_submission.py`
- `start_all.bat`
- `start_all.sh`
- `submit_check.bat`
- `submit_check.sh`
- `ecosystem.config.js`

## Exclude

- `.env`
- `data/*.db`
- `data/kosha_guide/*`
- `logs/`
- `.venv/`
- `node_modules/`
- `.next/`
- `_archive/`
- `archive/`
- `backups/`

## Rationale

- Include `frontend/` because the paper presents a usable integrated web workflow rather than a backend library only.
- Include `tests/` and verification scripts because SoftwareX reviewers may clone and run the repository.
- Exclude runtime data and secrets because they are not required to inspect the code structure and they create security or distribution issues.
- Exclude unrelated local artifacts and backups because they are outside the paper scope.

## Practical Upload Target

If you use the full review bundle, the intended upload target is:

- `dist/chemIP/`

That bundle already contains backend, frontend, tests, and public-safe config files.
