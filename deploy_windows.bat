@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem =========================================================
rem ChemIP Platform Windows Deployment Script
rem - Python backend (FastAPI + uvicorn)
rem - Next.js frontend build + start
rem =========================================================

set "PROJECT_DIR=%~dp0"
set "BACKEND_PORT=7010"
set "FRONTEND_PORT=7000"
set "VENV_DIR=%PROJECT_DIR%.venv"

if not exist "%VENV_DIR%" (
  echo [1/6] Create virtual environment
  python -m venv "%VENV_DIR%"
)

call "%VENV_DIR%\Scripts\activate.bat"

echo [2/6] Install Python dependencies
python -m pip install --upgrade pip
pip install -r "%PROJECT_DIR%requirements.txt"

echo [3/6] Prepare backend environment
if not exist "%PROJECT_DIR%.env" (
  if exist "%PROJECT_DIR%.env.example" (
    echo [!] .env not found. Copy from .env.example and fill your API keys.
    copy "%PROJECT_DIR%.env.example" "%PROJECT_DIR%.env"
  ) else (
    echo [!] .env.example does not exist.
  )
)

echo [4/6] Run backend verify check
python "%PROJECT_DIR%scripts\verify_installation.py"

echo [5/6] Build frontend
pushd "%PROJECT_DIR%frontend"
call npm install
call npm run build
popd

echo [6/6] Start services
echo Backend: uvicorn --host 0.0.0.0 --port %BACKEND_PORT% backend.main:app
echo Frontend: npm run start -- --port %FRONTEND_PORT%
echo.
echo Windows one-shot run (foreground)
echo - Backend: call "%VENV_DIR%\Scripts\activate.bat" ^&^& cd /d "%PROJECT_DIR%" ^&^& uvicorn backend.main:app --host 0.0.0.0 --port %BACKEND_PORT%
echo - Frontend: cd /d "%PROJECT_DIR%frontend" ^&^& npm run start -- --port %FRONTEND_PORT%
echo.
echo If you need Windows service registration, install NSSM and run:
echo nssm install ChemIP-Backend "%VENV_DIR%\Scripts\uvicorn.exe" "backend.main:app --host 0.0.0.0 --port %BACKEND_PORT%"
echo nssm start ChemIP-Backend
echo.
echo For external access, open router firewall:
echo netsh advfirewall firewall add rule name="ChemIP Backend" dir=in action=allow protocol=TCP localport=%BACKEND_PORT%
echo netsh advfirewall firewall add rule name="ChemIP Frontend" dir=in action=allow protocol=TCP localport=%FRONTEND_PORT%
echo.
pause
endlocal
