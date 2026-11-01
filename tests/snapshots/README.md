# Endpoint snapshot harness

Byte-level before/after check of API responses. Never touches the production backend (7011).

| File | Role |
|---|---|
| `run_snapshots.py` | `prepare` (freeze DB copies), `run --label L [--mode record\|replay]`, `diff A B` |
| `cases.py` | the endpoint list (data; add a row to add a case) |
| `cassette_app.py` | ASGI entry for the snapshot server: installs the cassette, serves `backend.main:app`, detaches the audit log |
| `cassette.py` | record/replay of outbound HTTP (`requests.Session.request`, `httpx.get/post`); request keys are hashed, secrets masked |

Work files go to `_work/` (git-ignored): frozen DBs, per-run DB copies, `cassette.jsonl`, `snap_<label>/`, diffs.

```
set PYTHONPATH=.venv\Lib\site-packages
python -B tests/snapshots/run_snapshots.py prepare
python -B tests/snapshots/run_snapshots.py run --label record --mode record   # real outbound calls, once
python -B tests/snapshots/run_snapshots.py run --label base                   # replay on the old code
# ... refactor ...
python -B tests/snapshots/run_snapshots.py run --label after
python -B tests/snapshots/run_snapshots.py diff base after
```

The server uses copies of terminology/feedback/usage DBs (env `TERMINOLOGY_DB_PATH`, `CHEMIP_FEEDBACK_DB`,
`CHEMIP_USAGE_DB`), so writes (alias discovery, guide mappings, usage counts) never reach `data/`.
Only `"time"` in `/health` and `/ready` is normalised; `date`, `server`, `x-request-id` headers are ignored.
