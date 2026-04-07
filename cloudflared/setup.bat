@echo off
setlocal enabledelayedexpansion
title ChemIP Cloudflare Tunnel Setup

set DOMAIN=chemip.yule.pics
set TUNNEL_NAME=chemip
set CF_DIR=%USERPROFILE%\.cloudflared

:: Find cloudflared
set CFEXE=
where cloudflared >nul 2>&1 && set CFEXE=cloudflared
if not defined CFEXE (
    for /f "delims=" %%i in ('dir /s /b "%LOCALAPPDATA%\Microsoft\WinGet\Packages\*cloudflared.exe" 2^>nul') do set CFEXE=%%i
)
if not defined CFEXE (
    for /f "delims=" %%i in ('dir /s /b "C:\Program Files\cloudflared\cloudflared.exe" 2^>nul') do set CFEXE=%%i
)
if not defined CFEXE (
    echo [ERROR] cloudflared not found. Install with: winget install cloudflare.cloudflared
    pause
    exit /b 1
)
echo [OK] Found cloudflared: %CFEXE%

:: Menu
echo.
echo ========================================
echo   ChemIP Cloudflare Tunnel Setup
echo   Domain: %DOMAIN%
echo ========================================
echo.
echo   1. Full setup (login + create + DNS + run)
echo   2. Login only
echo   3. Create tunnel + DNS
echo   4. Run tunnel
echo   5. Stop tunnel (service)
echo   6. Install as Windows service
echo.
set /p CHOICE="Select [1-6]: "

if "%CHOICE%"=="1" goto full_setup
if "%CHOICE%"=="2" goto login
if "%CHOICE%"=="3" goto create
if "%CHOICE%"=="4" goto run
if "%CHOICE%"=="5" goto stop
if "%CHOICE%"=="6" goto service
echo Invalid choice.
pause
exit /b 1

:login
echo.
echo [STEP] Logging in to Cloudflare...
echo        Browser will open. Select "yule.pics" and authorize.
"%CFEXE%" tunnel login
if errorlevel 1 (
    echo [ERROR] Login failed.
    pause
    exit /b 1
)
echo [OK] Login successful.
goto :eof

:create
echo.
echo [STEP] Creating tunnel "%TUNNEL_NAME%"...
"%CFEXE%" tunnel create %TUNNEL_NAME%
if errorlevel 1 (
    echo [WARN] Tunnel may already exist. Continuing...
)

:: Get tunnel ID
for /f "tokens=1" %%t in ('"%CFEXE%" tunnel list -o json 2^>nul ^| findstr /i "%TUNNEL_NAME%"') do set TUNNEL_ID=%%t
echo [INFO] Tunnel ID: check with "cloudflared tunnel list"

echo.
echo [STEP] Setting DNS route: %DOMAIN%...
"%CFEXE%" tunnel route dns %TUNNEL_NAME% %DOMAIN%
if errorlevel 1 (
    echo [WARN] DNS route may already exist. Continuing...
)

:: Write config
echo.
echo [STEP] Writing config to %CF_DIR%\config.yml...
(
echo tunnel: %TUNNEL_NAME%
echo credentials-file: %CF_DIR%\%TUNNEL_NAME%.json
echo.
echo ingress:
echo   - hostname: %DOMAIN%
echo     service: http://localhost:7000
echo     originRequest:
echo       noTLSVerify: true
echo       connectTimeout: 30s
echo   - service: http_status:404
) > "%CF_DIR%\config.yml"

:: Also copy to project
copy "%CF_DIR%\config.yml" "%~dp0config.yml" >nul
echo [OK] Config written.
echo.
echo Done! Run option 4 to start the tunnel.
pause
goto :eof

:run
echo.
echo [STEP] Starting tunnel...
echo        Press Ctrl+C to stop.
echo        Access at: https://%DOMAIN%
echo.
"%CFEXE%" tunnel run %TUNNEL_NAME%
goto :eof

:stop
echo.
echo [STEP] Stopping cloudflared service...
net stop cloudflared 2>nul
echo [OK] Stopped.
pause
goto :eof

:service
echo.
echo [STEP] Installing as Windows service...
"%CFEXE%" service install
if errorlevel 1 (
    echo [ERROR] Service install failed. Try running as Administrator.
    pause
    exit /b 1
)
echo [OK] Service installed. Tunnel will start automatically on boot.
pause
goto :eof

:full_setup
call :login
if errorlevel 1 exit /b 1
call :create
call :run
