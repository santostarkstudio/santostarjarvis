@echo off
title SANTOSTARK OLLAMA + J.A.R.V.I.S. DUAL LAUNCHER
color 0a
echo ==============================================================================
echo        SANTOSTARK TRIPLE-HYBRID AI FUSION INITIALIZATION
echo ==============================================================================
echo [1/3] Checking Ollama Local Engine...
start /b ollama run llama3.2 >nul 2>&1
echo [2/3] Ollama Local Engine standing by on http://127.0.0.1:11434
echo [3/3] Starting J.A.R.V.I.S. Holographic Interface...
echo.
echo Opening http://localhost:3000...
start http://localhost:3000
npm run dev
pause
