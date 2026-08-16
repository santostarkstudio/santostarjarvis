$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "JARVIS - SantoStark OS.lnk"

$TargetBatch = Join-Path -Path $PSScriptRoot -ChildPath "LAUNCH_JARVIS_DESKTOP.bat"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetBatch
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "Launch SantoStark J.A.R.V.I.S. Desktop OS"
$Shortcut.WindowStyle = 1

$IconPath = Join-Path -Path $PSScriptRoot -ChildPath "public\icon.ico"
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = "$IconPath, 0"
}

$Shortcut.Save()
Write-Host "[✓] J.A.R.V.I.S. Desktop Shortcut created successfully on your Windows Desktop!" -ForegroundColor Cyan
