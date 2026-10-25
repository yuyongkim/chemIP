#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

pm2_cmd=()
if command -v pm2 >/dev/null 2>&1; then
  pm2_cmd=(pm2)
elif command -v npx >/dev/null 2>&1; then
  pm2_cmd=(npx --yes pm2)
  echo "[INFO] pm2 is not installed globally. Using npx pm2."
fi

echo "===== PM2 STATUS ====="
if [ ${#pm2_cmd[@]} -gt 0 ]; then
  "${pm2_cmd[@]}" status
else
  echo "[WARN] pm2 is not installed"
fi

echo
echo "===== MANAGED PORTS ====="
for port in 7000 7011 8002 8010 9000; do
  echo "--- Port ${port} ---"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN || true
  else
    netstat -an | grep ":${port}" || true
  fi
done

echo
echo "Dashboard URL: http://localhost:9000"

echo
echo "===== RUNTIME HEALTH ====="
if command -v python >/dev/null 2>&1; then
  python scripts/check_runtime_health.py
elif command -v python3 >/dev/null 2>&1; then
  python3 scripts/check_runtime_health.py
else
  echo "[WARN] python/python3 not found. Skipping runtime health check."
fi
