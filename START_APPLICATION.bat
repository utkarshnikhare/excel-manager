@echo off
title Excel & Property Manager Setup
echo ===================================================
echo   Starting Excel & Property Manager Application
echo ===================================================
echo.

cd frontend
if not exist node_modules (
    echo [1/2] Installing required dependencies (first time only)...
    call npm install
) else (
    echo [1/2] Dependencies already installed!
)

echo.
echo [2/2] Launching web application server...
echo Server running at: http://localhost:5173
start http://localhost:5173
call npm run dev
pause
