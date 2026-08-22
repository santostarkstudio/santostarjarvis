@echo off
title JARVIS GITHUB UPLOADER
color 0B
cls

echo ========================================================
echo   SANTOSTARK U.L.T.R.O.N. // GITHUB UPLOADER
echo ========================================================
echo.
echo [*] Step 1: Initializing Git and adding files...
git init
git branch -M main
git add .
git commit -m "Upgraded to The God Protocol (Phase 5 & 6)"

echo.
echo [*] Step 2: Linking to https://github.com/santostarkstudio/santostarjarvis
git remote remove origin 2>nul
git remote add origin https://github.com/santostarkstudio/santostarjarvis.git

echo.
echo [*] Step 3: Pushing code to GitHub (Force Update)...
git push -u origin main -f

echo.
echo ========================================================
echo   UPLOAD COMPLETE! 
echo   Check your GitHub link to see the updated files!
echo ========================================================
echo.
pause
