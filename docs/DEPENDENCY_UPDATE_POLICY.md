# Dependency Update Policy

## Cadence

- Monthly routine update window.
- Emergency patch updates immediately for high-severity vulnerabilities.

## Scope

- Python dependencies in `requirements.txt`
- Frontend dependencies in `frontend/package.json`

## Process

1. Update dependencies in a dedicated `chore/deps-YYYY-MM` branch.
2. Run full verification (`pytest`, `frontend lint`, `frontend build`).
3. Merge only with passing CI and rollback notes.
