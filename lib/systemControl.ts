/**
 * STARK SYSTEM CONTROL & SMART ENVIRONMENT ARRAY
 * Controls brightness, audio gain, battery telemetry, and lab alert states.
 */

export interface SystemTelemetryState {
  brightness: number; // 0 to 100
  volume: number; // 0 to 100
  isMuted: boolean;
  batteryLevel: number | null;
  isCharging: boolean | null;
  labMode: "normal" | "lockdown" | "stealth" | "overdrive";
}

export class StarkSystemControl {
  private state: SystemTelemetryState = {
    brightness: 100,
    volume: 100,
    isMuted: false,
    batteryLevel: null,
    isCharging: null,
    labMode: "normal",
  };

  private listeners: ((state: SystemTelemetryState) => void)[] = [];

  constructor() {
    this.initBatteryTelemetry();
  }

  private async initBatteryTelemetry() {
    if (typeof navigator !== "undefined" && (navigator as any).getBattery) {
      try {
        const battery = await (navigator as any).getBattery();
        this.state.batteryLevel = Math.round(battery.level * 100);
        this.state.isCharging = battery.charging;
        this.notify();

        battery.addEventListener("levelchange", () => {
          this.state.batteryLevel = Math.round(battery.level * 100);
          this.notify();
        });

        battery.addEventListener("chargingchange", () => {
          this.state.isCharging = battery.charging;
          this.notify();
        });
      } catch {
        // Battery API not permitted
      }
    }
  }

  public setBrightness(percent: number): void {
    const clamped = Math.max(10, Math.min(100, percent));
    this.state.brightness = clamped;

    if (typeof document !== "undefined") {
      document.documentElement.style.filter = `brightness(${clamped / 100})`;
    }
    this.notify();
  }

  public setVolume(percent: number): void {
    const clamped = Math.max(0, Math.min(100, percent));
    this.state.volume = clamped;
    this.state.isMuted = clamped === 0;
    this.notify();
  }

  public toggleMute(): boolean {
    this.state.isMuted = !this.state.isMuted;
    this.notify();
    return this.state.isMuted;
  }

  public setLabMode(mode: "normal" | "lockdown" | "stealth" | "overdrive"): void {
    this.state.labMode = mode;
    if (mode === "stealth") {
      this.setBrightness(30);
    } else if (mode === "lockdown") {
      this.setBrightness(100);
    } else {
      this.setBrightness(100);
    }
    this.notify();
  }

  public getState(): SystemTelemetryState {
    return { ...this.state };
  }

  public subscribe(fn: (state: SystemTelemetryState) => void): () => void {
    this.listeners.push(fn);
    fn(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.getState()));
  }
}

export const starkSystemControl = new StarkSystemControl();
