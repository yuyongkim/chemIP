# ChemIP Platform

ChemIP is an integrated research platform for chemical safety, patents, trade intelligence, and drug information.

- `MSDS`: KOSHA-based chemical safety lookup and detail retrieval
- `Patents`: KIPRIS live search + local patent indexes (USPTO/global)
- `Trade`: KOTRA market/strategy/price/fraud data + Naver fallback
- `Drugs`: MFDS + OpenFDA + PubMed unified search
- `AI`: chemical detail page analysis report generation

Document basis: code synced on `2026-03-01`.

## Product Overview

### What It Is
- A single workflow for multi-domain chemical decision support.
- Connects safety, IP, market, and medical evidence in one UI.
- Combines Korean public APIs with local large-scale indexes for speed and coverage.

### Target Users
- Chemical/material R&D teams
- Regulatory and safety teams
- Trade and market intelligence teams
- IP and technology commercialization teams

## Current Capabilities (Code-Verified)

### Backend
- FastAPI service (`backend/main.py`) with:
  - request ID middleware (`x-request-id`)
  - security headers
  - optional rate limit (`RATE_LIMIT_*`)
  - request summary logging
- Core routes:
  - `/api/chemicals`
    - local FTS search via `terminology.db`
    - lazy KOSHA section fetch (1 to 16) on detail cache miss
  - `/api/patents`
    - KIPRIS keyword search and detail lookup
    - local `/uspto/{chem_id}` and `/global/{chem_id}` index search
  - `/api/trade`
    - market news, entry strategy, price info, fraud cases
    - additional endpoints (national info, import regulation, and more)
  - `/api/drugs`
    - MFDS approval/easy-info aggregation
    - OpenFDA fallback chain (brand -> generic -> substance)
    - PubMed article summary retrieval
  - `/api/guides`
    - local KOSHA guide dataset status/search/detail/recommendation
  - `/api/ai/analyze`
    - evidence-based analysis output with `sources` and `confidence`

### Frontend
- Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- `/api/*` requests are rewritten to backend by `frontend/next.config.ts`
- Composition-first pages:
  - `frontend/app/page.tsx` (home search)
  - `frontend/app/patents/page.tsx`
  - `frontend/app/trade/page.tsx`
  - `frontend/app/drugs/page.tsx`
  - `frontend/app/chemical/[id]/page.tsx` (MSDS/patents/market/guides/AI tabs)

### Data
- Default database paths (`backend/config/settings.py`)
  - `./data/terminology.db`
  - `./data/uspto_index.db`
  - `./data/global_patent_index.db`

## Quick Start

### 1) Install Dependencies

```bash
pip install -r requirements.txt
cd frontend
npm install
```

### 2) Configure Environment

Create `.env` from `.env.example`.

Required keys:
- `KOSHA_SERVICE_KEY_DECODED`
- `KIPRIS_API_KEY`
- `KOTRA_API_KEY_DECODED`
- `DRUG_API_KEY_DECODED`

Optional keys:
- `PUBMED_API_KEY`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `BACKEND_ORIGIN` (frontend rewrite target, default `http://127.0.0.1:7010`)
- `KOSHA_GUIDE_DATA_DIR` (local dataset path for KOSHA guides)

### 3) Run Services

Backend:

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 7010
```

Frontend:

```bash
cd frontend
npm run dev
```

Endpoints:
- Frontend: `http://localhost:7000`
- Backend: `http://localhost:7010`
- API docs: `http://localhost:7010/docs`
- Health: `http://localhost:7010/health`
- Readiness: `http://localhost:7010/ready`

## PM2 Startup

```bash
# Windows
start_all.bat

# Linux/macOS
bash start_all.sh
```

- Falls back to `npx pm2` when global `pm2` is unavailable
- Starts only Track 3 services (`Dashboard`, `ChemIP Backend`, `ChemIP Frontend`)

## Typical Workflows

### Chemical-First Research
1. Search by name/CAS on home page.
2. Open `/chemical/{id}`.
3. Review MSDS sections, bilingual safety, and regulation panel.
4. Check `KOSHA Guides` tab for related guideline recommendations.
5. Use `AI` tab to review evidence-backed insights and sources.
6. Expand to patents and market tabs in the same page.

### Patent-First Research
1. Search on `/patents`.
2. Review KIPRIS results.
3. In chemical detail, cross-check with local global/USPTO index results.

### Trade Intelligence
1. Use `/trade` with country and keyword filters.
2. Consume KOTRA feeds first.
3. Fall back to Naver/news-derived results when upstream data is sparse.

### Drug Evidence Lookup
1. Search on `/drugs`.
2. Review MFDS approval/easy-info.
3. Expand to OpenFDA labels and PubMed literature.

## Mandatory Verification

```bash
# Windows
submit_check.bat

# Linux/macOS
bash submit_check.sh
```

Executed by `scripts/verify_submission.py`:
- `pytest`
- `scripts/test_kipris_live.py`
- `frontend npm run lint`
- `frontend npm run build`

## Known Gaps

- AI endpoint is currently retrieval-assisted summarization; production-grade external LLM integration is still pending
- Rate limiting is in-memory only (not distributed-ready)
- Integration quality depends on upstream API quota/network conditions
- Test scope is strong on smoke paths but can be expanded for large regression suites

## Evolution Direction

### Phase 1: Reliability
- Connect AI endpoint to real LLM with explicit source citations
- Introduce API caching (for example Redis) to reduce latency and quota pressure
- Standardize error codes and operational dashboards

### Phase 2: Data Quality
- Improve synonym/alias normalization for chemical names
- Automate global patent index refresh pipeline
- Add quality scoring and source reliability metrics for market signals

### Phase 3: Enterprise Readiness
- Add role-based access and audit logs
- Add batch analysis/report export (PDF/slides)
- Formalize deployment blueprint (Docker/Kubernetes)

## References

- Korean main doc: `README.md`
- Frontend runtime check (2026-03-01): `docs/FRONTEND_RUNTIME_CHECK_2026-03-01.md`
- Mini PC + Cloudflare deployment checklist: `docs/MINIPC_CLOUDFLARE_DEPLOY_CHECKLIST.md`
- Project introduction + screenshot guide (KR): `docs/CHEMIP_PROJECT_INTRO_AND_SCREENSHOT_GUIDE_2026-03-02.md`
- Project introduction + screenshot guide (Word): `docs/CHEMIP_PROJECT_INTRO_AND_SCREENSHOT_GUIDE_2026-03-02.docx`
- Contribution guide: `CONTRIBUTING.md`
- Data layout: `DATA_STRUCTURE.md`
- Operations: `docs/RUNBOOK.md`
- Release process: `docs/RELEASE_PROCESS.md`
- Product roadmap: `docs/PRODUCT_ROADMAP.md`
- Execution board: `docs/ROADMAP_EXECUTION_BOARD.md`
