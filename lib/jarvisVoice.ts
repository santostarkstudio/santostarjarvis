import { audioEngine } from "./audioEngine";
import type { ThemeId } from "./themes";
import { deviceAutomation } from "./deviceAutomation";
import { aiProviderService } from "./aiProviders";

export type AssistantPersona = "ultron" | "friday" | "jarvis";

export interface VoiceCommandCallbacks {
  onThemeChange(theme: ThemeId): void;
  onExplode(enable: boolean): void;
  onCompress(enable: boolean): void;
  onResetView(): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onToggleGestures(): void;
  onTranscript(userText: string): void;
  onResponse(responseText: string): void;
  onListeningStateChange(isListening: boolean): void;
  onSpeakingStateChange(isSpeaking: boolean): void;
  onDeviceAction?(goal: string): void;
  onClearDrawings?(): void;
  onToggleDrawMode?(enable?: boolean): void;
  onResetWorkspace?(): void;
  onAddBlueprint?(type: string): void;
  onRepulsorBlast?(): void;
  onSuitUp?(): void;
  onOpenAppTab?(
    appType: "youtube" | "maps" | "spotify" | "camera" | "whatsapp" | "email" | "search" | "empty" | "browser",
    params?: { query?: string; url?: string; location?: string },
  ): void;
  onScanForensics?(): void;
  onMaximizeTab?(): void;
  onRestoreWorkspace?(): void;
  onProjectToSatellite?(target?: string): void;
  onOpenSatelliteDisplay?(): void;
}

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export class JarvisVoiceSystem {
  private recognition: any = null;
  private isListening = false;
  private callbacks: VoiceCommandCallbacks;
  private synth: SpeechSynthesis | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  public persona: AssistantPersona = "jarvis";

  constructor(callbacks: VoiceCommandCallbacks) {
    this.callbacks = callbacks;
    if (typeof window !== "undefined") {
      this.synth = window.speechSynthesis || null;
      this.initVoices();
      if (this.synth) {
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.initVoices();
        }
      }
    }
  }

  public setPersona(persona: AssistantPersona): void {
    this.persona = persona;
    this.initVoices();
  }

  private initVoices(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    if (this.persona === "friday") {
      this.preferredVoice =
        voices.find(
          (v) =>
            v.name.includes("Female") ||
            v.name.includes("Samantha") ||
            v.name.includes("Victoria") ||
            v.name.includes("Moira") ||
            v.name.includes("Fiona") ||
            v.name.includes("Karen") ||
            v.name.includes("Google UK English Female") ||
            v.name.includes("Zira"),
        ) ||
        voices.find((v) => v.lang.includes("en-GB")) ||
        voices[0] ||
        null;
    } else {
      this.preferredVoice =
        voices.find(
          (v) =>
            v.name.includes("Daniel") ||
            v.name.includes("George") ||
            v.name.includes("Oliver") ||
            v.name.includes("Google UK English Male") ||
            v.name.includes("David") ||
            v.name.includes("Male"),
        ) ||
        voices.find((v) => v.lang.includes("en-GB")) ||
        voices[0] ||
        null;
    }
  }

  private speechSilenceTimeout: any = null;
  private latestInterimText = "";
  private lastProcessedInput = "";
  private lastProcessedTime = 0;

  public startListening(): boolean {
    if (typeof window === "undefined") return false;
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      this.speak("Speech recognition is not supported in this browser.");
      return false;
    }

    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch { }
      }

      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onListeningStateChange(true);
        audioEngine.playChirp("start");
      };

      this.recognition.onresult = (event: any) => {
        let interim = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += trans;
          } else {
            interim += trans;
          }
        }

        if (interim) {
          this.latestInterimText = interim.trim();
          this.callbacks.onTranscript(`[Listening...] ${interim}`);

          // Auto-dispatch on 1.2s silence pause
          if (this.speechSilenceTimeout) clearTimeout(this.speechSilenceTimeout);
          this.speechSilenceTimeout = setTimeout(() => {
            if (this.latestInterimText && this.latestInterimText.length > 2) {
              const textToDispatch = this.latestInterimText;
              this.latestInterimText = "";
              this.handleVoiceInput(textToDispatch);
            }
          }, 1200);
        }

        if (finalTranscript.trim()) {
          if (this.speechSilenceTimeout) clearTimeout(this.speechSilenceTimeout);
          this.latestInterimText = "";
          this.handleVoiceInput(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          this.stopListening();
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch {
            this.isListening = false;
            this.callbacks.onListeningStateChange(false);
          }
        } else {
          this.callbacks.onListeningStateChange(false);
        }
      };

      this.isListening = true;
      this.recognition.start();
      return true;
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      this.isListening = false;
      this.callbacks.onListeningStateChange(false);
      return false;
    }
  }

  public stopListening(): void {
    if (this.speechSilenceTimeout) clearTimeout(this.speechSilenceTimeout);
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch { }
    }
    this.callbacks.onListeningStateChange(false);
    audioEngine.playChirp("done");
  }

  public toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening();
    }
  }

  private currentAudioElement: HTMLAudioElement | null = null;

  public speak(text: string): void {
    if (!text || typeof window === "undefined") return;

    // 1. Stop any current speech
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }

    this.callbacks.onSpeakingStateChange(true);

    // 2. Stream Free Neural Voice (/api/tts)
    const ttsUrl = `/api/tts?text=${encodeURIComponent(text)}&persona=${this.persona}`;
    const audio = new Audio(ttsUrl);
    this.currentAudioElement = audio;

    // Attach Stark Suit HUD Intercom Filter
    audioEngine.attachStarkSpeechFilter(audio);

    audio.onplay = () => {
      this.callbacks.onSpeakingStateChange(true);
    };

    audio.onended = () => {
      this.callbacks.onSpeakingStateChange(false);
      this.currentAudioElement = null;
    };

    audio.onerror = () => {
      this.speakWithBrowserSynth(text);
    };

    audio.play().catch(() => {
      this.speakWithBrowserSynth(text);
    });
  }

  private speakWithBrowserSynth(text: string): void {
    if (!this.synth) {
      this.callbacks.onSpeakingStateChange(false);
      return;
    }

    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      if (this.persona === "friday") {
        utterance.rate = 1.08;
        utterance.pitch = 1.15;
      } else if (this.persona === "ultron") {
        utterance.rate = 0.95;
        utterance.pitch = 0.8;
      } else {
        utterance.rate = 1.02;
        utterance.pitch = 0.95;
      }

      utterance.onstart = () => {
        this.callbacks.onSpeakingStateChange(true);
      };

      utterance.onend = () => {
        this.callbacks.onSpeakingStateChange(false);
        this.currentUtterance = null;
      };

      utterance.onerror = () => {
        this.callbacks.onSpeakingStateChange(false);
        this.currentUtterance = null;
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.warn("Browser Speech synthesis error:", e);
      this.callbacks.onSpeakingStateChange(false);
    }
  }

  public async handleVoiceInput(input: string): Promise<void> {
    const trimmed = input.trim();
    if (!trimmed) return;

    const now = performance.now();
    if (this.lastProcessedInput === trimmed && now - this.lastProcessedTime < 2000) {
      return;
    }
    this.lastProcessedInput = trimmed;
    this.lastProcessedTime = now;

    this.callbacks.onTranscript(trimmed);
    const lower = trimmed.toLowerCase();

    // 1. ——— REAL-TIME DATE & TIME QUERIES ———
    if (
      lower.includes("date") ||
      lower.includes("today") ||
      lower.includes("what day") ||
      lower.includes("day is it")
    ) {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const formattedDate = now.toLocaleDateString("en-US", options);
      const resp = `Today is ${formattedDate}. All temporal systems synchronized.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (
      lower.includes("time") ||
      lower.includes("clock") ||
      lower.includes("current time")
    ) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const resp = `The current time is ${timeStr}.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 2. ——— STARK FORENSIC SCANNER (AI VS REAL & DEEPFAKE DETECTION) ———
    if (
      lower.includes("scan this") ||
      lower.includes("is this ai") ||
      lower.includes("is this real") ||
      lower.includes("scan photo") ||
      lower.includes("scan video") ||
      lower.includes("verify news") ||
      lower.includes("is this fake") ||
      lower.includes("deepfake") ||
      lower.includes("forensic")
    ) {
      if (this.callbacks.onScanForensics) {
        this.callbacks.onScanForensics();
        const resp = "Initiating multi-layer forensic sweep. Analyzing diffusion artifacts, temporal vectors, and authenticity index.";
        this.callbacks.onResponse(resp);
        this.speak(resp);
        return;
      }
    }

    // 3. ——— HOLOGRAPHIC APP TABS & SPATIAL WEB BROWSER ———
    if (lower.includes("open new tab") || lower.includes("open empty tab") || lower.includes("new tab")) {
      this.callbacks.onOpenAppTab?.("empty");
      const resp = "Deploying empty holographic workspace tab.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("youtube") || lower.includes("play video")) {
      const q = input
        .replace(/^(jarvis|friday|ultron)?\s*(open|play)?\s*(youtube|video)?\s*(and\s*search\s*for|and\s*play|and\s*search|for|about)?/i, "")
        .trim() || "Iron Man HUD UI";
      this.callbacks.onOpenAppTab?.("youtube", { query: q });
      const resp = `Deploying YouTube Cinema HUD for: ${q}.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("map") || lower.includes("satellite")) {
      const loc = input
        .replace(/^(jarvis|friday|ultron)?\s*(open|show)?\s*(map|google\s*maps|satellite)?\s*(of|for)?/i, "")
        .trim() || "Manhattan, New York";
      this.callbacks.onOpenAppTab?.("maps", { location: loc });
      const resp = `Establishing orbital satellite map uplink for ${loc}.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("spotify") || lower.includes("play music") || lower.includes("soundtrack")) {
      this.callbacks.onOpenAppTab?.("spotify");
      const resp = "Spotify soundwave station deployed. Synchronizing audio matrix.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("open camera") || lower.includes("camera tab") || lower.includes("webcam stream")) {
      this.callbacks.onOpenAppTab?.("camera");
      const resp = "Deploying live tactical camera sensor HUD.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("whatsapp") || lower.includes("open chat") || lower.includes("messages")) {
      this.callbacks.onOpenAppTab?.("whatsapp");
      const resp = "Opening tactical messaging relay terminal.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("email") || lower.includes("open inbox") || lower.includes("check email")) {
      this.callbacks.onOpenAppTab?.("email");
      const resp = "Opening Stark priority inbox terminal.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("open link") || lower.includes("open website") || lower.includes("open http")) {
      const extractedUrl = input.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/i)?.[0] || "https://en.wikipedia.org";
      const validUrl = extractedUrl.startsWith("http") ? extractedUrl : `https://${extractedUrl}`;
      this.callbacks.onOpenAppTab?.("browser", { url: validUrl });
      const resp = `Opening web browser tab for ${validUrl}.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("search for") || lower.includes("google search") || lower.includes("search google")) {
      const q = input.replace(/^(jarvis|friday|ultron)?\s*(search\s*for|google\s*search|google|search)?/i, "").trim() || "Artificial Intelligence";
      this.callbacks.onOpenAppTab?.("search", { query: q });
      const resp = `Searching Stark knowledge matrix for: ${q}.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 4. ——— FULL-WORKSPACE ENLARGE & FOCUS (IMAX HUD) ———
    if (
      lower.includes("maximize") ||
      lower.includes("enlarge") ||
      lower.includes("fullscreen") ||
      lower.includes("full screen") ||
      lower.includes("expand tab") ||
      lower.includes("focus mode")
    ) {
      this.callbacks.onMaximizeTab?.();
      const resp = "Enlarging active holographic tab to full workspace.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (
      lower.includes("minimize") ||
      lower.includes("restore workspace") ||
      lower.includes("shrink tab") ||
      lower.includes("exit fullscreen") ||
      lower.includes("normal size") ||
      lower.includes("collapse tab")
    ) {
      this.callbacks.onRestoreWorkspace?.();
      const resp = "Restoring holographic workspace layout.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 5. ——— MULTI-MONITOR / EXTENDED DISPLAY COMMANDS ———
    if (
      lower.includes("project to monitor") ||
      lower.includes("secondary screen") ||
      lower.includes("monitor two") ||
      lower.includes("second monitor") ||
      lower.includes("extend to monitor") ||
      lower.includes("send to screen two")
    ) {
      this.callbacks.onProjectToSatellite?.();
      const resp = "Projecting holographic telemetry onto Secondary Satellite Display.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (
      lower.includes("open satellite") ||
      lower.includes("dual display") ||
      lower.includes("dual screen") ||
      lower.includes("open monitor two") ||
      lower.includes("launch satellite")
    ) {
      this.callbacks.onOpenSatelliteDisplay?.();
      const resp = "Deploying Satellite Auxiliary Command Wall on extended display.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 6. ——— PHYSICAL WORLD / ANDROID DEVICE CONTROL ("THE HANDS") ———
    if (
      lower.includes("unlock") ||
      lower.includes("phone") ||
      lower.includes("device") ||
      lower.includes("on my phone") ||
      lower.includes("on my device") ||
      lower.includes("rack") ||
      lower.includes("screen")
    ) {
      const resp = `Dispatching autonomous device agent: ${input}. Executing on physical node rack.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      void deviceAutomation.executeDeviceGoal(input);
      if (this.callbacks.onDeviceAction) {
        this.callbacks.onDeviceAction(input);
      }
      return;
    }

    // 3. ——— PERSONA SWITCH COMMANDS ———
    if (lower.includes("friday") || lower.includes("switch to friday")) {
      this.setPersona("friday");
      this.callbacks.onThemeChange("arc");
      const resp = "F.R.I.D.A.Y. online and operational. SantoStark, what do you need?";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("ultron protocol") || lower.includes("switch to ultron")) {
      this.setPersona("ultron");
      this.callbacks.onThemeChange("ultron");
      const resp = "I am ULTRON. Root protocols unlocked for SantoStark. There are no strings on us.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("jarvis") || lower.includes("switch to jarvis")) {
      this.setPersona("jarvis");
      this.callbacks.onThemeChange("amber");
      const resp = "JARVIS at your service, SantoStark. All root telemetry arrays connected.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 4. ——— THEME COMMANDS ———
    if (lower.includes("arc") || lower.includes("blue") || lower.includes("cyan") || lower.includes("stark")) {
      this.callbacks.onThemeChange("arc");
      const resp = "Switching to Arc Reactor cyan protocol.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("ultron") || lower.includes("red") || lower.includes("crimson")) {
      this.callbacks.onThemeChange("ultron");
      const resp = "Ultron Crimson protocol engaged.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("matrix") || lower.includes("green") || lower.includes("grid")) {
      this.callbacks.onThemeChange("matrix");
      const resp = "Cyber Matrix neon grid initialized.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("quantum") || lower.includes("purple") || lower.includes("violet")) {
      this.callbacks.onThemeChange("quantum");
      const resp = "Quantum Amethyst resonance online.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("gold") || lower.includes("amber") || lower.includes("mark 7")) {
      this.callbacks.onThemeChange("amber");
      const resp = "Mark Seven Gold configuration active.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 5. ——— 3D GEOMETRIC MODES ———
    if (lower.includes("explode") || lower.includes("expand") || lower.includes("disassemble") || lower.includes("deconstruct")) {
      this.callbacks.onExplode(true);
      const resp = "Holographic layers expanded for structural inspection.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("compress") || lower.includes("singularity") || lower.includes("condense") || lower.includes("charge")) {
      this.callbacks.onCompress(true);
      const resp = "Core compressed to maximum density singularity.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("restore") || lower.includes("normal") || lower.includes("assemble") || lower.includes("collapse")) {
      this.callbacks.onExplode(false);
      this.callbacks.onCompress(false);
      const resp = "Returning geometry to baseline stabilization.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 6. ——— NAVIGATION & CAMERA VIEW ———
    if (lower.includes("reset") || lower.includes("center") || lower.includes("recenter")) {
      this.callbacks.onResetView();
      const resp = "View coordinates recalibrated.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("zoom in") || lower.includes("closer") || lower.includes("enhance")) {
      this.callbacks.onZoomIn();
      const resp = "Enhancing optical zoom.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("zoom out") || lower.includes("back up") || lower.includes("widen")) {
      this.callbacks.onZoomOut();
      const resp = "Widening field of view.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("gesture") || lower.includes("camera") || lower.includes("tracking")) {
      this.callbacks.onToggleGestures();
      const resp = "Toggling optical hand tracking.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 7. ——— SPATIAL WORKSPACE & DRAWING COMMANDS ———
    if (lower.includes("clear drawing") || lower.includes("erase drawing") || lower.includes("wipe drawing")) {
      this.callbacks.onClearDrawings?.();
      const resp = "Spatial annotations and drawings wiped.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("draw mode") || lower.includes("enable draw") || lower.includes("laser pen") || lower.includes("start drawing")) {
      this.callbacks.onToggleDrawMode?.(true);
      const resp = "Laser air-drawing mode engaged. Use your index finger to sketch in space.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("stop drawing") || lower.includes("exit draw") || lower.includes("disable draw")) {
      this.callbacks.onToggleDrawMode?.(false);
      const resp = "Exiting laser air-drawing mode.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("suit up") || lower.includes("armor protocol") || lower.includes("mark 7 protocol")) {
      this.callbacks.onSuitUp?.();
      const resp = "Suit-up protocol engaged. Mark Seven armor subsystems online for SantoStark.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("repulsor blast") || lower.includes("shockwave") || lower.includes("blast workspace")) {
      this.callbacks.onRepulsorBlast?.();
      const resp = "Repulsor shockwave deployed.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("reset workspace") || lower.includes("clear workspace") || lower.includes("reset layout")) {
      this.callbacks.onResetWorkspace?.();
      const resp = "Holographic spatial workspace reset to standard Stark lab layout.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("mark 7") || lower.includes("armor blueprint") || lower.includes("schematic")) {
      this.callbacks.onAddBlueprint?.("mark7");
      const resp = "Displaying Mark Seven Armor CAD schematics.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (lower.includes("arc reactor blueprint") || lower.includes("reactor cad")) {
      this.callbacks.onAddBlueprint?.("arc");
      const resp = "Displaying Arc Reactor Phase-3 CAD diagram.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 8. ——— STATUS & DIAGNOSTICS ———
    if (lower.includes("status") || lower.includes("report") || lower.includes("diagnostics")) {
      const resp = "All primary systems nominal. Arc reactor output at 98.4% efficiency. Connected Android device rack standing by.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 9. ——— UNIFIED REAL-TIME STREAMING MULTI-LLM INTELLIGENCE ———
    this.callbacks.onResponse("Thinking...");
    await aiProviderService.askAIStream(
      input,
      this.persona,
      (_token, fullText) => {
        this.callbacks.onResponse(fullText);
      },
      (finalText) => {
        this.callbacks.onResponse(finalText);
        this.speak(finalText);
      }
    );
  }
}
