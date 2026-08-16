@echo off
title SANTOSTARK U.L.T.R.O.N. CORE // DESKTOP LAUNCHER
echo ========================================================
echo   SANTOSTARK U.L.T.R.O.N. CORE // NATIVE TAURI ENGINE
echo ========================================================
echo.

taskkill /IM node.exe /F >nul 2>&1

set "PATH=%PATH%;C:\Program Files\LLVM\bin;%USERPROFILE%\.cargo\bin"
set "LIB=C:\Program Files (x86)\Windows Kits\10\Lib\10.0.22621.0\um\x64;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.22621.0\ucrt\x64;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\um\x64;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64;%LIB%"

echo [*] Initializing 60 FPS Native Desktop Window...
npm run tauri:dev
