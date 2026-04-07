@echo off
title ChemIP Tunnel - chemip.yule.pics

:: Find cloudflared
set CFEXE=
where cloudflared >nul 2>&1 && set CFEXE=cloudflared
if not defined CFEXE (
    for /f "delims=" %%i in ('dir /s /b "%LOCALAPPDATA%\Microsoft\WinGet\Packages\*cloudflared.exe" 2^>nul') do set CFEXE=%%i
)
if not defined CFEXE (
    echo [ERROR] cloudflared not found.
    pause
    exit /b 1
)

echo ================================================
echo   ChemIP Tunnel: https://chemip.yule.pics
echo   Press Ctrl+C to stop
echo ================================================
echo.
"%CFEXE%" tunnel run chemip
