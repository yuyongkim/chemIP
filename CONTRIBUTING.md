# Contributing to ChemIP

Thank you for your interest in contributing to ChemIP! This guide explains how to get started.

## Getting Started

1. Fork the repository and clone your fork.
2. Follow the installation instructions in [README.md](README.md).
3. Create a branch from `main` using the naming convention below.

## Branch Naming

- `feat/*` — new feature
- `fix/*` — bug fix
- `refactor/*` — no behavior change
- `docs/*` — documentation only
- `chore/*` — infra/tooling
- `test/*` — tests only

## Development Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --port 7010 --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Required Checks

Run these before opening a PR:

```bash
# Backend tests
cd backend && pytest

# Frontend lint + build
cd frontend && npm run lint && npm run build
```

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: ...` new feature
- `fix: ...` bug fix
- `refactor: ...` no behavior change
- `docs: ...` documentation only
- `chore: ...` infra/tooling
- `test: ...` tests only

## Pull Request Guidelines

- Keep changes scoped to one concern.
- Describe the user-facing impact.
- Add test evidence (logs/screenshots).
- Update docs when behavior or operations change.
- Keep PRs small enough to review in one pass.

## Reporting Issues

Open an issue on GitHub with:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Python/Node version)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
Please read it before participating.
