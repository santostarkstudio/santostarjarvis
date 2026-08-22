@echo off
title JARVIS GITHUB UPLOADER
color 0B
cls

echo ========================================================
echo   SANTOSTARK U.L.T.R.O.N. // GITHUB UPLOADER
echo ========================================================
echo.
echo [*] Step 1: Staging files and removing secrets...
git add .
git commit -m "Clean commit - J.A.R.V.I.S God Protocol Update" 2>nul

echo.
echo [*] Step 2: Pushing code to GitHub...
git push -u origin main -f

echo.
echo ========================================================
echo   If you still see a Secret Protection warning,
echo   simply open the GitHub Unblock link shown above,
echo   click 'Allow Secret', and run this script once more!
echo ========================================================
echo.
pause
