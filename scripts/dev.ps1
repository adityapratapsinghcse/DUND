# PowerShell script to run DEGRADE development environment
$ErrorActionPreference = "Stop"

Write-Host "=== Starting DEGRADE Development Environment ===" -ForegroundColor Cyan

# Locate python virtualenv, Python 3.11, or global launcher
$pythonCmd = "python"
$py311Path = "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
if (Test-Path ".\venv\Scripts\python.exe") {
    $pythonCmd = ".\venv\Scripts\python.exe"
} elseif (Test-Path "..\venv\Scripts\python.exe") {
    $pythonCmd = "..\venv\Scripts\python.exe"
} elseif (Test-Path $py311Path) {
    $pythonCmd = $py311Path
} elseif ((Get-Command "py" -ErrorAction SilentlyContinue) -and (& py -3.11 -V 2>$null)) {
    $pythonCmd = "py -3.11"
}

Write-Host "1. Running backend migrations and seed data..." -ForegroundColor Yellow
Push-Location "backend"
& $pythonCmd manage.py migrate
& $pythonCmd manage.py seed_demo
Pop-Location

Write-Host "2. Starting Daphne ASGI server on http://localhost:8000..." -ForegroundColor Green
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; & '$pythonCmd' -m daphne -b 127.0.0.1 -p 8000 degrade.asgi:application" -PassThru

Write-Host "3. Starting Vite Web Client on http://localhost:5173..." -ForegroundColor Green
$webJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm --workspace=web run dev" -PassThru

Write-Host "`nAll services launched!" -ForegroundColor Cyan
Write-Host "Backend API & WS: http://127.0.0.1:8000 (Swagger docs at /api/docs/)"
Write-Host "Web Application:  http://localhost:5173"
Write-Host "Press Ctrl+C or close the spawn windows to stop."
