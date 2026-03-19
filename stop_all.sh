#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

pm2_cmd=(pm2)
if ! command -v pm2 >/dev/null 2>&1; then
  if command -v npx >/dev/null 2>&1; then
    pm2_cmd=(npx --yes pm2)
    echo "[INFO] pm2 is not installed globally. Falling back to npx pm2."
  else
    echo "[ERROR] Neither pm2 nor npx is available. Install Node.js or pm2."
    exit 1
  fi
fi

for app in \
  Hub-Dashboard-9000 \
  T3-ChemIP-Backend \
  T3-ChemIP-Frontend \
  T4-SoulsKitchen-Backend \
  T4-SoulsKitchen-Frontend; do
  "${pm2_cmd[@]}" delete "$app" >/dev/null 2>&1 || true
done

echo "[OK] Managed apps removed"
"${pm2_cmd[@]}" status
