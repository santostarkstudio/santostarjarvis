@echo off
title BUILD SINGLE STANDALONE PORTABLE .EXE // SANTOSTARK J.A.R.V.I.S.
color 0A
cls

echo ==============================================================================
echo    SANTOSTARK U.L.T.R.O.N. // SINGLE STANDALONE .EXE GENERATOR
echo ==============================================================================
echo    This script compiles the ENTIRE J.A.R.V.I.S. system into a SINGLE .EXE file.
echo    - ZERO folders needed!
echo    - ZERO external files or dependencies needed!
echo    - 100%% Portable: Copy just the ONE .exe file to any PC or USB drive and run!
echo ==============================================================================
echo.

echo [1/3] Building Next.js WebGL and Spatial HUD Bundle...
call npm run build

echo.
echo [2/3] Compiling Native Single-File Portable Executable (.EXE)...
call npx electron-builder --win portable

echo.
echo [3/3] Copying Standalone .EXE to your Desktop...
if exist "dist_standalone_exe\SantoStark_JARVIS 1.0.0.exe" (
    copy /Y "dist_standalone_exe\SantoStark_JARVIS 1.0.0.exe" "%USERPROFILE%\Desktop\SantoStark_JARVIS.exe" >nul
    echo.
    echo ==============================================================================
    echo  [SUCCESS] Your SINGLE PORTABLE .EXE is ready on your Desktop:
    echo  Path: %USERPROFILE%\Desktop\SantoStark_JARVIS.exe
    echo ==============================================================================
    echo  You can now copy this SINGLE SantoStark_JARVIS.exe file to a USB drive
    echo  or send it to any other Windows PC. Double-click it anywhere to run!
    echo ==============================================================================
) else (
    echo [!] Output files are located in the dist_standalone_exe\ directory.
)

echo.
pause
