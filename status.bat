@echo off
setlocal
cd /d "%~dp0"

set "PM2_CMD="
where pm2 >nul 2>nul
if not errorlevel 1 (
  set "PM2_CMD=pm2"
) else (
  where npx >nul 2>nul
  if not errorlevel 1 (
    set "PM2_CMD=npx --yes pm2"
    echo [INFO] pm2 is not installed globally. Using npx pm2.
  )
)

echo ===== PM2 STATUS =====
if "%PM2_CMD%"=="" (
  echo [WARN] pm2 is not installed.
) else (
  call %PM2_CMD% status
)

echo.
echo ===== MANAGED PORTS =====
for %%P in (7000 7010 8002 8010 9000) do (
  echo --- Port %%P ---
  netstat -ano | findstr :%%P
)

echo.
echo Dashboard URL: http://localhost:9000
endlocal
