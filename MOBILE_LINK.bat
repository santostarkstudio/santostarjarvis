@echo off
TITLE J.A.R.V.I.S. Mobile Satellite Link
echo ========================================================
echo     J.A.R.V.I.S. SECURE SATELLITE LINK ESTABLISHED
echo ========================================================
echo.
echo Sir, I am now exposing the local Next.js node to the public web.
echo You can use the URL below to access the J.A.R.V.I.S. Orb from your mobile device.
echo NOTE: Ensure the main J.A.R.V.I.S. Desktop environment is running first.
echo.
echo Installing/Running localtunnel...
npx localtunnel --port 3000
pause
