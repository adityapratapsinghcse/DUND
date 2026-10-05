@echo off
title DHUND - Tactical Simulation Launcher
color 0A

echo ======================================================================
echo    DHUND - Decision-making Hub for Uncertain & Network-Denied Domains
echo    SIH 2026 PS ID 26248  -  Ministry of Defence / DSSC
echo ======================================================================
echo.

:: 1. Detect Python 3.11
set "PYTHON_EXE=python"
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
) else (
    py -3.11 -V >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_EXE=py -3.11"
    )
)

echo [1/4] Using Python: %PYTHON_EXE%

:: 2. Run Backend Migrations & Seed
echo [2/4] Initializing Database & Demo Data...
cd /d "%~dp0backend"
%PYTHON_EXE% manage.py migrate --noinput
if errorlevel 1 (
    echo [ERROR] Database migration failed.
    pause
    exit /b 1
)
%PYTHON_EXE% manage.py seed_demo
cd /d "%~dp0"

:: 3. Launch Backend ASGI Server
echo [3/4] Starting Backend ASGI Server (Daphne on port 8000)...
start "DHUND Backend [Port 8000]" cmd /k "cd /d "%~dp0backend" && title DHUND Backend && %PYTHON_EXE% -m daphne -b 127.0.0.1 -p 8000 degrade.asgi:application"

:: 4. Launch Web Frontend (Vite)
echo [4/4] Starting Web Frontend (Vite on port 5173)...
start "DHUND Web Client [Port 5173]" cmd /k "cd /d "%~dp0" && title DHUND Web Client && npm --workspace=web run dev"

echo.
echo ======================================================================
echo    DHUND SYSTEM ONLINE!
echo ======================================================================
echo    Web Application:   http://localhost:5173
echo    Backend API / WS:  http://127.0.0.1:8000
echo    Swagger Docs:      http://127.0.0.1:8000/api/docs/
echo.
echo    DEMO CREDENTIALS:
echo    - Instructor:   instructor / instructor123
echo    - Land Trainee: land1      / trainee123
echo    - Air Trainee:  air1       / trainee123
echo    - Admin:        admin      / admin12345
echo.
echo    (Opening browser in 3 seconds...)
echo ======================================================================

timeout /t 3 >nul
start http://localhost:5173
