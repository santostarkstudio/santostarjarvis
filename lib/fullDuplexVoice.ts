/**
 * STARK FULL-DUPLEX HANDS-FREE VOICE TRANSCEIVER
 * Continuous listening loop with Voice Activity Detection (VAD) and speech interruption.
 */

export interface DuplexVoiceCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onUserSpeakingStart: () => void;
  onUserSpeakingEnd: () => void;
  onSystemInterrupt: () => void;
  onError: (err: string) => void;
}

export class StarkFullDuplexTransceiver {
  private recognition: any = null;
  private isHandsFreeActive = false;
  private isSpeechActive = false;
  private callbacks: DuplexVoiceCallbacks | null = null;
  private silenceTimer: any = null;
  private restartTimer: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private vadInterval: any = null;

  public init(callbacks: DuplexVoiceCallbacks): boolean {
    this.callbacks = callbacks;
    if (typeof window === "undefined") return false;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("[FullDuplex] Web Speech Recognition not supported in this environment.");
      return false;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = "en-IN";

    rec.onstart = () => {
      this.isSpeechActive = true;
    };

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      // If user starts speaking while Jarvis is talking, immediately trigger interrupt!
      if ((interim.trim() || final.trim()) && this.callbacks) {
        this.callbacks.onSystemInterrupt();
      }

      if (final.trim() && this.callbacks) {
        this.callbacks.onTranscript(final.trim(), true);
      } else if (interim.trim() && this.callbacks) {
        this.callbacks.onTranscript(interim.trim(), false);
      }
    };

    rec.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.warn("[FullDuplex Error]", event.error);
    };

    rec.onend = () => {
      this.isSpeechActive = false;
      // If hands-free mode is active, automatically restart listening loop
      if (this.isHandsFreeActive) {
        clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          try {
            if (this.isHandsFreeActive && !this.isSpeechActive) {
              rec.start();
            }
          } catch {
            // Already starting
          }
        }, 300);
      }
    };

    this.recognition = rec;
    return true;
  }

  public setLanguage(lang: string) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public startHandsFree(): void {
    this.isHandsFreeActive = true;
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch {
        // Already active
      }
    }
  }

  public stopHandsFree(): void {
    this.isHandsFreeActive = false;
    clearTimeout(this.restartTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignored
      }
    }
  }

  public toggleHandsFree(): boolean {
    if (this.isHandsFreeActive) {
      this.stopHandsFree();
      return false;
    } else {
      this.startHandsFree();
      return true;
    }
  }

  public isEnabled(): boolean {
    return this.isHandsFreeActive;
  }
}

export const starkFullDuplex = new StarkFullDuplexTransceiver();
