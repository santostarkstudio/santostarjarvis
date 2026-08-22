@echo off
title BUILD SINGLE STANDALONE PORTABLE .EXE // SANTOSTARK J.A.R.V.I.S.
color 0A
cls

echo ==============================================================================
echo    SANTOSTARK U.L.T.R.O.N. // SINGLE STANDALONE .EXE GENERATOR
echo ==============================================================================
echo    Compiling Standalone Native Windows .EXE with Custom Iron Man Icon...
echo    - ZERO Visual Studio / Rust / C++ toolchain errors!
echo    - ZERO folders needed!
echo    - Embedded Glowing Iron Man Eyes App Icon!
echo    - 100%% Portable: Copy this ONE .exe file to any PC or USB drive!
echo ==============================================================================
echo.

echo [1/3] Generating Windows High-Resolution App Icons...
call node generate_icons.js

echo.
echo [2/3] Compiling Native Windows Executable (SantoStark_JARVIS.exe)...
set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if not exist "%CSC%" (
    set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

if exist "%CSC%" (
    "%CSC%" /target:winexe /optimize+ /platform:anycpu /win32icon:public\icon.ico /out:SantoStark_JARVIS.exe SantoStark_JARVIS.cs /r:System.Windows.Forms.dll,System.Drawing.dll
    echo [✓] Compilation Successful!
) else (
    echo [!] Built-in C# compiler not found.
)

echo.
echo [3/3] Exporting Standalone .EXE to Separate Dedicated Folder...
if not exist "JARVIS_STANDALONE_APP" mkdir "JARVIS_STANDALONE_APP"

if exist "SantoStark_JARVIS.exe" (
    copy /Y "SantoStark_JARVIS.exe" "JARVIS_STANDALONE_APP\SantoStark_JARVIS.exe" >nul 2>&1
    copy /Y "public\icon.ico" "JARVIS_STANDALONE_APP\icon.ico" >nul 2>&1
    copy /Y "SantoStark_JARVIS.exe" "%USERPROFILE%\Desktop\SantoStark_JARVIS.exe" >nul 2>&1
    copy /Y "SantoStark_JARVIS.exe" "%USERPROFILE%\OneDrive\Desktop\SantoStark_JARVIS.exe" >nul 2>&1
    copy /Y "SantoStark_JARVIS.exe" "..\SantoStark_JARVIS.exe" >nul 2>&1
    
    echo.
    echo ==============================================================================
    echo  [SUCCESS] Your SINGLE PORTABLE .EXE is ready in its own separate folder!
    echo ==============================================================================
    echo  Folder Location:
    echo  📍 %CD%\JARVIS_STANDALONE_APP\SantoStark_JARVIS.exe
    echo.
    echo  Also copied to your Windows Desktop:
    echo  📍 %USERPROFILE%\Desktop\SantoStark_JARVIS.exe
    echo ==============================================================================
    echo  - Icon: Glowing Iron Man Helmet Eyes (Embedded)
    echo  - ZERO folders needed!
    echo  - You can copy this ONE file (SantoStark_JARVIS.exe) to a USB drive
    echo    or send it to any other Windows PC. Double-click it anywhere to run!
    echo ==============================================================================
    
    REM Open the separate folder automatically in Windows Explorer
    start "" "%CD%\JARVIS_STANDALONE_APP"
) else (
    echo [!] Compilation failed. Check if csc.exe is available.
)

echo.
pause
