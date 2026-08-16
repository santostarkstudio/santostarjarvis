export interface AudioMetrics {
  bass: number;     // 0 to 1
  mid: number;      // 0 to 1
  treble: number;   // 0 to 1
  overall: number;  // 0 to 1
  freqData: Uint8Array;
  timeData: Uint8Array;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;

  // Microphone analysis
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqArray: Uint8Array | null = null;
  private timeArray: Uint8Array | null = null;

  // Smooth metrics
  private smoothBass = 0;
  private smoothMid = 0;
  private smoothTreble = 0;
  private smoothOverall = 0;

  public isMuted = false;
  public isMicActive = false;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(
        muted ? 0 : 0.7,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  // ——— SFX PROCEDURAL SYNTHESIS ———

  public playBoot(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Sub-bass sweep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(40, now);
      osc1.frequency.exponentialRampToValueAtTime(320, now + 0.9);
      gain1.gain.setValueAtTime(0.01, now);
      gain1.gain.exponentialRampToValueAtTime(0.6, now + 0.3);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain!);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Cyber chime arpeggio
      const chord = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + 0.2 + i * 0.08);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.setValueAtTime(0.25, now + 0.2 + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + 0.2 + i * 0.08);
        osc.stop(now + 0.8 + i * 0.08);
      });
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  public playClick(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  public playGesture(kind: "pinch" | "fist" | "palm" | "swipe" | "reset"): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (kind === "fist") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      } else if (kind === "palm") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      } else if (kind === "swipe") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      }

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  public playExplode(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }

  public playCompress(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  public playThemeChange(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.04);
        gain.gain.setValueAtTime(0.2, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.16);
      });
    } catch {}
  }

  public playChirp(type: "start" | "done" | "alert"): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "start") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.1);
      } else if (type === "done") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
      } else {
        osc.type = "square";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(330, now + 0.08);
      }

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  // ——— SPATIAL GESTURE SYNTHESIS (STARK LAB SFX) ———

  public playTargetLock(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.setValueAtTime(1900, now + 0.03);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  public playGrab(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Low magnetic hum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.2);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.25);

      // High resonance ring
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain!);
      osc2.start(now);
      osc2.stop(now + 0.15);
    } catch {}
  }

  public playDrop(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  public playToss(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  public playAirTap(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.05);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  public playRepulsorBlast(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Heavy sub-bass thump
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(160, now);
      osc1.frequency.exponentialRampToValueAtTime(35, now + 0.4);
      gain1.gain.setValueAtTime(0.8, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain!);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Energy discharge crackle
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(900, now);
      osc2.frequency.exponentialRampToValueAtTime(120, now + 0.3);
      gain2.gain.setValueAtTime(0.5, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain!);
      osc2.start(now);
      osc2.stop(now + 0.4);
    } catch {}
  }

  public playDialClick(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1800, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.025);
    } catch {}
  }

  public playLaserDraw(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(950 + Math.random() * 200, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  public playSuitUp(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const steps = [220, 330, 440, 660, 880, 1320];
      steps.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.06 + 0.08);
        gain.gain.setValueAtTime(0.25, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.13);
      });
    } catch {}
  }

  public playSlice(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Fast laser cut shear
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.09);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.11);

      // Low sizzle
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(700, now);
      osc2.frequency.exponentialRampToValueAtTime(140, now + 0.14);
      gain2.gain.setValueAtTime(0.3, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain!);
      osc2.start(now);
      osc2.stop(now + 0.16);
    } catch {}
  }

  public playOverdrive(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Arc power surge
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(180, now);
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
      gain1.gain.setValueAtTime(0.01, now);
      gain1.gain.linearRampToValueAtTime(0.5, now + 0.15);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain!);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Electric spark arpeggio
      const sparks = [880, 1320, 1760, 2640];
      sparks.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(f, now + 0.05 + i * 0.04);
        gain.gain.setValueAtTime(0.2, now + 0.05 + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + i * 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + 0.05 + i * 0.04);
        osc.stop(now + 0.15 + i * 0.04);
      });
    } catch {}
  }

  public playShield(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  public playTetherGrapple(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  public playCommBeep(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1760, now);
      osc.frequency.setValueAtTime(2200, now + 0.06);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  public playPlasmaHum(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  public playScanSweep(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.5);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch {}
  }

  public playScanVerdict(isReal: boolean): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      if (isReal) {
        // High harmonic authentic confirmation
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.05);
          gain.gain.setValueAtTime(0.2, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);
          osc.connect(gain);
          gain.connect(this.sfxGain!);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.28);
        });
      } else {
        // Deep synthetic warning dissonance
        [320, 290, 240, 180].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, now + i * 0.07);
          gain.gain.setValueAtTime(0.25, now + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
          osc.connect(gain);
          gain.connect(this.sfxGain!);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.38);
        });
      }
    } catch {}
  }

  public playIngest(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  public playMaximize(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Resonant sweeping bass power whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.35);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.42);

      // High cyber chord
      [880, 1320, 1760].forEach((freq, i) => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(freq, now + 0.05 + i * 0.04);
        gain2.gain.setValueAtTime(0.18, now + 0.05 + i * 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(this.sfxGain!);
        osc2.start(now + 0.05 + i * 0.04);
        osc2.stop(now + 0.38);
      });
    } catch {}
  }

  public playRestore(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.22);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  // ——— MICROPHONE & FFT SPECTRUM ANALYZER ———

  public async startMic(): Promise<boolean> {
    try {
      const ctx = this.initContext();
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.micSource = ctx.createMediaStreamSource(this.micStream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.micSource.connect(this.analyser);
      // NOTE: Do NOT connect analyser to ctx.destination to avoid feedback loop!

      this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeArray = new Uint8Array(this.analyser.fftSize);
      this.isMicActive = true;
      return true;
    } catch (err) {
      console.warn("Microphone access failed or denied:", err);
      this.isMicActive = false;
      return false;
    }
  }

  public stopMic(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    this.analyser = null;
    this.isMicActive = false;
  }

  public getAudioMetrics(): AudioMetrics {
    if (!this.analyser || !this.freqArray || !this.timeArray) {
      // Return subtle synthetic idle noise if microphone is inactive
      const emptyFreq = new Uint8Array(128);
      const emptyTime = new Uint8Array(256);
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        overall: 0,
        freqData: emptyFreq,
        timeData: emptyTime,
      };
    }

    (this.analyser as any).getByteFrequencyData(this.freqArray);
    (this.analyser as any).getByteTimeDomainData(this.timeArray);

    const binCount = this.analyser.frequencyBinCount;
    const bassEnd = Math.floor(binCount * 0.15);
    const midEnd = Math.floor(binCount * 0.55);

    let sumBass = 0;
    let sumMid = 0;
    let sumTreble = 0;
    let sumTotal = 0;

    for (let i = 0; i < binCount; i++) {
      const val = this.freqArray[i] / 255;
      sumTotal += val;
      if (i < bassEnd) sumBass += val;
      else if (i < midEnd) sumMid += val;
      else sumTreble += val;
    }

    const rawBass = sumBass / Math.max(1, bassEnd);
    const rawMid = sumMid / Math.max(1, midEnd - bassEnd);
    const rawTreble = sumTreble / Math.max(1, binCount - midEnd);
    const rawOverall = sumTotal / binCount;

    // Smooth response
    const alpha = 0.35;
    this.smoothBass += (rawBass - this.smoothBass) * alpha;
    this.smoothMid += (rawMid - this.smoothMid) * alpha;
    this.smoothTreble += (rawTreble - this.smoothTreble) * alpha;
    this.smoothOverall += (rawOverall - this.smoothOverall) * alpha;

    return {
      bass: this.smoothBass,
      mid: this.smoothMid,
      treble: this.smoothTreble,
      overall: this.smoothOverall,
      freqData: this.freqArray,
      timeData: this.timeArray,
    };
  }

  /**
   * Routes spoken audio through the Stark Suit HUD Intercom filter
   * (High-pass + 3.4kHz presence boost + compressor + spectrum analyzer connection)
   */
  public attachStarkSpeechFilter(audioElement: HTMLAudioElement): void {
    try {
      const ctx = this.initContext();
      const source = ctx.createMediaElementSource(audioElement);

      // 1. Highpass filter to eliminate sub-bass mud
      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = "highpass";
      hpFilter.frequency.setValueAtTime(110, ctx.currentTime);

      // 2. Peaking presence filter at 3.4 kHz for crisp holographic articulation
      const presenceFilter = ctx.createBiquadFilter();
      presenceFilter.type = "peaking";
      presenceFilter.frequency.setValueAtTime(3400, ctx.currentTime);
      presenceFilter.Q.setValueAtTime(1.8, ctx.currentTime);
      presenceFilter.gain.setValueAtTime(3.5, ctx.currentTime); // +3.5 dB presence

      // 3. Studio Dynamics Compressor
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, ctx.currentTime);
      compressor.knee.setValueAtTime(12, ctx.currentTime);
      compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.15, ctx.currentTime);

      // 4. Output gain
      const speechGain = ctx.createGain();
      speechGain.gain.setValueAtTime(1.15, ctx.currentTime);

      // Connect chain
      source.connect(hpFilter);
      hpFilter.connect(presenceFilter);
      presenceFilter.connect(compressor);
      compressor.connect(speechGain);

      // Also connect to analyser so the 3D Arc Reactor Orb pulses to speech!
      if (this.analyser) {
        compressor.connect(this.analyser);
      }

      speechGain.connect(this.masterGain || ctx.destination);
    } catch (e) {
      console.warn("[AudioEngine] Could not attach Stark speech filter:", e);
    }
  }
}

export const audioEngine = new AudioEngine();

