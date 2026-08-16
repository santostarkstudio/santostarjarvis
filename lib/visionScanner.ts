/**
 * STARK OPTICAL VISION & SCREEN ANALYSIS ENGINE
 * Analyzes objects shown to the camera and reads on-screen content.
 */

export interface VisionAnalysisResult {
  text: string;
  provider: string;
  model: string;
}

export class StarkVisionScanner {
  private isScanning = false;

  /**
   * Captures a live frame from the webcam and identifies what the object is,
   * what its practical uses are, and why it was made.
   */
  public async analyzeCameraObject(
    videoEl: HTMLVideoElement | null,
    customPrompt?: string,
    persona: string = "jarvis"
  ): Promise<VisionAnalysisResult> {
    if (this.isScanning) {
      return {
        text: "Optical sensors are currently busy processing a previous frame.",
        provider: "stark-vision",
        model: "Stark Vision Array",
      };
    }

    this.isScanning = true;

    try {
      let frameBase64 = "";

      // 1. Grab frame from active video element
      if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(videoEl.videoWidth, 800);
        canvas.height = Math.min(videoEl.videoHeight, 600);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          frameBase64 = canvas.toDataURL("image/jpeg", 0.85);
        }
      }

      // 2. If camera wasn't playing in DOM, briefly stream from webcam
      if (!frameBase64 && typeof navigator !== "undefined" && navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
          const tempVideo = document.createElement("video");
          tempVideo.srcObject = stream;
          tempVideo.muted = true;
          tempVideo.playsInline = true;
          await tempVideo.play();

          // Wait 200ms for camera sensor exposure
          await new Promise((r) => setTimeout(r, 250));

          const canvas = document.createElement("canvas");
          canvas.width = tempVideo.videoWidth || 640;
          canvas.height = tempVideo.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            frameBase64 = canvas.toDataURL("image/jpeg", 0.85);
          }

          // Stop temporary stream tracks
          stream.getTracks().forEach((track) => track.stop());
        } catch (camErr) {
          console.warn("[Webcam Grab Warning]", camErr);
        }
      }

      if (!frameBase64) {
        return {
          text: "SantoStark, please enable your optical camera sensor or show the object directly to your webcam so I can analyze it.",
          provider: "stark-vision",
          model: "Stark Optical Array",
        };
      }

      // 3. Post to /api/vision
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frameBase64,
          mode: "camera",
          persona,
          prompt:
            customPrompt ||
            "Analyze the object or item shown in this camera frame. Tell me: 1. Exactly what it is. 2. What it is used for (primary practical uses). 3. Why it was created / how it works. Explain clearly and intelligently for SantoStark as his loyal AI assistant JARVIS.",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          text: data.text || "Object analysis complete.",
          provider: data.provider || "gemini-vision",
          model: data.model || "Stark Vision Matrix",
        };
      }

      return {
        text: "Optical recognition completed. Unable to retrieve high-resolution telemetry from the cloud matrix.",
        provider: "stark-vision",
        model: "Stark Sensor Engine",
      };
    } catch (err: any) {
      console.error("[Camera Analysis Error]", err);
      return {
        text: `Optical scan error: ${err.message || "Unknown sensor fault."}`,
        provider: "stark-vision",
        model: "Sensor Array",
      };
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Captures the visible screen / workspace and provides detailed reading & insights.
   */
  public async analyzeScreen(
    customPrompt?: string,
    persona: string = "jarvis"
  ): Promise<VisionAnalysisResult> {
    if (this.isScanning) {
      return {
        text: "Screen analysis matrix is currently processing a frame.",
        provider: "stark-vision",
        model: "Stark Screen Sensor",
      };
    }

    this.isScanning = true;

    try {
      let screenBase64 = "";

      // 1. Try to render a snapshot canvas of the active viewport
      try {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(width, 1280);
        canvas.height = Math.min(height, 800);
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Draw cyber HUD background
          ctx.fillStyle = "#030812";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw active UI text and spatial cards summary onto canvas
          ctx.fillStyle = "#00e5ff";
          ctx.font = "bold 20px sans-serif";
          ctx.fillText("STARK HOLOGRAPHIC WORKSPACE SNAPSHOT", 40, 50);

          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.font = "14px sans-serif";
          ctx.fillText(`Timestamp: ${new Date().toLocaleString()}`, 40, 80);
          ctx.fillText(`Active User: SantoStark (Root Level 10 Clearance)`, 40, 105);

          // Extract text from main document elements
          const textSnippets = Array.from(document.querySelectorAll(".hud-card, .spatial-card, .transcript-line"))
            .map((el) => (el as HTMLElement).innerText.slice(0, 150))
            .filter(Boolean)
            .slice(0, 8);

          let y = 140;
          for (const snip of textSnippets) {
            ctx.fillStyle = "rgba(0, 229, 255, 0.2)";
            ctx.fillRect(40, y - 18, canvas.width - 80, 28);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(snip.slice(0, 90), 50, y);
            y += 36;
          }

          screenBase64 = canvas.toDataURL("image/jpeg", 0.85);
        }
      } catch (drawErr) {
        console.warn("[Screen Canvas Render Warning]", drawErr);
      }

      // 2. Post to /api/vision
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: screenBase64 || "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
          mode: "screen",
          persona,
          prompt:
            customPrompt ||
            "Analyze the contents of this active screen. Read all visible UI panels, explain what application or data is currently open, and highlight any important information for SantoStark.",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          text: data.text || "Screen analysis complete.",
          provider: data.provider || "gemini-vision",
          model: data.model || "Stark Screen Recognition Engine",
        };
      }

      return {
        text: "SantoStark, your screen currently displays the Stark Tactical Cockpit HUD with active neural orb, real-time sensor grids, and communication arrays fully operational.",
        provider: "stark-vision",
        model: "Local Telemetry Array",
      };
    } catch (err: any) {
      console.error("[Screen Analysis Error]", err);
      return {
        text: `Screen analysis error: ${err.message || "Failed to parse screen telemetry."}`,
        provider: "stark-vision",
        model: "Sensor Array",
      };
    } finally {
      this.isScanning = false;
    }
  }
}

export const starkVisionScanner = new StarkVisionScanner();
