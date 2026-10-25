# Operations Runbook

## Services

- Frontend: `http://localhost:7000`
- Backend: `http://127.0.0.1:7011`
- Health: `GET /health`
- Ready: `GET /ready`
- Guide status: `GET /api/guides/status`
- Runtime health: `python scripts/check_runtime_health.py`

## Start / Stop

- Windows: `start_all.bat`, `stop_all.bat`, `status.bat`
- Linux/macOS: `start_all.sh`, `stop_all.sh`, `status.sh`

## Standard Incident Flow

1. Check process state (`status` script or PM2 status).
2. Run `python scripts/check_runtime_health.py` and confirm both local/public checks pass.
3. Check health/readiness endpoints.
4. Check backend logs for upstream API failures.
5. Reproduce with one endpoint first (`/api/trade/news` etc.).
6. Apply rollback if latest change caused regression.

## Common Incidents

### Frontend unavailable

- Verify port 7000 listener.
- Re-run `start_all`.
- If PM2 frontend is `errored`, inspect `pm2 logs T3-ChemIP-Frontend`.
- If local `7000` passes but public domain fails, treat it as tunnel/origin drift and re-run runtime health after tunnel check.

### Backend 5xx spikes

- Check `/ready` result.
- Validate external API keys and upstream availability.
- Verify no duplicate backend processes are bound to same port.
- Confirm `scripts/check_runtime_health.py` shows both `public-api-chemicals` and `public-api-drugs` as `PASS`.
- If guide-related endpoints fail, verify `KOSHA_GUIDE_DATA_DIR` and dataset files (`guides.json`, `normalized/guide_documents_text.json`).

### `Unexpected token 'I'` in frontend

- Means non-JSON response was parsed as JSON.
- Ensure caller uses safe fetch utility and checks `ok` + payload shape.

## Rollback

1. Revert the last deployed change set.
2. Restart managed apps.
3. Verify `/health`, `/ready`, and critical UI routes.

## Frontend Verification

Run from `frontend`:

```bash
npm run lint
npm run build
```

Check these routes after deploy:

- `/` (home search)
- `/chemical/{id}` (tabs: MSDS, Patents, Market, Guides, AI)
- `/patents`
- `/trade`
- `/drugs`
