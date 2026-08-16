/**
 * TONY STARK DOUBLE-CLAP AUDIO IMPULSE DETECTOR
 * Real-time Web Audio high-transient peak acoustic sensor.
 * Detects rapid dual-clap spikes (120ms <= dt <= 650ms) to power up the lab.
 */

import { starkSecurity } from "./starkSecurity";

export interface ClapDetectorCallbacks {
  onDoubleClap: () => void;
  onSingleClap?: () => void;
  onAudioLevel?: (level: number) => void;
}

class StarkClapDetector {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;

  private lastClapTime: number = 0;
  private clapCount: number = 0;
  private cooldownUntil: number = 0;
  private ambientNoiseFloor: number = 0.05;

  private callbacks: ClapDetectorCallbacks = {
    onDoubleClap: () => {},
  };

  /**
   * Start listening for double claps from a MediaStream (Webcam or Mic)
   */
  public start(stream: MediaStream, callbacks: ClapDetectorCallbacks) {
    this.stop();
    this.callbacks = callbacks;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.audioCtx = new AudioContextClass();

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      this.source = this.audioCtx.createMediaStreamSource(stream);

      // High-Q Bandpass filter centered at 2.4 kHz (acoustic clap resonance)
      this.filter = this.audioCtx.createBiquadFilter();
      this.filter.type = "bandpass";
      this.filter.frequency.setValueAtTime(2400, this.audioCtx.currentTime);
      this.filter.Q.setValueAtTime(2.2, this.audioCtx.currentTime);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.1;

      this.source.connect(this.filter);
      this.filter.connect(this.analyser);

      this.isRunning = true;
      this.analyzeLoop();
    } catch (e) {
      console.warn("[ClapDetector] Failed to initialize Web Audio clap sensor:", e);
    }
  }

  private analyzeLoop = () => {
    if (!this.isRunning || !this.analyser) return;

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    // Compute Peak Amplitude & RMS
    let peak = 0;
    let sumSquares = 0;

    for (let i = 0; i < buffer.length; i++) {
      const val = Math.abs(buffer[i]);
      if (val > peak) peak = val;
      sumSquares += val * val;
    }

    const rms = Math.sqrt(sumSquares / buffer.length);

    // Slowly adapt ambient noise floor
    this.ambientNoiseFloor = this.ambientNoiseFloor * 0.96 + rms * 0.04;

    if (this.callbacks.onAudioLevel) {
      this.callbacks.onAudioLevel(Math.min(1, peak * 2));
    }

    const now = performance.now();
    const sensitivity = starkSecurity.getProfile().clapSensitivity || 1.0;
    const threshold = Math.max(0.28, (0.38 / sensitivity));

    // Check if peak is a sharp acoustic impulse above noise floor
    const isImpulse = peak > threshold && peak > this.ambientNoiseFloor * 4.5;

    if (isImpulse && now > this.cooldownUntil) {
      const dt = now - this.lastClapTime;

      if (this.clapCount === 1 && dt >= 120 && dt <= 650) {
        // ——— DOUBLE CLAP MATCHED! ———
        this.clapCount = 0;
        this.lastClapTime = 0;
        this.cooldownUntil = now + 1200; // 1.2s cooldown

        if (this.callbacks.onDoubleClap) {
          this.callbacks.onDoubleClap();
        }
      } else {
        // First clap registered
        this.clapCount = 1;
        this.lastClapTime = now;
        this.cooldownUntil = now + 80; // Debounce immediate bounce

        if (this.callbacks.onSingleClap) {
          this.callbacks.onSingleClap();
        }
      }
    }

    // Reset clap count if window expired
    if (this.clapCount === 1 && now - this.lastClapTime > 650) {
      this.clapCount = 0;
    }

    this.animFrameId = requestAnimationFrame(this.analyzeLoop);
  };

  /**
   * Stop Clap Sensor
   */
  public stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.filter) {
      this.filter.disconnect();
      this.filter = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}

export const clapDetector = new StarkClapDetector();
