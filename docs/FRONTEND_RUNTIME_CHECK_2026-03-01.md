# Frontend Runtime Check (2026-03-01)

## Scope

This document records the current frontend verification run for the ChemIP Platform.

- Date: 2026-03-01
- Frontend: `http://127.0.0.1:7000`
- Backend: `http://127.0.0.1:7010`
- Goal: Confirm current pages render and key API routes are reachable from frontend runtime.

## Environment Notes

- `KOSHA_GUIDE_DATA_DIR` was set in local `.env` to:
  `C:/Users/USER/Desktop/EPC engineering/datasets/kosha_guide`
- Service startup was validated with `start_all.bat`.
- Listening ports confirmed: `7000` (frontend), `7010` (backend), `9000` (dashboard).

## Build and Lint

- `frontend npm run lint`: PASS
- `frontend npm run build`: PASS

Known warning:
- `baseline-browser-mapping` update recommendation from npm/browserslist tooling.

## API and Runtime Checks

- `GET /health`: PASS (`status=ok`)
- `GET /api/guides/status`: PASS (`ready_files=true`, dataset path resolved)
- Frontend rewrite check `GET http://127.0.0.1:7000/api/guides/status`: PASS
- `GET /api/chemicals?q=benzene&limit=1`: PASS (returned `chem_id=001008`)
- `GET /api/guides/search?q=...`: PASS
- `GET /api/guides/recommend/001008?limit=5`: PASS
- `POST /api/ai/analyze` (`chemId=001008`): PASS

## Captured Screenshots

Captured via Playwright CLI against running services:

- `docs/screenshots/runtime_check_20260301/01_home.png`
- `docs/screenshots/runtime_check_20260301/02_chemical_detail.png`
- `docs/screenshots/runtime_check_20260301/03_patents.png`
- `docs/screenshots/runtime_check_20260301/04_trade.png`
- `docs/screenshots/runtime_check_20260301/05_drugs.png`
- `docs/screenshots/runtime_check_20260301/06_api_docs.png`
- `docs/screenshots/runtime_check_20260301/07_chemical_kosha_guides_tab.png`

## UI E2E Check (KOSHA Guides Tab)

- Test file: `frontend/e2e/kosha-guides-tab.spec.ts`
- Command:
  - `cd frontend`
  - `npx playwright test e2e/kosha-guides-tab.spec.ts --browser=chromium --reporter=line`
- Result: PASS (`1 passed`)
- Assertion path:
  - chemical detail page loads (`/chemical/001008`)
  - `KOSHA Guides` tab button is visible
  - tab click succeeds
  - `Related KOSHA Guides` panel heading is visible
  - evidence screenshot saved as `07_chemical_kosha_guides_tab.png`

## Observations

- Home, chemical detail, patents, and drugs pages rendered with data.
- Chemical detail view shows the `KOSHA Guides` tab in UI.
- Trade page loaded shell UI and search controls; the captured state was loading/no-result at capture time.
- `06_api_docs.png` was blank in Playwright capture, but direct HTTP check for `/docs` returned `200` with Swagger title.
  This indicates a capture/render timing or headless Swagger asset issue, not a backend route outage.

## Current Status

Current frontend version is operational for the main user flows and integrated with backend APIs, including KOSHA guide retrieval.
