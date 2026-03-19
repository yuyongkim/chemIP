# ChemIP Product Roadmap (Execution-Oriented)

This document turns the product direction into implementation-ready milestones.
For sprint-level task decomposition, see `docs/ROADMAP_EXECUTION_BOARD.md`.

## Scope and Goal

- Scope: backend APIs, frontend UX, data pipeline quality, and operations
- Goal: move ChemIP from integrated prototype to reliable production platform

## Baseline (as of 2026-02-28)

- Core domains already integrated: MSDS, patents, trade, drugs, AI (simulated)
- Frontend composition architecture in place across major pages
- Submission checks exist (`pytest`, live KIPRIS check, frontend lint/build)
- Remaining gap is not feature breadth, but production reliability and quality controls

## Phase 1 (0 to 4 weeks): Reliability Hardening

### 1) AI endpoint productionization
- Replace simulated `/api/ai/analyze` response with real provider call
- Add request timeout, retry policy, and structured error codes
- Return `sources` and `confidence` fields in API response schema
- Acceptance criteria:
  - non-mock output in staging
  - source references included in response
  - P95 latency target defined and measured

### 2) Upstream resilience
- Add cache layer for frequent external requests (KOTRA, KIPRIS detail, OpenFDA)
- Normalize upstream error mapping into platform error taxonomy
- Add fallback behavior tests for each domain adapter
- Acceptance criteria:
  - reduced duplicate upstream calls in load test
  - all external adapters expose consistent error payloads

### 3) Observability
- Emit structured JSON logs with request_id, route, latency, status, upstream tag
- Add dashboard cards for error rate, timeout rate, and fallback activation rate
- Acceptance criteria:
  - per-route P95 visible
  - fallback activation trend visible for trade/drugs/patents

## Phase 2 (1 to 2 months): Data and Search Quality

### 1) Chemical query normalization
- Build synonym/alias dictionary for Korean/English/CAS variants
- Add pre-search normalization step and A/B compare retrieval recall
- Acceptance criteria:
  - improved hit rate on curated query set
  - reduced empty-result rate on home and detail-linked searches

### 2) Patent index refresh automation
- Add scheduled job for incremental global index refresh
- Add integrity checks (row counts, duplicate patents, invalid snippets)
- Acceptance criteria:
  - repeatable refresh runbook
  - failed job alert and resumable execution

### 3) Trade intelligence quality scoring
- Attach quality score to each market item (source confidence, recency, metadata completeness)
- Rank UI results by quality score + relevance
- Acceptance criteria:
  - quality score exposed in API
  - ranking logic validated on sampled countries/keywords

## Phase 3 (2 to 4 months): Enterprise Readiness

### 1) Security and governance
- Add user authn/authz and role policy
- Add audit trail for key actions (analysis, export, admin operations)
- Acceptance criteria:
  - role-based route protection
  - immutable audit log entries for sensitive actions

### 2) Reporting workflows
- Add saved search profiles and batch report exports (PDF/slide)
- Support scheduled report generation for selected domains
- Acceptance criteria:
  - one-click export from chemical detail and trade screens
  - batch report job status tracking

### 3) Deployment standardization
- Define container-first deployment template and environment matrix
- Add CI pipeline for test/lint/build + deploy gate checks
- Acceptance criteria:
  - reproducible staging deployment
  - rollback playbook validated

## Delivery Checklist Per Sprint

- Define metrics before implementation
- Add tests for new fallback/error branches
- Update `README.md` and relevant runbook docs
- Verify with `submit_check.*`

## Suggested Owners (example)

- API reliability: backend lead
- UX and workflow polish: frontend lead
- index/data integrity: data engineer
- observability and deploy pipeline: platform engineer

## Risks to Track

- upstream API policy or quota changes
- local index growth and storage pressure
- mixed-language data quality drift
- latency spikes from unbounded fallback chains
