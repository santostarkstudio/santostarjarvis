/**
 * STARK OPTICAL HANDPRINT & PALM BIOMETRIC ENGINE
 * 21-Landmark Invariant Geometric Ratio Vector Extractor.
 * Compares hand geometry scale-independently against SantoStark's enrolled palmprint.
 */

import { starkSecurity } from "./starkSecurity";

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface PalmVerificationResult {
  isMatch: boolean;
  score: number; // 0.0 to 1.0
  confidencePercent: number;
  palmWidthRatio: number;
}

class StarkHandBiometrics {
  /**
   * Distance between 2 3D landmarks
   */
  private dist(a: LandmarkPoint, b: LandmarkPoint): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Extract 15 invariant geometric ratio features from 21 MediaPipe hand landmarks
   */
  public extractGeometricVector(landmarks: LandmarkPoint[]): number[] | null {
    if (!landmarks || landmarks.length < 21) return null;

    // Base Normalization Reference: Wrist (0) to Middle Knuckle MCP (9)
    const dPalm = this.dist(landmarks[0], landmarks[9]);
    if (dPalm < 0.04) return null; // Hand too small/far or corrupted

    // 1. Finger Length Ratios (relative to dPalm)
    const rThumb = this.dist(landmarks[1], landmarks[4]) / dPalm;
    const rIndex = this.dist(landmarks[5], landmarks[8]) / dPalm;
    const rMiddle = this.dist(landmarks[9], landmarks[12]) / dPalm;
    const rRing = this.dist(landmarks[13], landmarks[16]) / dPalm;
    const rPinky = this.dist(landmarks[17], landmarks[20]) / dPalm;

    // 2. Knuckle & Palm Span Ratios
    const rPalmWidth = this.dist(landmarks[5], landmarks[17]) / dPalm;
    const rThumbIndex = this.dist(landmarks[4], landmarks[8]) / dPalm;
    const rIndexMiddle = this.dist(landmarks[8], landmarks[12]) / dPalm;
    const rMiddleRing = this.dist(landmarks[12], landmarks[16]) / dPalm;
    const rRingPinky = this.dist(landmarks[16], landmarks[20]) / dPalm;

    // 3. Phalanx Bone Segment Proportions
    const rIndexPhalanx =
      (this.dist(landmarks[5], landmarks[6]) + 0.001) /
      (this.dist(landmarks[7], landmarks[8]) + 0.001);
    const rMiddlePhalanx =
      (this.dist(landmarks[9], landmarks[10]) + 0.001) /
      (this.dist(landmarks[11], landmarks[12]) + 0.001);
    const rRingPhalanx =
      (this.dist(landmarks[13], landmarks[14]) + 0.001) /
      (this.dist(landmarks[15], landmarks[16]) + 0.001);
    const rPinkyPhalanx =
      (this.dist(landmarks[17], landmarks[18]) + 0.001) /
      (this.dist(landmarks[19], landmarks[20]) + 0.001);
    const rThumbPhalanx =
      (this.dist(landmarks[1], landmarks[2]) + 0.001) /
      (this.dist(landmarks[3], landmarks[4]) + 0.001);

    return [
      rThumb,
      rIndex,
      rMiddle,
      rRing,
      rPinky,
      rPalmWidth,
      rThumbIndex,
      rIndexMiddle,
      rMiddleRing,
      rRingPinky,
      rIndexPhalanx,
      rMiddlePhalanx,
      rRingPhalanx,
      rPinkyPhalanx,
      rThumbPhalanx,
    ];
  }

  /**
   * Compare 2 15-element geometric ratio vectors via weighted Euclidean similarity
   */
  public computeGeometricSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== 15 || b.length !== 15) return 0;

    let sumDiffSq = 0;
    for (let i = 0; i < 15; i++) {
      const diff = a[i] - b[i];
      // Give higher weight to palm width and finger lengths (first 6 features)
      const weight = i < 6 ? 1.5 : 0.8;
      sumDiffSq += diff * diff * weight;
    }

    const dist = Math.sqrt(sumDiffSq);
    // Typical matching tolerance is dist < 0.35
    const score = Math.max(0, Math.min(1, 1 - dist / 0.55));
    return score;
  }

  /**
   * Verify an incoming hand's landmarks against enrolled profile
   */
  public verifyHand(landmarks: LandmarkPoint[]): PalmVerificationResult {
    const profile = starkSecurity.getProfile();
    const enrolled = profile.palmVector;

    const liveVector = this.extractGeometricVector(landmarks);

    if (!liveVector) {
      return {
        isMatch: false,
        score: 0,
        confidencePercent: 0,
        palmWidthRatio: 0,
      };
    }

    if (!enrolled || enrolled.length === 0) {
      // Default to granted if not enrolled yet
      return {
        isMatch: true,
        score: 1.0,
        confidencePercent: 100,
        palmWidthRatio: liveVector[5] || 1.0,
      };
    }

    const score = this.computeGeometricSimilarity(liveVector, enrolled);
    const threshold = 0.82; // 82% geometric tolerance
    const isMatch = score >= threshold;

    return {
      isMatch,
      score,
      confidencePercent: Math.round(score * 100),
      palmWidthRatio: liveVector[5] || 1.0,
    };
  }

  /**
   * Enroll Handprint
   */
  public enrollHand(landmarks: LandmarkPoint[]): number[] | null {
    const vector = this.extractGeometricVector(landmarks);
    if (vector) {
      starkSecurity.savePalmprint(vector);
      return vector;
    }
    return null;
  }
}

export const handBiometrics = new StarkHandBiometrics();
