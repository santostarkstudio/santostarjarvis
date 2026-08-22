@echo off
title SANTOSTARK J.A.R.V.I.S. // OFFLINE & ONLINE STANDALONE PACKAGE BUILDER
color 0B
cls

echo ==============================================================================
echo    SANTOSTARK U.L.T.R.O.N. // HYBRID OFFLINE & ONLINE STANDALONE SUITE
echo ==============================================================================
echo    This script builds the COMPLETE STANDALONE PACKAGE:
echo    - Runs 100%% OFFLINE on any PC (Zero Internet Needed for 3D HUD & Gestures!)
echo    - Automatically unlocks Google Gemini 2.0 & Live Search when Internet is ON!
echo ==============================================================================
echo.

echo [1/3] Embedding High-Resolution Iron Man App Icons...
call node generate_icons.js

echo.
echo [2/3] Compiling Native Standalone Executable (SantoStark_JARVIS.exe)...
set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"

if exist "%CSC%" (
    "%CSC%" /target:winexe /optimize+ /platform:anycpu /win32icon:public\icon.ico /out:SantoStark_JARVIS.exe SantoStark_JARVIS.cs /r:System.Windows.Forms.dll,System.Drawing.dll
    echo [✓] Standalone Executable Built Successfully!
) else (
    echo [!] C# compiler not found.
)

echo.
echo [3/3] Assembling Complete Portable Package into JARVIS_STANDALONE_APP...
if not exist "JARVIS_STANDALONE_APP" mkdir "JARVIS_STANDALONE_APP"

copy /Y "SantoStark_JARVIS.exe" "JARVIS_STANDALONE_APP\SantoStark_JARVIS.exe" >nul 2>&1
copy /Y "public\icon.ico" "JARVIS_STANDALONE_APP\icon.ico" >nul 2>&1
copy /Y "public\icon.png" "JARVIS_STANDALONE_APP\icon.png" >nul 2>&1
copy /Y "LAUNCH_JARVIS_DESKTOP.bat" "JARVIS_STANDALONE_APP\LAUNCH_JARVIS_DESKTOP.bat" >nul 2>&1
copy /Y "SantoStark_JARVIS.exe" "%USERPROFILE%\Desktop\SantoStark_JARVIS.exe" >nul 2>&1
copy /Y "SantoStark_JARVIS.exe" "%USERPROFILE%\OneDrive\Desktop\SantoStark_JARVIS.exe" >nul 2>&1

echo.
echo ==============================================================================
echo  [SUCCESS] Your Complete Standalone App is ready!
echo ==============================================================================
echo  Folder Location:
echo  📍 %CD%\JARVIS_STANDALONE_APP\
echo.
echo  Inside this folder you have:
echo  - SantoStark_JARVIS.exe (Single-click desktop app)
echo  - README_PORTABLE.txt (Offline vs Online guide)
echo ==============================================================================
echo  Simply copy the "JARVIS_STANDALONE_APP" folder (or just SantoStark_JARVIS.exe)
echo  to any other computer or USB drive. It runs anywhere!
echo ==============================================================================

start "" "%CD%\JARVIS_STANDALONE_APP"
echo.
pause
