import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

const ALLOWED_APPS: Record<string, string> = {
  // We keep some very basic fallbacks just in case the Python backend is offline
  chrome: "start chrome",
  youtube: "start https://youtube.com",
};

export async function POST(req: Request) {
  try {
    const { app, action, value } = await req.json();

    // 1. SYSTEM ACTIONS: Volume, Lock, Screenshot
    if (action) {
      const act = action.toLowerCase().trim();

      // Lock Workstation
      if (act === "lock" || act === "lock_pc" || act === "lock_workstation") {
        exec("rundll32.exe user32.dll,LockWorkStation");
        return NextResponse.json({ success: true, message: "Workstation locked for SantoStark security." });
      }

      // Volume Controls via PowerShell
      if (act === "mute" || act === "volume_mute") {
        exec(`powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"`);
        return NextResponse.json({ success: true, message: "System master volume toggled/muted." });
      }

      if (act === "volume_up" || act === "volume_increase") {
        exec(`powershell -c "1..5 | ForEach-Object { (New-Object -ComObject WScript.Shell).SendKeys([char]175) }"`);
        return NextResponse.json({ success: true, message: "Volume increased (+10%)." });
      }

      if (act === "volume_down" || act === "volume_decrease") {
        exec(`powershell -c "1..5 | ForEach-Object { (New-Object -ComObject WScript.Shell).SendKeys([char]174) }"`);
        return NextResponse.json({ success: true, message: "Volume decreased (-10%)." });
      }

      // Screen Capture for Vision Analysis
      if (act === "screenshot" || act === "screen_capture") {
        const tempDir = path.join(process.cwd(), "public", "screenshots");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const filePath = path.join(tempDir, "active_screen.png");

        const psCommand = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{PRTSC}'); Start-Sleep -m 200; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img) { $img.Save('${filePath.replace(/\\/g, "\\\\")}') }`;
        exec(`powershell -Command "${psCommand}"`, () => {});

        return NextResponse.json({
          success: true,
          message: "Screen capture acquired and indexed for Stark Vision matrix.",
          url: "/screenshots/active_screen.png",
        });
      }
    }

    // 2. APP LAUNCHER (Advanced via Python Backend)
    if (app && typeof app === "string") {
      const targetApp = app.trim();
      
      try {
        // Try calling the advanced Python scanner backend first
        const pyRes = await fetch("http://127.0.0.1:8000/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_name: targetApp }),
        });
        
        const pyData = await pyRes.json();
        return NextResponse.json({
          success: pyData.success || true,
          app: targetApp,
          message: pyData.message || `Command sent for ${targetApp}`,
        });
      } catch (backendError) {
        console.warn("[SystemLauncher] Python backend unavailable, attempting fallback:", backendError);
        
        // Fallback for very basic apps if Python is offline
        const appKey = targetApp.toLowerCase().replace(/[^a-z0-9]/g, "");
        const command = ALLOWED_APPS[appKey];

        if (!command) {
          return NextResponse.json(
            { error: `App '${app}' is not recognized and Python advanced backend is offline.` },
            { status: 403 }
          );
        }

        exec(command, (error) => {
          if (error) console.warn(`[SystemLauncher] Error launching ${appKey}:`, error);
        });

        return NextResponse.json({
          success: true,
          app: appKey,
          command,
          message: `Deployed ${app} via basic fallback node.`,
        });
      }
    }

    return NextResponse.json({ error: "Missing valid action or app identifier" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute system launch" }, { status: 500 });
  }
}

