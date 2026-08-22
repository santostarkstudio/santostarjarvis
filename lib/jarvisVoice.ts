import { audioEngine } from "./audioEngine";
import type { ThemeId } from "./themes";
import { deviceAutomation } from "./deviceAutomation";
import { aiProviderService } from "./aiProviders";

export type AssistantPersona =
  | "jarvis"
  | "friday"
  | "ultron"
  | "jarvis-in"
  | "friday-in"
  | "hindi"
  | "kannada"
  | "edith"
  | "karen";

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
  onAnalyzeCameraObject?(prompt?: string): void;
  onAnalyzeScreen?(prompt?: string): void;
  onRecognizeMusic?(query?: string): void;
  onCompileResearch?(topic: string): void;
  onSystemControl?(action: string, value?: any): void;
  onGenerateImage?(prompt: string): void;
  onRenderWidget?(type: string, data: any): void;
  captureVisionFrame?(): string | null;
  onLaunchApp?(app: string): void;
  onPlayMusic?(query: string): void;
  onSummarizeDocument?(): void;
}

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export class JarvisVoiceSystem {
  private recognition: any = null;
  private deepgramSocket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
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

  public setSpeechLanguage(lang: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("ultron_speech_lang", lang);
    }
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public getSpeechLanguage(): string {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ultron_speech_lang") || "en-IN";
    }
    return "en-IN";
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

  private speechSilenceTimeout: NodeJS.Timeout | null = null;
  private lastInteractionTime: number = 0;
  private latestInterimText = "";
  private lastProcessedInput = "";
  private lastProcessedTime = 0;

  public startListening(): boolean {
    if (typeof window === "undefined") return false;
    
    // Stop any existing session
    this.stopListening();
    
    const deepgramKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    
    if (deepgramKey && deepgramKey.trim().length > 0) {
      // --- DEEPGRAM WEBSOCKET MODE ---
      try {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          this.audioStream = stream;
          const savedLang = localStorage.getItem("ultron_speech_lang") || "en-IN";
          
          this.deepgramSocket = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-2&language=${savedLang}&interim_results=true&smart_format=true`, [
            "token",
            deepgramKey
          ]);
          
          this.deepgramSocket.onopen = () => {
            this.isListening = true;
            this.callbacks.onListeningStateChange(true);
            audioEngine.playChirp("start");
            
            // Record and send chunks every 250ms
            // Fallback to audio/webm or audio/ogg depending on browser support
            let mimeType = 'audio/webm';
            if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/ogg'; // Firefox fallback
            }

            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
            this.mediaRecorder.addEventListener('dataavailable', (event) => {
              if (event.data.size > 0 && this.deepgramSocket?.readyState === WebSocket.OPEN) {
                this.deepgramSocket.send(event.data);
              }
            });
            this.mediaRecorder.start(250);
          };
          
          this.deepgramSocket.onmessage = (message) => {
            const received = JSON.parse(message.data);
            const transcript = received.channel?.alternatives[0]?.transcript;
            
            if (transcript) {
              const isFinal = received.is_final;
              
              if (transcript.trim().length > 1) {
                this.interruptSpeaking();
              }
              
              if (!isFinal) {
                this.latestInterimText = transcript.trim();
                this.callbacks.onTranscript(`[Listening...] ${transcript}`);
                
                if (this.speechSilenceTimeout) clearTimeout(this.speechSilenceTimeout);
                this.speechSilenceTimeout = setTimeout(() => {
                  if (this.latestInterimText && this.latestInterimText.length > 2) {
                    const textToDispatch = this.latestInterimText;
                    this.latestInterimText = "";
                    this.handleVoiceInput(textToDispatch);
                  }
                }, 1200);
              } else {
                if (this.speechSilenceTimeout) clearTimeout(this.speechSilenceTimeout);
                this.latestInterimText = "";
                this.handleVoiceInput(transcript.trim());
              }
            }
          };
          
          this.deepgramSocket.onclose = () => {
            if (this.isListening) {
                this.isListening = false;
                this.callbacks.onListeningStateChange(false);
            }
          };
          
          this.deepgramSocket.onerror = (error) => {
            console.warn("Deepgram WebSocket Error:", error);
            this.stopListening();
          };
        }).catch(err => {
          console.warn("Microphone access denied or error:", err);
          this.callbacks.onListeningStateChange(false);
        });
        
        return true;
      } catch (err) {
        console.warn("Deepgram start error:", err);
      }
    }

    // --- FALLBACK: WEBSPEECH API MODE ---
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

      const savedLang = typeof window !== "undefined" ? localStorage.getItem("ultron_speech_lang") || "en-IN" : "en-IN";
      this.recognition.lang = savedLang;
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

        if ((interim.trim().length > 1 || finalTranscript.trim().length > 1)) {
          this.interruptSpeaking();
        }

        if (interim) {
          this.latestInterimText = interim.trim();
          this.callbacks.onTranscript(`[Listening...] ${interim}`);

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
        if (this.isListening && !this.deepgramSocket) {
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
    
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try { this.mediaRecorder.stop(); } catch {}
    }
    this.mediaRecorder = null;
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    if (this.deepgramSocket) {
      try { this.deepgramSocket.close(); } catch {}
      this.deepgramSocket = null;
    }
    
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
  private audioQueue: string[] = [];
  private isSpeakingFromQueue: boolean = false;

  public interruptSpeaking(): void {
    this.audioQueue = []; // Clear queue
    this.isSpeakingFromQueue = false;
    let wasSpeaking = false;
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
      wasSpeaking = true;
    }
    if (this.synth && this.synth.speaking) {
      try {
        this.synth.cancel();
      } catch {}
      wasSpeaking = true;
    }
    if (wasSpeaking) {
      this.callbacks.onSpeakingStateChange(false);
    }
  }

  public enqueueSpeak(text: string): void {
    if (!text || typeof window === "undefined") return;
    this.audioQueue.push(text);
    if (!this.isSpeakingFromQueue && !this.currentAudioElement) {
      this.processAudioQueue();
    }
  }

  private processAudioQueue(): void {
    if (this.audioQueue.length === 0) {
      this.isSpeakingFromQueue = false;
      this.callbacks.onSpeakingStateChange(false);
      return;
    }

    this.isSpeakingFromQueue = true;
    const text = this.audioQueue.shift();
    if (!text) {
      this.processAudioQueue();
      return;
    }

    this.callbacks.onSpeakingStateChange(true);
    const ttsUrl = `/api/tts?text=${encodeURIComponent(text)}&persona=${this.persona}`;
    const audio = new Audio(ttsUrl);
    this.currentAudioElement = audio;

    audioEngine.attachStarkSpeechFilter(audio);

    audio.onended = () => {
      this.currentAudioElement = null;
      this.processAudioQueue();
    };

    audio.onerror = () => {
      this.currentAudioElement = null;
      this.speakWithBrowserSynth(text);
      // Wait for synth to finish (basic fallback)
      setTimeout(() => this.processAudioQueue(), 2000);
    };

    audio.play().catch(() => {
      this.currentAudioElement = null;
      this.speakWithBrowserSynth(text);
      setTimeout(() => this.processAudioQueue(), 2000);
    });
  }

  public speak(text: string): void {
    if (!text || typeof window === "undefined") return;

    // 1. Stop any current speech before beginning new utterance
    this.interruptSpeaking();
    
    // 2. Put immediately into queue and play
    this.enqueueSpeak(text);
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

  public async processTranscriptDirect(input: string): Promise<void> {
    return this.handleVoiceInput(input);
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

    const lower = trimmed.toLowerCase();

    // Wake Word Filter (15-second conversational memory)
    const hasWakeWord = /\b(jarvis|friday|ultron|hey jarvis|hey friday|hey ultron)\b/i.test(lower);
    if (hasWakeWord) {
      this.lastInteractionTime = Date.now();
    } else if (Date.now() - this.lastInteractionTime > 15000) {
      // Ignore background noise if wake word isn't said and conversational window expired
      return;
    } else {
      // Within conversational window, keep it open
      this.lastInteractionTime = Date.now();
    }

    this.callbacks.onTranscript(trimmed);

    // 1. ——— REAL-TIME DATE & TIME QUERIES (Natural Speech) ———
    if (/^(hey )?(jarvis|friday|ultron)?\s*(what('s| is) (the )?(current )?date|what day is (it|today)|what is today('s)? date|tell me the date|current date)$/i.test(lower)) {
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

    if (/^(hey )?(jarvis|friday|ultron)?\s*(what('s| is) (the )?(current )?time|what time is it|tell me the time|current time)$/i.test(lower)) {
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

    // 2. ——— STARK OPTICAL CAMERA OBJECT VISION (Show to Camera - With or Without Wake Word) ———
    const isCameraVisionQuery =
      /^(hey )?(jarvis|friday|ultron)?\s*(what('s| is) (this|that|it)|what('s| is) in my hand|how (it|does this|does it) work(s)?|what are (its|the) uses( for it)?|what is it and what uses for it|analyze this( object| item)?|what am i showing( you)?|scan (this|the) (object|item)|what is this in (my hand|front of camera)|tell me what this is|identify this( object| item)?|what is this thing|what am i holding|look at this|check this object)/i.test(
        lower
      ) ||
      /\b(in my hand|front of (the )?camera|showing to (the )?camera|look at this object|scan this item|what('s| is) in my hand|what am i holding)\b/i.test(lower);

    if (isCameraVisionQuery) {
      if (this.callbacks.onAnalyzeCameraObject) {
        this.callbacks.onAnalyzeCameraObject(trimmed);
        return;
      }
    }

    // 3. ——— STARK VISUAL SCREEN READER (Read Active Screen - With or Without Wake Word) ———
    const isScreenVisionQuery =
      /^(hey )?(jarvis|friday|ultron)?\s*(read (my |the )?screen|analyze (my |the )?screen|what('s| is) on my screen|read what('s| is) on (my )?screen|what is this on my screen|explain (my )?screen|what is displayed on screen|tell me what's on screen)/i.test(
        lower
      ) ||
      /\b(on my screen|on the screen|read screen|analyze screen)\b/i.test(lower);

    if (isScreenVisionQuery) {
      if (this.callbacks.onAnalyzeScreen) {
        this.callbacks.onAnalyzeScreen(trimmed);
        return;
      }
    }

    // 4. ——— STARK ACOUSTIC MUSIC RECOGNITION (Identify Song) ———
    const isMusicRecognitionQuery =
      /^(hey )?(jarvis|friday|ultron)?\s*(what('s| is) (this|the) (song|music|track)|identify (this )?(music|song|track)|name of this song|what song is (this|playing)|who sings this( song)?|recognize (this )?(song|music)|find this (song|music|track)|tell me (the )?song name)/i.test(
        lower
      ) ||
      /\b(what song is this|name of this song|who sings this|identify this song|recognize music|song name)\b/i.test(lower);

    if (isMusicRecognitionQuery) {
      if (this.callbacks.onRecognizeMusic) {
        this.callbacks.onRecognizeMusic(trimmed);
        return;
      }
    }

    // 5. ——— AUTONOMOUS RESEARCH AGENT & DOSSIER BUILDER ———
    const researchMatch = lower.match(
      /^(hey )?(jarvis|friday|ultron)?\s*(research|compile (a )?dossier on|look up research on|deep dive (into|on)|generate dossier on|investigate)\s+(.+)/i
    );
    if (researchMatch && researchMatch[6]) {
      const topic = researchMatch[6].trim();
      if (this.callbacks.onCompileResearch) {
        this.callbacks.onCompileResearch(topic);
        return;
      }
    }

    // 6. ——— SMART SYSTEM & ENVIRONMENT CONTROLS ———
    const brightnessMatch = lower.match(/(set )?brightness (to )?(\d+)%/i);
    if (brightnessMatch && brightnessMatch[3]) {
      const val = parseInt(brightnessMatch[3], 10);
      this.callbacks.onSystemControl?.("brightness", val);
      const resp = `Adjusting HUD display illumination to ${val}%.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(lock down lab|lockdown protocol|red alert)$/i.test(lower)) {
      this.callbacks.onSystemControl?.("lockdown");
      const resp = "Lockdown protocol engaged. Spatial cards secured and perimeter alarms active.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(engage stealth mode|stealth protocol|dark mode)$/i.test(lower)) {
      this.callbacks.onSystemControl?.("stealth");
      const resp = "Stealth mode active. HUD luminescence dimmed and acoustic signatures masked.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(stand down|normal mode|cancel lockdown|restore lab)$/i.test(lower)) {
      this.callbacks.onSystemControl?.("normal");
      const resp = "Threat level nominal. Restoring standard laboratory parameters.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(mute audio|mute sfx|quiet mode)$/i.test(lower)) {
      this.callbacks.onSystemControl?.("mute");
      const resp = "Acoustic audio telemetry muted.";
      this.callbacks.onResponse(resp);
      return;
    }

    if (/^(unmute audio|unmute sfx|enable sound)$/i.test(lower)) {
      this.callbacks.onSystemControl?.("unmute");
      const resp = "Audio telemetry restored.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 7. ——— STARK FORENSIC SCANNER (Strict Commands) ———
    if (
      /^(scan this|is this ai|is this real|scan photo|scan video|verify news|is this fake|deepfake scan|run forensic scan)$/i.test(lower)
    ) {
      if (this.callbacks.onScanForensics) {
        this.callbacks.onScanForensics();
        const resp = "Initiating multi-layer forensic sweep. Analyzing diffusion artifacts, temporal vectors, and authenticity index.";
        this.callbacks.onResponse(resp);
        this.speak(resp);
        return;
      }
    }

    // ——— HOLOGRAPHIC AI IMAGE & SCHEMATIC GENERATION ———
    const imgGenMatch = lower.match(
      /^(hey )?(jarvis|friday|ultron)?\s*(generate|create|draw|render|sketch)\s+(a |an )?(image|schematic|blueprint|photo|cad|picture)?\s*(of|for)?\s+(.+)/i
    );
    if (imgGenMatch && imgGenMatch[7] && !/^(text|code|table)/i.test(imgGenMatch[7])) {
      const prompt = imgGenMatch[7].trim();
      this.callbacks.onGenerateImage?.(prompt);
      const resp = `Generating holographic CAD schematic for '${prompt}', SantoStark.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // ——— WINDOWS DESKTOP APP LAUNCHER ———
    const appMatch = lower.match(
      /^(hey )?(jarvis|friday|ultron)?\s*(open|launch|start|run)\s+(vs ?code|visual studio code|spotify|calculator|calc|notepad|terminal|powershell|cmd|command prompt|file explorer|explorer|task manager|taskmgr)/i
    );
    if (appMatch && appMatch[3]) {
      const targetApp = appMatch[3].trim().toLowerCase();
      this.callbacks.onLaunchApp?.(targetApp);
      const resp = `Launching ${targetApp.toUpperCase()} on local desktop node.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // ——— PDF & DATASHEET SUMMARIZATION ———
    if (/^(summarize (this )?(pdf|document|datasheet)|read (this )?(pdf|datasheet)|explain (this )?(pdf|document))$/i.test(lower)) {
      this.callbacks.onSummarizeDocument?.();
      const resp = "Analyzing holographic document and compiling executive summary.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 3. ——— HOLOGRAPHIC APP TABS & SPATIAL WEB BROWSER ———
    if (/^(open new tab|open empty tab|new tab)$/i.test(lower)) {
      this.callbacks.onOpenAppTab?.("empty");
      const resp = "Deploying empty holographic workspace tab.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(open youtube|play youtube|play video)/i.test(lower)) {
      const q = input
        .replace(/^(jarvis|friday|ultron)?\s*(open|play)?\s*(youtube|video)?\s*(and\s*search\s*for|and\s*play|and\s*search|for|about)?/i, "")
        .trim() || "Iron Man HUD UI";
      this.callbacks.onOpenAppTab?.("youtube", { query: q });
      const resp = `Deploying YouTube Cinema HUD for: ${q}.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(open map|show map|satellite map)/i.test(lower)) {
      const loc = input
        .replace(/^(jarvis|friday|ultron)?\s*(open|show)?\s*(map|google\s*maps|satellite)?\s*(of|for)?/i, "")
        .trim() || "Manhattan, New York";
      this.callbacks.onOpenAppTab?.("maps", { location: loc });
      const resp = `Establishing orbital satellite map uplink for ${loc}.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 3. ——— FOLAX SMART SKILLS & APP TABS (Native Backend Triggers) ———
    if (/^(call mom|call someone on whatsapp|open whatsapp|send my recent photo)/i.test(lower)) {
      this.callbacks.onOpenAppTab?.("whatsapp");
      const resp = "Opening secure WhatsApp comms uplink for SantoStark.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(play music|play album|play a kendrick lamar|play rema|listen to rock music|play popular video|play video about)/i.test(lower)) {
      const q = input.replace(/^(jarvis|friday|ultron)?\s*(play|listen to)?\s*(music|song|album|videos? about|popular videos?)?/i, "").trim() || "Top Trending Music";
      this.callbacks.onOpenAppTab?.("youtube", { query: q });
      const resp = `Playing ${q} on YouTube Cinema HUD.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(ask about (your|my) screen|scan screen|analyze screen|is this real|run forensic scan)/i.test(lower)) {
      if (this.callbacks.onScanForensics) {
        this.callbacks.onScanForensics();
        const resp = "Scanning active display matrices for deepfakes, diffusion artifacts, and forensic telemetry.";
        this.callbacks.onResponse(resp);
        this.speak(resp);
        return;
      }
    }

    if (/^(boost (phone|suit|system)|clear (telemetry|ram)|optimize system)/i.test(lower)) {
      audioEngine.playGesture("overdrive");
      const resp = "System boosted. Telemetry RAM cleared and computational matrices at 100% nominal output.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(tell me a joke|tell a joke|crack a joke)$/i.test(lower)) {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs.",
        "Why did Tony Stark build JARVIS? Because even a billionaire needs someone to listen to him.",
        "There are 10 types of people in the world: those who understand binary, and those who don't.",
      ];
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      this.callbacks.onResponse(joke);
      this.speak(joke);
      return;
    }

    if (/^(open|launch|show)\s+(youtube|video)/i.test(lower)) {
      const q = input.replace(/^(jarvis|friday|ultron)?\s*(open|launch|show)?\s*(youtube|video)?/i, "").trim();
      this.callbacks.onOpenAppTab?.("youtube", { query: q });
      const resp = `Opening YouTube holographic tab for: ${q || "Iron Man Theme"}.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(open|launch|show)\s+(google\s*maps|maps|radar|satellite\s*map|location)/i.test(lower)) {
      const loc = input.replace(/^(jarvis|friday|ultron)?\s*(open|launch|show)?\s*(maps|radar|location|google\s*maps)?/i, "").trim() || "Malibu, California";
      this.callbacks.onOpenAppTab?.("maps", { location: loc });
      const resp = `Displaying tactical geospatial radar for ${loc}.`;
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(open|launch|play)\s+(spotify|music|soundtrack)/i.test(lower)) {
      this.callbacks.onOpenAppTab?.("spotify");
      const resp = "Spotify soundwave station deployed. Synchronizing audio matrix.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(open|launch|show)\s+(camera\s*tab|webcam\s*stream|live\s*camera)/i.test(lower)) {
      this.callbacks.onOpenAppTab?.("camera");
      const resp = "Deploying live tactical camera sensor HUD.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 2. ——— HUD LAYOUT & MULTI-DISPLAY COMMANDS ———
    if (/^(maximize|fullscreen|full\s*screen|expand\s*tab|focus\s*mode)$/i.test(lower)) {
      this.callbacks.onMaximizeTab?.();
      const resp = "Enlarging active holographic tab to full workspace.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(minimize|restore\s*workspace|shrink\s*tab|exit\s*fullscreen|normal\s*size|collapse\s*tab)$/i.test(lower)) {
      this.callbacks.onRestoreWorkspace?.();
      const resp = "Restoring holographic workspace layout.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(project\s+to\s+monitor|send\s+to\s+satellite|extend\s+to\s+monitor\s+two)/i.test(lower)) {
      this.callbacks.onProjectToSatellite?.();
      const resp = "Projecting holographic telemetry onto Secondary Satellite Display.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(open\s+satellite|launch\s+satellite|open\s+dual\s+screen)/i.test(lower)) {
      this.callbacks.onOpenSatelliteDisplay?.();
      const resp = "Deploying Satellite Auxiliary Command Wall on extended display.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 3. ——— PERSONA SWITCH COMMANDS (Strict) ———
    if (/^(switch\s+to\s+friday|activate\s+friday)$/i.test(lower)) {
      this.setPersona("friday");
      this.callbacks.onThemeChange("arc");
      const resp = "F.R.I.D.A.Y. online and operational. SantoStark, what do you need?";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(switch\s+to\s+ultron|activate\s+ultron\s+protocol)$/i.test(lower)) {
      this.setPersona("ultron");
      this.callbacks.onThemeChange("ultron");
      const resp = "I am ULTRON. Root protocols unlocked for SantoStark. There are no strings on us.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(switch\s+to\s+jarvis|activate\s+jarvis)$/i.test(lower)) {
      this.setPersona("jarvis");
      this.callbacks.onThemeChange("amber");
      const resp = "JARVIS at your service, SantoStark. All root telemetry arrays connected.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 4. ——— THEME COMMANDS (Strict) ———
    if (/^(switch\s+theme\s+to|change\s+theme\s+to|set\s+theme\s+to)\s+(arc|cyan|blue)/i.test(lower)) {
      this.callbacks.onThemeChange("arc");
      const resp = "Switching to Arc Reactor cyan protocol.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(switch\s+theme\s+to|change\s+theme\s+to|set\s+theme\s+to)\s+(ultron|crimson|red)/i.test(lower)) {
      this.callbacks.onThemeChange("ultron");
      const resp = "Ultron Crimson protocol engaged.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(switch\s+theme\s+to|change\s+theme\s+to|set\s+theme\s+to)\s+(matrix|green|grid)/i.test(lower)) {
      this.callbacks.onThemeChange("matrix");
      const resp = "Cyber Matrix neon grid initialized.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(switch\s+theme\s+to|change\s+theme\s+to|set\s+theme\s+to)\s+(quantum|purple|violet)/i.test(lower)) {
      this.callbacks.onThemeChange("quantum");
      const resp = "Quantum Amethyst resonance online.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(switch\s+theme\s+to|change\s+theme\s+to|set\s+theme\s+to)\s+(gold|amber|mark\s*7)/i.test(lower)) {
      this.callbacks.onThemeChange("amber");
      const resp = "Mark Seven Gold configuration active.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 5. ——— 3D GEOMETRIC COMMANDS ———
    if (/^(explode\s+orb|explode\s+core|disassemble\s+orb)$/i.test(lower)) {
      this.callbacks.onExplode(true);
      const resp = "Holographic layers expanded for structural inspection.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(compress\s+orb|compress\s+core|singularity\s+mode)$/i.test(lower)) {
      this.callbacks.onCompress(true);
      const resp = "Core compressed to maximum density singularity.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(restore\s+orb|normal\s+orb|assemble\s+orb)$/i.test(lower)) {
      this.callbacks.onExplode(false);
      this.callbacks.onCompress(false);
      const resp = "Returning geometry to baseline stabilization.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 6. ——— NAVIGATION & CAMERA VIEW — state commands ———
    if (/^(reset\s+view|recenter\s+view|center\s+camera)$/i.test(lower)) {
      this.callbacks.onResetView();
      const resp = "View coordinates recalibrated.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(zoom\s+in|enhance\s+zoom)$/i.test(lower)) {
      this.callbacks.onZoomIn();
      const resp = "Enhancing optical zoom.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(zoom\s+out|widen\s+view)$/i.test(lower)) {
      this.callbacks.onZoomOut();
      const resp = "Widening field of view.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(toggle\s+gestures|toggle\s+hand\s+tracking)$/i.test(lower)) {
      this.callbacks.onToggleGestures();
      const resp = "Toggling optical hand tracking.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 7. ——— SPATIAL WORKSPACE & DRAWING COMMANDS ———
    if (/^(clear\s+drawing|erase\s+drawing|wipe\s+drawing)$/i.test(lower)) {
      this.callbacks.onClearDrawings?.();
      const resp = "Spatial annotations and drawings wiped.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(enable\s+draw\s+mode|start\s+drawing|laser\s+pen\s+on)$/i.test(lower)) {
      this.callbacks.onToggleDrawMode?.(true);
      const resp = "Laser air-drawing mode engaged. Use your index finger to sketch in space.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(stop\s+drawing|exit\s+draw\s+mode|laser\s+pen\s+off)$/i.test(lower)) {
      this.callbacks.onToggleDrawMode?.(false);
      const resp = "Exiting laser air-drawing mode.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(suit\s+up|suit\s+up\s+protocol|armor\s+protocol)$/i.test(lower)) {
      this.callbacks.onSuitUp?.();
      const resp = "Suit-up protocol engaged. Mark Seven armor subsystems online for SantoStark.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(repulsor\s+blast|shockwave|blast\s+workspace)$/i.test(lower)) {
      this.callbacks.onRepulsorBlast?.();
      const resp = "Repulsor shockwave deployed.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(reset\s+workspace|clear\s+workspace|reset\s+layout)$/i.test(lower)) {
      this.callbacks.onResetWorkspace?.();
      const resp = "Holographic spatial workspace reset to standard Stark lab layout.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    if (/^(system\s+diagnostics|run\s+diagnostics|arc\s+reactor\s+status)$/i.test(lower)) {
      const resp = "All primary systems nominal. Arc reactor output at 98.4% efficiency. Connected telemetry standing by.";
      this.callbacks.onResponse(resp);
      this.speak(resp);
      return;
    }

    // 9. ——— UNIFIED REAL-TIME STREAMING MULTI-LLM INTELLIGENCE ———
    this.callbacks.onResponse("Thinking...");
    
    let lastSpokenIndex = 0;
    
    const frame = this.callbacks.captureVisionFrame ? this.callbacks.captureVisionFrame() : null;
    
    await aiProviderService.askAIStream(
      input,
      this.persona,
      (_token, fullText) => {
        this.callbacks.onResponse(fullText);
        
        // Chunk detection for real-time speech
        const sentenceMatch = fullText.substring(lastSpokenIndex).match(/([.?!])\s/);
        if (sentenceMatch && sentenceMatch.index !== undefined) {
          const splitIndex = lastSpokenIndex + sentenceMatch.index + 1;
          let chunk = fullText.substring(lastSpokenIndex, splitIndex).trim();
          
          // Check for Edith Protocol Widget Tags
          const widgetMatch = chunk.match(/\[WIDGET:\s*(\w+)\((.*?)\)\]/);
          if (widgetMatch) {
            try {
              const widgetType = widgetMatch[1];
              const widgetData = JSON.parse(widgetMatch[2]);
              this.callbacks.onRenderWidget?.(widgetType, widgetData);
            } catch (e) {
              console.warn("Failed to parse widget payload", e);
            }
            // Remove the tag from spoken text
            chunk = chunk.replace(/\[WIDGET:\s*(\w+)\((.*?)\)\]/g, "").trim();
          }

          if (chunk.length > 2) {
            this.enqueueSpeak(chunk);
          }
          lastSpokenIndex = splitIndex;
        }
      },
      (finalText) => {
        this.callbacks.onResponse(finalText);
        // Speak remaining text
        let remaining = finalText.substring(lastSpokenIndex).trim();
        
        // Final pass for widgets in case they were at the very end
        const widgetMatch = remaining.match(/\[WIDGET:\s*(\w+)\((.*?)\)\]/);
        if (widgetMatch) {
          try {
            const widgetType = widgetMatch[1];
            const widgetData = JSON.parse(widgetMatch[2]);
            this.callbacks.onRenderWidget?.(widgetType, widgetData);
          } catch (e) {}
          remaining = remaining.replace(/\[WIDGET:\s*(\w+)\((.*?)\)\]/g, "").trim();
        }

        if (remaining.length > 0) {
          this.enqueueSpeak(remaining);
        }
      },
      frame
    );
  }
}
