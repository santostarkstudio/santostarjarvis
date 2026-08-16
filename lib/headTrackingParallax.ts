/**
 * STARK IRON MAN HELMET 3D PARALLAX & HEAD TRACKING ENGINE
 * Computes 3D perspective shifts from optical head orientation.
 */

export interface ParallaxState {
  yaw: number; // Left / Right rotation (deg)
  pitch: number; // Up / Down rotation (deg)
  roll: number; // Tilt (deg)
  shiftX: number; // Pixel shift X
  shiftY: number; // Pixel shift Y
  depthZ: number; // Zoom/Distance factor
  isTracking: boolean;
}

export class StarkHelmetParallax {
  private isEnabled = false;
  private currentParallax: ParallaxState = {
    yaw: 0,
    pitch: 0,
    roll: 0,
    shiftX: 0,
    shiftY: 0,
    depthZ: 1.0,
    isTracking: false,
  };
  private onParallaxChange: ((state: ParallaxState) => void) | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;

  public init(callback: (state: ParallaxState) => void) {
    this.onParallaxChange = callback;
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
    this.currentParallax = {
      yaw: 0,
      pitch: 0,
      roll: 0,
      shiftX: 0,
      shiftY: 0,
      depthZ: 1.0,
      isTracking: false,
    };
    if (this.onParallaxChange) this.onParallaxChange(this.currentParallax);
  }

  public toggle(): boolean {
    if (this.isEnabled) {
      this.disable();
      return false;
    } else {
      this.enable();
      return true;
    }
  }

  public isTrackingActive(): boolean {
    return this.isEnabled;
  }

  /**
   * Process optical camera frame and compute head orientation centroid
   */
  public processVideoFrame(video: HTMLVideoElement | null) {
    if (!this.isEnabled || !video || video.videoWidth === 0 || video.videoHeight === 0) return;

    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.width = 64; // Low res for fast 60fps processing
      this.canvas.height = 48;
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }

    if (!this.ctx) return;

    try {
      this.ctx.drawImage(video, 0, 0, 64, 48);
      const imgData = this.ctx.getImageData(0, 0, 64, 48);
      const data = imgData.data;

      // Skin tone & bright centroid detection for face position
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 64; x++) {
          const idx = (y * 64 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Face color heuristic (RGB skin balance)
          if (r > 60 && g > 40 && b > 20 && r > b && r >= g && Math.abs(r - g) > 15) {
            sumX += x;
            sumY += y;
            count++;
          }
        }
      }

      if (count > 25) {
        const centroidX = sumX / count;
        const centroidY = sumY / count;

        // Normalize between -1.0 and +1.0
        const normX = (centroidX / 32) - 1.0;
        const normY = (centroidY / 24) - 1.0;

        // Smooth damping (low pass filter)
        const targetYaw = -normX * 18.0; // Inverted for mirror camera
        const targetPitch = normY * 12.0;
        const targetShiftX = -normX * 45.0;
        const targetShiftY = normY * 35.0;

        this.currentParallax.yaw += (targetYaw - this.currentParallax.yaw) * 0.15;
        this.currentParallax.pitch += (targetPitch - this.currentParallax.pitch) * 0.15;
        this.currentParallax.shiftX += (targetShiftX - this.currentParallax.shiftX) * 0.15;
        this.currentParallax.shiftY += (targetShiftY - this.currentParallax.shiftY) * 0.15;
        this.currentParallax.isTracking = true;

        if (this.onParallaxChange) {
          this.onParallaxChange({ ...this.currentParallax });
        }
      }
    } catch {
      // Ignored
    }
  }
}

export const starkHelmetParallax = new StarkHelmetParallax();
