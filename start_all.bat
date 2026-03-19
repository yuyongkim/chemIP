@echo off
setlocal
cd /d "%~dp0"

set "PM2_CMD=pm2"
where pm2 >nul 2>nul
if errorlevel 1 (
  where npx >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Neither pm2 nor npx is available. Install Node.js or pm2.
    exit /b 1
  )
  set "PM2_CMD=npx --yes pm2"
  echo [INFO] pm2 is not installed globally. Falling back to npx pm2.
)

echo [INFO] Starting managed apps from ecosystem.config.js ...
for %%P in (7000 7010) do (
  for /f "delims=" %%L in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    echo [WARN] Existing listener detected on port %%P: %%L
  )
)

for %%A in (Hub-Dashboard-9000 T3-ChemIP-Backend T3-ChemIP-Frontend T4-SoulsKitchen-Backend T4-SoulsKitchen-Frontend) do (
  call %PM2_CMD% delete %%A >nul 2>nul
)

call %PM2_CMD% start ecosystem.config.js --only Hub-Dashboard-9000,T3-ChemIP-Backend,T3-ChemIP-Frontend
if errorlevel 1 (
  echo [ERROR] Failed to start apps.
  exit /b 1
)

call %PM2_CMD% save >nul 2>nul

echo [OK] Apps started.
echo Dashboard: http://localhost:9000
call %PM2_CMD% status
endlocal
