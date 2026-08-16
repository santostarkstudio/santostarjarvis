import {
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { audioEngine } from "./audioEngine";

// Landmark indices (MediaPipe hand model)
export const WRIST = 0;
export const THUMB_CMC = 1;
export const THUMB_MCP = 2;
export const THUMB_IP = 3;
export const THUMB_TIP = 4;
export const INDEX_MCP = 5;
export const INDEX_PIP = 6;
export const INDEX_DIP = 7;
export const INDEX_TIP = 8;
export const MIDDLE_MCP = 9;
export const MIDDLE_PIP = 10;
export const MIDDLE_DIP = 11;
export const MIDDLE_TIP = 12;
export const RING_MCP = 13;
export const RING_PIP = 14;
export const RING_DIP = 15;
export const RING_TIP = 16;
export const PINKY_MCP = 17;
export const PINKY_PIP = 18;
export const PINKY_DIP = 19;
export const PINKY_TIP = 20;

// Skeletal connections for overlay rendering
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [WRIST, THUMB_CMC],
  [THUMB_CMC, THUMB_MCP],
  [THUMB_MCP, THUMB_IP],
  [THUMB_IP, THUMB_TIP],
  // Index
  [WRIST, INDEX_MCP],
  [INDEX_MCP, INDEX_PIP],
  [INDEX_PIP, INDEX_DIP],
  [INDEX_DIP, INDEX_TIP],
  // Middle
  [WRIST, MIDDLE_MCP],
  [MIDDLE_MCP, MIDDLE_PIP],
  [MIDDLE_PIP, MIDDLE_DIP],
  [MIDDLE_DIP, MIDDLE_TIP],
  // Ring
  [WRIST, RING_MCP],
  [RING_MCP, RING_PIP],
  [RING_PIP, RING_DIP],
  [RING_DIP, RING_TIP],
  // Pinky
  [WRIST, PINKY_MCP],
  [PINKY_MCP, PINKY_PIP],
  [PINKY_PIP, PINKY_DIP],
  [PINKY_DIP, PINKY_TIP],
  // Palm base
  [INDEX_MCP, MIDDLE_MCP],
  [MIDDLE_MCP, RING_MCP],
  [RING_MCP, PINKY_MCP],
];

// Pinch hysteresis thresholds
const PINCH_ON = 0.32;
const PINCH_OFF = 0.46;

const ROTATE_SPEED = 4.2;

export type GestureMode = "idle" | "spin" | "zoom" | "explode" | "compress" | "bimanual";
export type HandPose =
  | "neutral"
  | "pinch"
  | "palm"
  | "fist"
  | "point"
  | "scissor"
  | "comm"
  | "overdrive"
  | "tether"
  | "thumbs_up"
  | "thumbs_down";

export interface HandPointer {
  handId: string;
  handedness: "Left" | "Right" | "?";
  screenX: number;
  screenY: number;
  normX: number;
  normY: number;
  depthZ: number;
  pinchRatio: number;
  isPinching: boolean;
  isPointing: boolean;
  isAirTapping: boolean;
  pose: HandPose;
  wristAngle: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  landmarks: NormalizedLandmark[];
}

export interface TrackerStatus {
  hands: number;
  mode: GestureMode;
  pose: HandPose;
  pointers: HandPointer[];
}

export interface HandTrackerCallbacks {
  onRotate(deltaTheta: number, deltaPhi: number): void;
  onZoom(factor: number): void;
  onExplode(explode: boolean): void;
  onCompress(compress: boolean): void;
  onSwipe(direction: "left" | "right"): void;
  onStatus(status: TrackerStatus): void;
  onPointers?(pointers: HandPointer[]): void;
  onAirTap?(pointer: HandPointer): void;
  onRepulsorBlast?(pointer: HandPointer): void;
  onRotaryDial?(deltaAngle: number): void;
  onBimanual?(scaleDelta: number, angleDelta: number, center: { x: number; y: number }): void;
  onSuitUp?(): void;
  onScissorCut?(pointer: HandPointer): void;
  onCommCall?(): void;
  onOverdrive?(): void;
  onTetherGrapple?(pointer: HandPointer): void;
  onThumbsUp?(): void;
  onThumbsDown?(): void;
  onPlasmaBall?(center: { x: number; y: number }, radius: number): void;
  onUnibeamBlast?(): void;
  onShieldToggle?(): void;
  onBookOpen?(): void;
  onCardExpand?(): void;
  onCardRestore?(): void;
  onDoublePinch?(pointer: HandPointer): void;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Adaptive Low-Pass Filter to eliminate jitter while maintaining high responsiveness
class AdaptiveFilter3D {
  private current: Point3D | null = null;
  private prevRaw: Point3D | null = null;
  private prevTime = 0;

  public filter(raw: Point3D, timeMs: number): Point3D {
    if (!this.current || !this.prevRaw || this.prevTime === 0) {
      this.current = { ...raw };
      this.prevRaw = { ...raw };
      this.prevTime = timeMs;
      return this.current;
    }

    const dt = Math.max(0.001, (timeMs - this.prevTime) / 1000);
    this.prevTime = timeMs;

    // Calculate speed of movement
    const dx = (raw.x - this.prevRaw.x) / dt;
    const dy = (raw.y - this.prevRaw.y) / dt;
    const dz = (raw.z - this.prevRaw.z) / dt;
    const speed = Math.hypot(dx, dy, dz);
    this.prevRaw = { ...raw };

    // Dynamic alpha: low alpha when stationary (smooth jitter away), high alpha when moving (instant response)
    const minAlpha = 0.22;
    const maxAlpha = 0.92;
    const speedScale = 8.0;
    const alpha = Math.min(maxAlpha, minAlpha + speed * speedScale);

    this.current.x += (raw.x - this.current.x) * alpha;
    this.current.y += (raw.y - this.current.y) * alpha;
    this.current.z += (raw.z - this.current.z) * alpha;

    return { ...this.current };
  }

  public reset(): void {
    this.current = null;
    this.prevRaw = null;
    this.prevTime = 0;
  }
}

interface InternalHandState {
  filter: AdaptiveFilter3D;
  pinching: boolean;
  pose: HandPose;
  lastCenterX: number;
  lastZ: number;
  lastWristAngle: number;
  lastTapTime: number;
  lastBlastTime: number;
  lastScissorTime: number;
  lastCommTime: number;
  lastOverdriveTime: number;
  lastTetherTime: number;
  lastThumbTime: number;
  prevIndexMiddleDist: number;
  smoothedPoint: Point3D;
  velocities: Point3D;
}

export class HandTracker {
  private video: HTMLVideoElement;
  private overlay: HTMLCanvasElement;
  private callbacks: HandTrackerCallbacks;
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private rafId = 0;
  private running = false;
  private lastVideoTime = -1;

  private handStates = new Map<string, InternalHandState>();
  private prevMode: GestureMode = "idle";
  private prevSpinGrab: { x: number; y: number } | null = null;
  private prevZoomDist: number | null = null;
  private prevBimanualAngle: number | null = null;
  private lastStatus: TrackerStatus = { hands: 0, mode: "idle", pose: "neutral", pointers: [] };
  private lastSwipeGlobalTime = 0;
  private lastSuitUpTime = 0;
  private lastShieldTime = 0;
  private lastUnibeamTime = 0;
  private lastBookTime = 0;
  private lastInferenceTime = 0;
  private lastPinchTimes = new Map<string, number>();
  private lastExpandTime = 0;
  private lastRestoreTime = 0;
  private prevDualHandDist = 0;

  constructor(
    video: HTMLVideoElement,
    overlay: HTMLCanvasElement,
    callbacks: HandTrackerCallbacks,
  ) {
    this.video = video;
    this.overlay = overlay;
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();

    this.overlay.width = this.video.videoWidth || 640;
    this.overlay.height = this.video.videoHeight || 480;

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
    );

    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
    });

    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
    this.landmarker?.close();
    this.landmarker = null;
    this.handStates.clear();
    this.prevMode = "idle";
    this.prevSpinGrab = null;
    this.prevZoomDist = null;
    this.prevBimanualAngle = null;
    const ctx = this.overlay.getContext("2d");
    ctx?.clearRect(0, 0, this.overlay.width, this.overlay.height);
    this.emitStatus({ hands: 0, mode: "idle", pose: "neutral", pointers: [] });
  }

  private loop = () => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    if (!this.landmarker || this.video.readyState < 2) return;
    if (this.video.currentTime === this.lastVideoTime) return;

    const now = performance.now();
    if (now - this.lastInferenceTime < 24) return; // ~40 FPS vision rate
    this.lastInferenceTime = now;
    this.lastVideoTime = this.video.currentTime;

    const result = this.landmarker.detectForVideo(this.video, now);
    const labels = result.handedness.map((h) => (h[0]?.categoryName as "Left" | "Right") ?? "?");
    this.processHands(result.landmarks, labels, now);
    this.drawOverlay(result.landmarks, labels);
  };

  private classifyPose(lm: NormalizedLandmark[]): {
    pose: HandPose;
    pinchRatio: number;
    wristAngle: number;
    indexMiddleDist: number;
  } {
    const wrist = lm[WRIST];
    const middleMcp = lm[MIDDLE_MCP];
    const indexMcp = lm[INDEX_MCP];
    const handScale = dist2d(wrist, middleMcp);
    if (handScale < 1e-6) {
      return { pose: "neutral", pinchRatio: 1, wristAngle: 0, indexMiddleDist: 1 };
    }

    const pinchRatio = dist2d(lm[THUMB_TIP], lm[INDEX_TIP]) / handScale;

    // Distances of fingertips from wrist relative to palm size
    const dThumb = dist2d(wrist, lm[THUMB_TIP]) / handScale;
    const dIndex = dist2d(wrist, lm[INDEX_TIP]) / handScale;
    const dMiddle = dist2d(wrist, lm[MIDDLE_TIP]) / handScale;
    const dRing = dist2d(wrist, lm[RING_TIP]) / handScale;
    const dPinky = dist2d(wrist, lm[PINKY_TIP]) / handScale;

    const avgExtension = (dIndex + dMiddle + dRing + dPinky) / 4;
    const indexMiddleDist = dist2d(lm[INDEX_TIP], lm[MIDDLE_TIP]) / handScale;

    // Wrist roll angle (angle between wrist and index MCP)
    const wristAngle = Math.atan2(indexMcp.y - wrist.y, indexMcp.x - wrist.x);

    // 1. Pinch gesture
    if (pinchRatio < PINCH_ON) {
      return { pose: "pinch", pinchRatio, wristAngle, indexMiddleDist };
    }

    // 2. Scissor gesture: Index & Middle extended, Ring & Pinky curled
    if (dIndex > 1.25 && dMiddle > 1.25 && dRing < 1.15 && dPinky < 1.15) {
      return { pose: "scissor", pinchRatio, wristAngle, indexMiddleDist };
    }

    // 3. Comm Link: Thumb & Pinky extended, Index/Middle/Ring curled (🤙)
    if (dThumb > 1.25 && dPinky > 1.25 && dIndex < 1.12 && dMiddle < 1.12 && dRing < 1.12) {
      return { pose: "comm", pinchRatio, wristAngle, indexMiddleDist };
    }

    // 4. Overdrive: Index & Pinky extended, Middle & Ring curled (🤘)
    if (dIndex > 1.25 && dPinky > 1.25 && dMiddle < 1.15 && dRing < 1.15 && dThumb < 1.2) {
      return { pose: "overdrive", pinchRatio, wristAngle, indexMiddleDist };
    }

    // 5. Laser Tether: Thumb, Index & Pinky extended (🤟)
    if (dThumb > 1.2 && dIndex > 1.2 && dPinky > 1.2 && dMiddle < 1.15 && dRing < 1.15) {
      return { pose: "tether", pinchRatio, wristAngle, indexMiddleDist };
    }

    // 6. Thumbs Up / Down: Thumb extended, all other fingers curled into fist
    if (dThumb > 1.25 && dIndex < 1.12 && dMiddle < 1.12 && dRing < 1.12 && dPinky < 1.12) {
      if (lm[THUMB_TIP].y < lm[THUMB_MCP].y - 0.05) {
        return { pose: "thumbs_up", pinchRatio, wristAngle, indexMiddleDist };
      }
      if (lm[THUMB_TIP].y > lm[THUMB_MCP].y + 0.05) {
        return { pose: "thumbs_down", pinchRatio, wristAngle, indexMiddleDist };
      }
    }

    // 7. Point gesture: index finger extended, other fingers curled (👆)
    if (dIndex > 1.3 && dMiddle < 1.15 && dRing < 1.1 && dPinky < 1.1) {
      return { pose: "point", pinchRatio, wristAngle, indexMiddleDist };
    }

    // 8. Open Palm: all fingers extended far from wrist (🖐️)
    if (avgExtension > 1.42 && dThumb > 1.1) {
      return { pose: "palm", pinchRatio, wristAngle, indexMiddleDist };
    }

    // 9. Fist: all fingertips curled close to wrist / palm (✊)
    if (avgExtension < 1.16 && dThumb < 1.15) {
      return { pose: "fist", pinchRatio, wristAngle, indexMiddleDist };
    }

    return { pose: "neutral", pinchRatio, wristAngle, indexMiddleDist };
  }

  private processHands(
    landmarks: NormalizedLandmark[][],
    labels: ("Left" | "Right" | "?")[],
    now: number,
  ): void {
    const activePointers: HandPointer[] = [];
    const detectedPoses: HandPose[] = [];
    const seen = new Set<string>();

    const winW = typeof window !== "undefined" ? window.innerWidth : 1440;
    const winH = typeof window !== "undefined" ? window.innerHeight : 900;

    landmarks.forEach((lm, i) => {
      const handedness = labels[i] || "?";
      const handId = `hand_${handedness}_${i}`;
      seen.add(handId);

      const { pose, pinchRatio, wristAngle, indexMiddleDist } = this.classifyPose(lm);
      detectedPoses.push(pose);

      // Raw pointer coordinates: mirror horizontally for natural front-camera control
      const rawX = 1 - (lm[THUMB_TIP].x + lm[INDEX_TIP].x) / 2;
      const rawY = (lm[THUMB_TIP].y + lm[INDEX_TIP].y) / 2;
      const rawZ = (lm[INDEX_TIP].z + lm[THUMB_TIP].z) / 2;

      let state = this.handStates.get(handId);
      if (!state) {
        state = {
          filter: new AdaptiveFilter3D(),
          pinching: false,
          pose: "neutral",
          lastCenterX: 1 - lm[MIDDLE_MCP].x,
          lastZ: rawZ,
          lastWristAngle: wristAngle,
          lastTapTime: 0,
          lastBlastTime: 0,
          lastScissorTime: 0,
          lastCommTime: 0,
          lastOverdriveTime: 0,
          lastTetherTime: 0,
          lastThumbTime: 0,
          prevIndexMiddleDist: indexMiddleDist,
          smoothedPoint: { x: rawX, y: rawY, z: rawZ },
          velocities: { x: 0, y: 0, z: 0 },
        };
        this.handStates.set(handId, state);
      }

      // Smooth coordinates
      const filtered = state.filter.filter({ x: rawX, y: rawY, z: rawZ }, now);
      const velX = (filtered.x - state.smoothedPoint.x) * 30;
      const velY = (filtered.y - state.smoothedPoint.y) * 30;
      const velZ = (filtered.z - state.lastZ) * 30;
      state.velocities = { x: velX, y: velY, z: velZ };
      state.smoothedPoint = filtered;

      // Pinch hysteresis
      let isNewPinch = false;
      if (state.pinching && pinchRatio > PINCH_OFF) {
        state.pinching = false;
      } else if (!state.pinching && pinchRatio < PINCH_ON) {
        state.pinching = true;
        isNewPinch = true;
      }

      const effectivePose: HandPose = state.pinching ? "pinch" : pose;
      state.pose = effectivePose;

      const pointer: HandPointer = {
        handId,
        handedness,
        screenX: filtered.x * winW,
        screenY: filtered.y * winH,
        normX: filtered.x,
        normY: filtered.y,
        depthZ: filtered.z,
        pinchRatio,
        isPinching: state.pinching,
        isPointing: effectivePose === "point",
        isAirTapping: false,
        pose: effectivePose,
        wristAngle,
        velocityX: velX,
        velocityY: velY,
        velocityZ: velZ,
        landmarks: lm,
      };

      if (isNewPinch) {
        const lastPinch = this.lastPinchTimes.get(handId) || 0;
        if (now - lastPinch < 420 && now - lastPinch > 80) {
          if (this.callbacks.onDoublePinch) {
            this.callbacks.onDoublePinch(pointer);
          }
        }
        this.lastPinchTimes.set(handId, now);
      }

      // ——— 1. SCISSOR CUT DETECTION (Index + Middle snap close) ———
      if (effectivePose === "scissor") {
        if (state.prevIndexMiddleDist > 0.22 && indexMiddleDist < 0.12 && now - state.lastScissorTime > 800) {
          state.lastScissorTime = now;
          audioEngine.playSlice();
          if (this.callbacks.onScissorCut) {
            this.callbacks.onScissorCut(pointer);
          }
        }
      }
      state.prevIndexMiddleDist = indexMiddleDist;

      // ——— 2. COMM LINK DETECTION (🤙) ———
      if (effectivePose === "comm" && now - state.lastCommTime > 2500) {
        state.lastCommTime = now;
        audioEngine.playCommBeep();
        if (this.callbacks.onCommCall) {
          this.callbacks.onCommCall();
        }
      }

      // ——— 3. OVERDRIVE DETECTION (🤘) ———
      if (effectivePose === "overdrive" && now - state.lastOverdriveTime > 3000) {
        state.lastOverdriveTime = now;
        audioEngine.playOverdrive();
        if (this.callbacks.onOverdrive) {
          this.callbacks.onOverdrive();
        }
      }

      // ——— 4. LASER TETHER DETECTION (🤟) ———
      if (effectivePose === "tether" && now - state.lastTetherTime > 1500) {
        state.lastTetherTime = now;
        audioEngine.playTetherGrapple();
        if (this.callbacks.onTetherGrapple) {
          this.callbacks.onTetherGrapple(pointer);
        }
      }

      // ——— 5. THUMBS UP / DOWN DETECTION (👍 / 👎) ———
      if (effectivePose === "thumbs_up" && now - state.lastThumbTime > 1800) {
        state.lastThumbTime = now;
        audioEngine.playChirp("done");
        if (this.callbacks.onThumbsUp) {
          this.callbacks.onThumbsUp();
        }
      } else if (effectivePose === "thumbs_down" && now - state.lastThumbTime > 1800) {
        state.lastThumbTime = now;
        audioEngine.playChirp("alert");
        if (this.callbacks.onThumbsDown) {
          this.callbacks.onThumbsDown();
        }
      }

      // ——— 6. AIR-TAP DETECTION (Forward Z-depth thrust of index finger) ———
      let isAirTapping = false;
      const zDelta = rawZ - state.lastZ;
      if (
        (effectivePose === "point" || effectivePose === "neutral") &&
        zDelta < -0.045 &&
        now - state.lastTapTime > 400
      ) {
        state.lastTapTime = now;
        isAirTapping = true;
        pointer.isAirTapping = true;
        audioEngine.playAirTap();
        if (this.callbacks.onAirTap) {
          this.callbacks.onAirTap(pointer);
        }
      }

      // ——— 7. REPULSOR BLAST DETECTION (Open palm thrust forward) ———
      if (
        effectivePose === "palm" &&
        zDelta < -0.06 &&
        now - state.lastBlastTime > 800
      ) {
        state.lastBlastTime = now;
        audioEngine.playRepulsorBlast();
        if (this.callbacks.onRepulsorBlast) {
          this.callbacks.onRepulsorBlast(pointer);
        }
      }

      // ——— 8. ROTARY DIAL DETECTION (Wrist twist while pinching) ———
      const dAngle = wristAngle - state.lastWristAngle;
      if (state.pinching && Math.abs(dAngle) > 0.08 && Math.abs(dAngle) < 1.2) {
        audioEngine.playDialClick();
        if (this.callbacks.onRotaryDial) {
          this.callbacks.onRotaryDial(dAngle);
        }
      }
      state.lastWristAngle = wristAngle;
      state.lastZ = rawZ;

      // ——— 9. SWIPE DETECTION (Rapid horizontal motion) ———
      const palmCenterX = 1 - lm[MIDDLE_MCP].x;
      const dx = palmCenterX - state.lastCenterX;
      if (Math.abs(dx) > 0.2 && now - this.lastSwipeGlobalTime > 600) {
        this.lastSwipeGlobalTime = now;
        const dir = dx > 0 ? "right" : "left";
        this.callbacks.onSwipe(dir);
        audioEngine.playGesture("swipe");
      }
      state.lastCenterX = palmCenterX;

      activePointers.push(pointer);
    });

    for (const key of this.handStates.keys()) {
      if (!seen.has(key)) this.handStates.delete(key);
    }

    // ══════════════════════════════════════════════════════════════════════
    // DUAL-HAND (10-FINGER) COMBINATIONS
    // ══════════════════════════════════════════════════════════════════════
    if (landmarks.length === 2 && activePointers.length === 2) {
      const p1 = activePointers[0];
      const p2 = activePointers[1];
      const lm1 = landmarks[0];
      const lm2 = landmarks[1];

      const center = {
        x: ((p1.normX + p2.normX) / 2) * winW,
        y: ((p1.normY + p2.normY) / 2) * winH,
      };
      const handDistNorm = Math.hypot(p1.normX - p2.normX, p1.normY - p2.normY);

      // A. SHIELD LOCKDOWN (Crossed wrists in 'X')
      const wristDist = dist2d(lm1[WRIST], lm2[WRIST]);
      if (wristDist < 0.15 && now - this.lastShieldTime > 2500) {
        this.lastShieldTime = now;
        audioEngine.playShield();
        if (this.callbacks.onShieldToggle) {
          this.callbacks.onShieldToggle();
        }
      }

      // B. UNIBEAM DUAL PALM MEGA BLAST (Both palms thrust forward)
      if (
        p1.pose === "palm" &&
        p2.pose === "palm" &&
        (p1.velocityZ < -1.5 || p2.velocityZ < -1.5) &&
        now - this.lastUnibeamTime > 2000
      ) {
        this.lastUnibeamTime = now;
        audioEngine.playRepulsorBlast();
        audioEngine.playOverdrive();
        if (this.callbacks.onUnibeamBlast) {
          this.callbacks.onUnibeamBlast();
        }
      }

      // C. PLASMA CONTAINMENT ENERGY BALL (Both open palms facing each other in center)
      if (
        (p1.pose === "palm" || p1.pose === "neutral") &&
        (p2.pose === "palm" || p2.pose === "neutral") &&
        handDistNorm > 0.12 &&
        handDistNorm < 0.55 &&
        Math.abs(p1.normY - p2.normY) < 0.18
      ) {
        const radius = Math.min(180, Math.max(30, handDistNorm * winW * 0.4));
        if (this.callbacks.onPlasmaBall) {
          this.callbacks.onPlasmaBall(center, radius);
        }
        if (Math.random() < 0.15) audioEngine.playPlasmaHum();
      }

      // D. SUIT-UP PROTOCOL (Both fists close together)
      if (
        p1.pose === "fist" &&
        p2.pose === "fist" &&
        handDistNorm < 0.28 &&
        now - this.lastSuitUpTime > 3000
      ) {
        this.lastSuitUpTime = now;
        audioEngine.playSuitUp();
        if (this.callbacks.onSuitUp) {
          this.callbacks.onSuitUp();
        }
      }

      // E. 2-HAND BIMANUAL OUTWARD EXPAND (IMAX Full Workspace Enlarge) & INWARD RESTORE
      if (
        (p1.pose === "palm" || p1.pose === "neutral") &&
        (p2.pose === "palm" || p2.pose === "neutral") &&
        !p1.isPinching &&
        !p2.isPinching
      ) {
        if (
          this.prevDualHandDist > 0 &&
          this.prevDualHandDist < 0.38 &&
          handDistNorm > 0.52 &&
          handDistNorm - this.prevDualHandDist > 0.08 &&
          now - this.lastExpandTime > 1200
        ) {
          this.lastExpandTime = now;
          audioEngine.playMaximize();
          if (this.callbacks.onCardExpand) {
            this.callbacks.onCardExpand();
          }
        } else if (
          this.prevDualHandDist > 0.52 &&
          handDistNorm < 0.35 &&
          this.prevDualHandDist - handDistNorm > 0.08 &&
          now - this.lastRestoreTime > 1200
        ) {
          this.lastRestoreTime = now;
          audioEngine.playRestore();
          if (this.callbacks.onCardRestore) {
            this.callbacks.onCardRestore();
          }
        }
      }
      this.prevDualHandDist = handDistNorm;
    }

    // Dispatch active pointers FIRST so UI and workspace can update hit testing & grab states
    if (this.callbacks.onPointers) {
      this.callbacks.onPointers(activePointers);
    }

    // Determine current gesture mode
    let mode: GestureMode = "idle";
    const primaryPose = detectedPoses[0] || "neutral";
    const pinchedPointers = activePointers.filter((p) => p.isPinching);

    if (pinchedPointers.length >= 2) {
      mode = "bimanual";
      const p1 = pinchedPointers[0];
      const p2 = pinchedPointers[1];
      const dist = Math.hypot(p1.normX - p2.normX, p1.normY - p2.normY);
      const angle = Math.atan2(p2.normY - p1.normY, p2.normX - p1.normX);

      if (this.prevZoomDist !== null && this.prevBimanualAngle !== null) {
        const scaleDelta = dist / Math.max(1e-4, this.prevZoomDist);
        const angleDelta = ((angle - this.prevBimanualAngle) * 180) / Math.PI;
        const center = {
          x: ((p1.normX + p2.normX) / 2) * winW,
          y: ((p1.normY + p2.normY) / 2) * winH,
        };

        if (this.callbacks.onBimanual) {
          this.callbacks.onBimanual(scaleDelta, angleDelta, center);
        } else {
          this.callbacks.onZoom(Math.min(1.15, Math.max(0.88, 1 / scaleDelta)));
        }
      }

      this.prevZoomDist = dist;
      this.prevBimanualAngle = angle;
    } else if (pinchedPointers.length === 1) {
      mode = "spin";
      const grab = { x: pinchedPointers[0].normX, y: pinchedPointers[0].normY };
      if (this.prevSpinGrab) {
        const deltaX = grab.x - this.prevSpinGrab.x;
        const deltaY = grab.y - this.prevSpinGrab.y;
        if (Math.abs(deltaX) > 1e-4 || Math.abs(deltaY) > 1e-4) {
          this.callbacks.onRotate(deltaX * ROTATE_SPEED, deltaY * ROTATE_SPEED);
        }
      }
      this.prevSpinGrab = grab;
      this.prevZoomDist = null;
      this.prevBimanualAngle = null;
    } else if (detectedPoses.includes("palm")) {
      mode = "explode";
      this.callbacks.onExplode(true);
    } else if (detectedPoses.includes("fist")) {
      mode = "compress";
      this.callbacks.onCompress(true);
    } else {
      if (this.prevMode === "explode") this.callbacks.onExplode(false);
      if (this.prevMode === "compress") this.callbacks.onCompress(false);
      this.prevSpinGrab = null;
      this.prevZoomDist = null;
      this.prevBimanualAngle = null;
    }

    if (mode !== this.prevMode) {
      if (mode === "explode") audioEngine.playExplode();
      else if (mode === "compress") audioEngine.playCompress();
      else if (mode === "spin" || mode === "bimanual") audioEngine.playGesture("pinch");
      this.prevMode = mode;
    }

    this.emitStatus({
      hands: landmarks.length,
      mode,
      pose: primaryPose,
      pointers: activePointers,
    });
  }

  private emitStatus(status: TrackerStatus): void {
    this.lastStatus = status;
    this.callbacks.onStatus(status);
  }

  private drawOverlay(
    landmarks: NormalizedLandmark[][],
    labels: ("Left" | "Right" | "?")[],
  ): void {
    const ctx = this.overlay.getContext("2d");
    if (!ctx) return;
    const { width, height } = this.overlay;
    ctx.clearRect(0, 0, width, height);

    landmarks.forEach((lm, i) => {
      const { pose } = this.classifyPose(lm);
      const handedness = labels[i] || "?";

      // Color scheme based on pose
      let boneColor = "rgba(0, 229, 255, 0.4)";
      let nodeColor = "#00e5ff";
      if (pose === "pinch") {
        boneColor = "rgba(255, 170, 48, 0.8)";
        nodeColor = "#ffcc66";
      } else if (pose === "scissor") {
        boneColor = "rgba(255, 0, 128, 0.9)";
        nodeColor = "#ff0080";
      } else if (pose === "comm" || pose === "tether") {
        boneColor = "rgba(0, 255, 200, 0.9)";
        nodeColor = "#00ffc8";
      } else if (pose === "overdrive") {
        boneColor = "rgba(255, 215, 0, 0.9)";
        nodeColor = "#ffd700";
      } else if (pose === "point") {
        boneColor = "rgba(0, 240, 255, 0.9)";
        nodeColor = "#00ffff";
      } else if (pose === "palm") {
        boneColor = "rgba(0, 255, 102, 0.8)";
        nodeColor = "#88ffaa";
      } else if (pose === "fist") {
        boneColor = "rgba(255, 34, 68, 0.8)";
        nodeColor = "#ff7788";
      }

      // Draw skeleton lines
      ctx.strokeStyle = boneColor;
      ctx.lineWidth = 1.6;
      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = lm[startIdx];
        const p2 = lm[endIdx];
        ctx.beginPath();
        ctx.moveTo((1 - p1.x) * width, p1.y * height);
        ctx.lineTo((1 - p2.x) * width, p2.y * height);
        ctx.stroke();
      });

      // Draw joint nodes
      lm.forEach((pt, idx) => {
        const x = (1 - pt.x) * width;
        const y = pt.y * height;
        const isTip = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP].includes(idx);
        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(x, y, isTip ? 3.5 : 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw HUD Targeting Reticle on Index Tip
      const indexTip = lm[INDEX_TIP];
      const targetX = (1 - indexTip.x) * width;
      const targetY = indexTip.y * height;

      ctx.save();
      ctx.strokeStyle = nodeColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Diamond corner reticles
      ctx.beginPath();
      ctx.moveTo(targetX - 12, targetY);
      ctx.lineTo(targetX + 12, targetY);
      ctx.moveTo(targetX, targetY - 12);
      ctx.lineTo(targetX, targetY + 12);
      ctx.stroke();

      ctx.fillStyle = nodeColor;
      ctx.font = "8px monospace";
      ctx.fillText(`${handedness} [${pose.toUpperCase()}]`, targetX + 10, targetY - 10);
      ctx.restore();
    });
  }
}

function dist2d(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
