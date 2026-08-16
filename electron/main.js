const { app, BrowserWindow, globalShortcut, Menu, Tray, nativeImage } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

// ═════════════════════════════════════════════════════════════════════
// 🚀 EXTREME 60 - 120 FPS HARDWARE ACCELERATION & LOW-LATENCY GPU FLAGS
// ═════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
app.commandLine.appendSwitch("enable-accelerated-video-decode");
app.commandLine.appendSwitch("enable-accelerated-2d-canvas");
app.commandLine.appendSwitch("enable-webgl2-compute-context");
app.commandLine.appendSwitch("high-dpi-support", "1");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("max-gum-fps", "120");

let mainWindow = null;
let nextServerProcess = null;

const isDev = process.env.NODE_ENV !== "production";
const PORT = process.env.PORT || 3000;

function startNextServer() {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const npmCmd = isWin ? "npm.cmd" : "npm";

    nextServerProcess = spawn(npmCmd, ["run", "dev"], {
      cwd: path.join(__dirname, ".."),
      shell: true,
      env: { ...process.env, PORT: PORT.toString() },
    });

    nextServerProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes("Ready") || msg.includes("started") || msg.includes("http://localhost:")) {
        resolve();
      }
    });

    nextServerProcess.stderr.on("data", (data) => {
      console.error("[Next.js Desktop]", data.toString());
    });

    setTimeout(resolve, 3500);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 960,
    minWidth: 1024,
    minHeight: 680,
    title: "SANTOSTARK U.L.T.R.O.N. // J.A.R.V.I.S. DESKTOP OS",
    backgroundColor: "#000000",
    show: false,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false, // Prevents lag when window is partially unfocused
    },
  });

  // Enable Camera, Microphone, and Fullscreen permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ["media", "camera", "microphone", "geolocation", "notifications"];
    if (allowed.includes(permission)) {
      return callback(true);
    }
    callback(false);
  });

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ["media", "camera", "microphone", "geolocation", "notifications"];
    return allowed.includes(permission);
  });

  // Load JARVIS URL
  const targetUrl = `http://localhost:${PORT}`;
  await mainWindow.loadURL(targetUrl);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Register Global Hotkey: Ctrl+Shift+J (or Cmd+Shift+J) to summon JARVIS
  globalShortcut.register("CommandOrControl+Shift+J", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        if (mainWindow.isFocused()) {
          mainWindow.minimize();
        } else {
          mainWindow.focus();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

app.whenReady().then(async () => {
  await startNextServer();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (nextServerProcess) {
      nextServerProcess.kill();
    }
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (nextServerProcess) {
    nextServerProcess.kill();
  }
});
