# Release Process

## Pre-Release Checklist

1. All required checks green (CI + local verification).
2. `README` and runbook updated for behavior changes.
3. Security-sensitive diffs reviewed.
4. Rollback steps documented.

## Versioning

- Tag format: `v<major>.<minor>.<patch>`
- Example: `v1.4.2`

## Release Notes

Include:

- Features
- Fixes
- Breaking changes
- Migration notes

## Post-Release Validation

1. Check `/health` and `/ready`.
2. Verify critical routes: `/`, `/trade`, `/patents`, `/drugs`.
3. Spot-check at least one API per domain.
