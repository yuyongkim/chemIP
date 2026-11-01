"""HTTP server plumbing for backend/main.py: middleware, error handler, health routes, router table.

| File | Role |
|---|---|
| `security.py` | localhost check, CSRF origin check, API-key auth, security response headers |
| `rate_limit.py` | in-memory sliding-window rate limit per client IP |
| `request_log.py` | request id header, request summary log, compliance audit log (logs/audit.log) |
| `errors.py` | global 500 handler (sanitised detail) |
| `health.py` | `/`, `/health`, `/ready` |
| `routers.py` | API router table (module, prefix, tag) mounted by main.py |

main.py only assembles these in a fixed order (middleware order is behaviour: the last one registered runs first).
"""
