/**
 * STARK VOICE BIOMETRIC & SPEAKER RECOGNITION ENGINE
 * Acoustic Formant, Pitch Harmonics, and Spectral Feature Extractor.
 * Compares incoming speech with SantoStark's enrolled voiceprint via Cosine Similarity.
 */

import { starkSecurity } from "./starkSecurity";

export interface VoiceVerificationResult {
  isMatch: boolean;
  score: number; // 0.0 to 1.0 (Cosine similarity)
  confidencePercent: number;
  pitchHz: number;
}

export class StarkVoiceBiometrics {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isEnrolling: boolean = false;
  private recordedSnapshots: number[][] = [];

  /**
   * Extract a 64-element normalized acoustic spectral vector from Analyser
   */
  public extractSpectralVector(analyser: AnalyserNode): { vector: number[]; pitchHz: number } {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(dataArray);

    const timeDomain = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(timeDomain);

    // 1. Estimate Pitch (F0) using Autocorrelation
    const pitchHz = this.estimatePitch(timeDomain, analyser.context.sampleRate);

    // 2. Sample 64 frequency bands across the speech spectrum (80 Hz to 7500 Hz)
    const vectorLength = 64;
    const vector: number[] = new Array(vectorLength).fill(0);
    const nyquist = analyser.context.sampleRate / 2;
    const maxFreq = 7500;
    const maxBin = Math.floor((maxFreq / nyquist) * bufferLength);

    const step = maxBin / vectorLength;
    for (let i = 0; i < vectorLength; i++) {
      const startBin = Math.floor(i * step);
      const endBin = Math.floor((i + 1) * step);
      let sum = 0;
      let count = 0;

      for (let b = startBin; b < endBin && b < bufferLength; b++) {
        // Convert dB (-100 to -30) to linear normalized amplitude 0 to 1
        const linear = Math.max(0, (dataArray[b] + 100) / 70);
        sum += linear;
        count++;
      }

      vector[i] = count > 0 ? sum / count : 0;
    }

    // Normalize vector to unit length
    const normVector = this.normalizeVector(vector);
    return { vector: normVector, pitchHz };
  }

  /**
   * Autocorrelation-based pitch estimator
   */
  private estimatePitch(buffer: Float32Array, sampleRate: number): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    if (rms < 0.015) return 0; // silence

    // Autocorrelation search within human vocal range (70Hz - 400Hz)
    const minPeriod = Math.floor(sampleRate / 400);
    const maxPeriod = Math.floor(sampleRate / 70);

    let bestCorrelation = 0;
    let bestPeriod = 0;

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0;
      for (let i = 0; i < buffer.length - period; i++) {
        correlation += buffer[i] * buffer[i + period];
      }

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }

    if (bestPeriod > 0) {
      return Math.round(sampleRate / bestPeriod);
    }
    return 0;
  }

  /**
   * Normalize an array to a unit vector
   */
  private normalizeVector(v: number[]): number[] {
    let magSq = 0;
    for (let i = 0; i < v.length; i++) {
      magSq += v[i] * v[i];
    }
    const mag = Math.sqrt(magSq) || 1;
    return v.map((x) => x / mag);
  }

  /**
   * Cosine Similarity between two normalized vectors
   */
  public computeCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return Math.max(0, Math.min(1, dot));
  }

  /**
   * Start 3-Second Voice Enrollment Calibration
   */
  public async enrollVoice(
    stream: MediaStream,
    onProgress: (percent: number, currentPitch: number) => void,
    onComplete: (enrolledVector: number[]) => void
  ) {
    this.recordedSnapshots = [];
    this.isEnrolling = true;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.audioCtx = new AudioContextClass();
    this.source = this.audioCtx.createMediaStreamSource(stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);

    const startTime = performance.now();
    const durationMs = 3000; // 3 seconds sample

    const poll = () => {
      if (!this.isEnrolling || !this.analyser) return;

      const elapsed = performance.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / durationMs) * 100));

      const { vector, pitchHz } = this.extractSpectralVector(this.analyser);

      // Only collect frames with vocal energy
      if (pitchHz > 60 && pitchHz < 500) {
        this.recordedSnapshots.push(vector);
      }

      onProgress(progress, pitchHz);

      if (elapsed < durationMs) {
        requestAnimationFrame(poll);
      } else {
        this.finishEnrollment(onComplete);
      }
    };

    poll();
  }

  private finishEnrollment(onComplete: (enrolledVector: number[]) => void) {
    this.isEnrolling = false;

    if (this.recordedSnapshots.length === 0) {
      console.warn("[VoiceBiometrics] No vocal audio frames captured during enrollment.");
      onComplete([]);
      return;
    }

    // Average all captured frames into a master voiceprint vector
    const vectorLength = 64;
    const avgVector: number[] = new Array(vectorLength).fill(0);

    for (const snap of this.recordedSnapshots) {
      for (let i = 0; i < vectorLength; i++) {
        avgVector[i] += snap[i];
      }
    }

    for (let i = 0; i < vectorLength; i++) {
      avgVector[i] /= this.recordedSnapshots.length;
    }

    const finalEnrolled = this.normalizeVector(avgVector);
    starkSecurity.saveVoiceprint(finalEnrolled);

    if (this.source) this.source.disconnect();
    if (this.audioCtx) this.audioCtx.close().catch(() => {});

    onComplete(finalEnrolled);
  }

  /**
   * Verify incoming audio against enrolled profile
   */
  public verifySpeech(analyser: AnalyserNode): VoiceVerificationResult {
    const profile = starkSecurity.getProfile();
    const enrolled = profile.voiceVector;

    const { vector: liveVector, pitchHz } = this.extractSpectralVector(analyser);

    if (!enrolled || enrolled.length === 0) {
      // If not enrolled yet, default to granted for primary user
      return {
        isMatch: true,
        score: 1.0,
        confidencePercent: 100,
        pitchHz,
      };
    }

    const similarity = this.computeCosineSimilarity(liveVector, enrolled);
    const threshold = 0.78; // 78% Cosine threshold
    const isMatch = similarity >= threshold;

    return {
      isMatch,
      score: similarity,
      confidencePercent: Math.round(similarity * 100),
      pitchHz,
    };
  }
}

export const voiceBiometrics = new StarkVoiceBiometrics();
