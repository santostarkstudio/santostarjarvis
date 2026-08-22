@echo off
setlocal enabledelayedexpansion
title SANTOSTARK U.L.T.R.O.N. // J.A.R.V.I.S. DESKTOP
color 0B
cls

:: Guarantee execution in project root directory
cd /d "%~dp0"

echo =========================================================================
echo       SANTOSTARK U.L.T.R.O.N. // J.A.R.V.I.S. STANDALONE LAUNCHER
echo              [ Root Level 10 Clearance Granted ]
echo =========================================================================
echo.

:: 1. Probe & Start Local Ollama AI Daemon
echo [1/3] Probing Local Neural AI Daemon (Ollama)...
tasklist /fi "imagename eq ollama.exe" 2>NUL | find /i "ollama.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo       [OK] Ollama neural engine active on port 11434.
) else (
    echo       [*] Initializing Ollama daemon in background...
    start "" /b ollama serve >NUL 2>&1
)

:: 1.5 Probe & Start J.A.R.V.I.S. Python Brain (FastAPI OS Control)
echo.
echo [1.5/3] Initializing Neural OS Controller (Python Brain)...
netstat -ano | findstr :8000 | findstr LISTENING >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo       [OK] Python Brain is already running on localhost:8000.
) else (
    echo       [*] Launching FastAPI OS Controller...
    start "JARVIS_PYTHON_BRAIN" cmd /c "cd jarvis_brain && pip install pyautogui psutil -q && python server.py"
    timeout /t 2 /nobreak >nul
)

:: 2. Probe & Start J.A.R.V.I.S. Web Engine
echo.
echo [2/3] Initializing Holographic 3D Engine on Port 3000...
netstat -ano | findstr :3000 | findstr LISTENING >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo       [OK] J.A.R.V.I.S. engine is already running on localhost:3000.
) else (
    echo       [*] Launching Next.js Turbopack engine...
    start "JARVIS_SERVER" cmd /c "npm run dev"
    echo       [*] Waiting for server to initialize...
    timeout /t 5 /nobreak >nul
)

:: 3. Launch Dedicated Native Desktop Window
echo.
echo [3/3] Launching Cinematic Standalone Desktop HUD...

:: We use the default browser, which is guaranteed to work on Windows
start http://localhost:3000

:SUCCESS
echo.
echo =========================================================================
echo   J.A.R.V.I.S. IS ONLINE! SYSTEMS SYNCHRONIZED FOR SANTOSTARK.
echo =========================================================================
timeout /t 5 >nul
exit
