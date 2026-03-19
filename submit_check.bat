@echo off
setlocal
cd /d "%~dp0"

if exist ".\.venv\Scripts\python.exe" (
  set "PY=.\\.venv\\Scripts\\python.exe"
) else (
  set "PY=python"
)

%PY% scripts\verify_submission.py
set "EXIT_CODE=%ERRORLEVEL%"

if %EXIT_CODE% neq 0 (
  echo [FAIL] Submission verification failed.
  exit /b %EXIT_CODE%
)

echo [PASS] Submission verification passed.
endlocal
