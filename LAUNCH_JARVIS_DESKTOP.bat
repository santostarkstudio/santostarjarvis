@echo off
title SANTOSTARK U.L.T.R.O.N. // J.A.R.V.I.S. DESKTOP OS
color 0B
cls

echo ==============================================================================
echo    SANTOSTARK U.L.T.R.O.N. // J.A.R.V.I.S. NATIVE DESKTOP SUITE
echo ==============================================================================
echo    [1] Launch Native Desktop App (Tauri 60FPS Engine)
echo    [2] Build Windows Standalone Installer (.MSI / .EXE)
echo    [3] Launch Dedicated Frameless Desktop App Window (Chrome / Edge Engine)
echo    [4] Exit
echo ==============================================================================
echo.

set /p choice="Enter your choice (1, 2, or 3): "

if "%choice%"=="1" goto LAUNCH_TAURI
if "%choice%"=="2" goto BUILD_INSTALLER
if "%choice%"=="3" goto LAUNCH_FRAMELESS
if "%choice%"=="4" goto EOF

:LAUNCH_TAURI
echo.
echo [*] Launching Native J.A.R.V.I.S. Desktop OS Window...
taskkill /IM node.exe /F >nul 2>&1
npm run tauri:dev
goto EOF

:BUILD_INSTALLER
echo.
echo [*] Compiling Native Windows Installer (.MSI / .EXE)...
npm run tauri:build
echo.
echo [✓] Build complete! Check the folder: src-tauri\target\release\bundle\msi\
pause
goto EOF

:LAUNCH_FRAMELESS
echo.
echo [*] Starting Local Stark Intelligence Server...
start "" /B npm run dev
timeout /t 3 >nul
echo [*] Launching 60-120 FPS Hardware-Accelerated Desktop Window...
start msedge --enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --disable-frame-rate-limit --max-gum-fps=120 --app=http://localhost:3000 --start-maximized 2>nul || start chrome --enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --disable-frame-rate-limit --max-gum-fps=120 --app=http://localhost:3000 --start-maximized 2>nul || start http://localhost:3000
goto EOF

:EOF
