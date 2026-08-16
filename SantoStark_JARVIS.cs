using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using System.Drawing;

namespace SantoStark.Jarvis
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            int port = 3000;
            string targetUrl = "http://localhost:" + port;

            // 1. Check if Node / Next.js local server is already running, if not start it
            Process serverProcess = null;
            try
            {
                // Start Next.js local server quietly in background if package.json exists in directory
                if (File.Exists(Path.Combine(appDir, "package.json")))
                {
                    ProcessStartInfo serverPsi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c npm run start 2>nul || npm run dev",
                        WorkingDirectory = appDir,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    serverProcess = Process.Start(serverPsi);
                    Thread.Sleep(2500); // Give server moment to initialize
                }
                else
                {
                    // Fallback to cloud production deployment if run on a standalone foreign PC!
                    targetUrl = "https://santostarkjarvis.vercel.app";
                }
            }
            catch { }

            // 2. Launch Dedicated 60-120 FPS Hardware-Accelerated App Window
            try
            {
                string gpuFlags = "--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --disable-frame-rate-limit --max-gum-fps=120 --enable-features=VaapiVideoDecoder,CanvasOopRasterization";
                string args = string.Format("{0} --app={1} --start-maximized", gpuFlags, targetUrl);

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "msedge.exe",
                    Arguments = args,
                    UseShellExecute = true
                };

                try
                {
                    Process.Start(psi);
                }
                catch
                {
                    // Fallback to Chrome
                    psi.FileName = "chrome.exe";
                    try
                    {
                        Process.Start(psi);
                    }
                    catch
                    {
                        // Fallback to Default Browser
                        Process.Start(new ProcessStartInfo(targetUrl) { UseShellExecute = true });
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to initialize J.A.R.V.I.S. Core: " + ex.Message, "SantoStark U.L.T.R.O.N.", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
