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
node generate_icons.js

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
    echo [!] Built-in C# compiler not found. Creating standalone launcher...
)

echo.
echo [3/3] Exporting Standalone .EXE to your Desktop...
if exist "SantoStark_JARVIS.exe" (
    copy /Y "SantoStark_JARVIS.exe" "%USERPROFILE%\Desktop\SantoStark_JARVIS.exe" >nul
    echo.
    echo ==============================================================================
    echo  [SUCCESS] Your SINGLE PORTABLE .EXE is ready on your Desktop!
    echo  Location: %USERPROFILE%\Desktop\SantoStark_JARVIS.exe
    echo ==============================================================================
    echo  - Icon: Glowing Iron Man Helmet Eyes (Embedded)
    echo  - ZERO folders needed!
    echo  - Copy this ONE file (SantoStark_JARVIS.exe) to a USB drive or other PCs.
    echo  - Double-click anywhere to launch J.A.R.V.I.S. at 60-120 FPS!
    echo ==============================================================================
) else (
    echo [!] Check the project directory for SantoStark_JARVIS.exe
)

echo.
pause
