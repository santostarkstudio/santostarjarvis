@echo off
title JARVIS CLEANUP ^& DEPENDENCY INSTALLER
color 0A
cls

echo ========================================================
echo   SANTOSTARK U.L.T.R.O.N. // WORKSPACE CLEANUP
echo ========================================================
echo.
echo [*] Removing redundant and unused launcher scripts...

del /f /q BUILD_FULL_1GB_DESKTOP_APP.bat
del /f /q BUILD_OFFLINE_STANDALONE_PACKAGE.bat
del /f /q BUILD_SINGLE_PORTABLE_EXE.bat
del /f /q DEBUG_DESKTOP.bat
del /f /q LAUNCH_JARVIS_DESKTOP.bat
del /f /q MOBILE_LINK.bat
del /f /q RUN_JARVIS_WEB.bat
del /f /q START_OLLAMA_AND_JARVIS.bat

echo [OK] Redundant scripts removed.
echo.
echo [*] Installing missing Python dependencies...
cd jarvis_brain
pip install -r requirements.txt
cd ..

echo.
echo ========================================================
echo   CLEANUP COMPLETE! 
echo   You can now launch JARVIS using:
echo   START_JARVIS_DESKTOP.bat
echo ========================================================
echo.
echo Press any key to close this window and delete this setup file.
pause >nul
del "%~f0"
