# Contributing Guide

## Workflow

1. Create a branch from `main` using: `feat/*`, `fix/*`, `chore/*`, `docs/*`.
2. Keep changes scoped to one concern.
3. Run required checks before opening a PR.

## Required Checks

- Backend: `pytest`
- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`

## Commit Convention

- `feat: ...` new feature
- `fix: ...` bug fix
- `refactor: ...` no behavior change
- `docs: ...` documentation only
- `chore: ...` infra/tooling
- `test: ...` tests only

## Pull Request Rules

- Describe the user-facing impact.
- Add test evidence (logs/screenshots).
- Update docs when behavior or operations changed.
- Keep PR small enough to review in one pass.
