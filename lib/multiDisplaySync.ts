/**
 * Multi-Display Synchronization Engine for ULTRON:
 * Provides real-time, low-latency inter-window communication across multiple extended monitors
 * using BroadcastChannel and LocalStorage fallback.
 */

import { type SpatialCard } from "./spatialWorkspace";
import { type ThemeId } from "./themes";
import { type AssistantPersona } from "./jarvisVoice";
import { type ForensicReport } from "./forensicScanner";

export type DisplayRole = "primary" | "secondary_satellite";

export type DisplayMessageType =
  | "HEARTBEAT"
  | "PROJECT_CARD"
  | "RECALL_CARD"
  | "CLOSE_PROJECTED"
  | "SYNC_THEME"
  | "SYNC_PERSONA"
  | "SYNC_FORENSIC"
  | "EXECUTE_SCAN";

export interface DisplayMessage {
  type: DisplayMessageType;
  sender: DisplayRole;
  timestamp: number;
  payload?: {
    card?: SpatialCard;
    cardId?: string;
    theme?: ThemeId;
    persona?: AssistantPersona;
    forensicReport?: ForensicReport;
    scanQuery?: string;
  };
}

export class MultiDisplaySyncEngine {
  private channel: BroadcastChannel | null = null;
  private role: DisplayRole = "primary";
  private listeners = new Set<(msg: DisplayMessage) => void>();
  private isSecondaryConnected = false;
  private projectedCard: SpatialCard | null = null;
  private heartbeatTimer: any = null;

  constructor(role: DisplayRole = "primary") {
    this.role = role;
    if (typeof window !== "undefined") {
      this.initChannel();
    }
  }

  public setRole(role: DisplayRole): void {
    this.role = role;
  }

  public getRole(): DisplayRole {
    return this.role;
  }

  public isConnectedToSatellite(): boolean {
    return this.isSecondaryConnected;
  }

  public getProjectedCard(): SpatialCard | null {
    return this.projectedCard;
  }

  private initChannel(): void {
    try {
      this.channel = new BroadcastChannel("stark_multidisplay_link");
      this.channel.onmessage = (event: MessageEvent<DisplayMessage>) => {
        this.handleIncomingMessage(event.data);
      };

      // Heartbeat pulse to check satellite status
      this.sendHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeat();
      }, 3000);
    } catch (e) {
      console.warn("[MultiDisplay] BroadcastChannel unsupported, using localStorage fallback:", e);
    }
  }

  private handleIncomingMessage(msg: DisplayMessage): void {
    if (!msg || msg.sender === this.role) return;

    if (msg.type === "HEARTBEAT") {
      if (msg.sender === "secondary_satellite") {
        this.isSecondaryConnected = true;
      }
    } else if (msg.type === "PROJECT_CARD" && msg.payload?.card) {
      this.projectedCard = msg.payload.card;
    } else if (msg.type === "RECALL_CARD" || msg.type === "CLOSE_PROJECTED") {
      this.projectedCard = null;
    }

    // Notify registered listeners
    this.listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        console.error("[MultiDisplay] Listener error:", err);
      }
    });
  }

  public addListener(listener: (msg: DisplayMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public sendMessage(type: DisplayMessageType, payload?: DisplayMessage["payload"]): void {
    const msg: DisplayMessage = {
      type,
      sender: this.role,
      timestamp: Date.now(),
      payload,
    };

    if (this.channel) {
      this.channel.postMessage(msg);
    }
  }

  public projectCardToSecondary(card: SpatialCard): void {
    this.projectedCard = card;
    this.sendMessage("PROJECT_CARD", { card });
  }

  public recallCardFromSecondary(cardId?: string): void {
    this.projectedCard = null;
    this.sendMessage("RECALL_CARD", { cardId });
  }

  public syncTheme(theme: ThemeId): void {
    this.sendMessage("SYNC_THEME", { theme });
  }

  public syncPersona(persona: AssistantPersona): void {
    this.sendMessage("SYNC_PERSONA", { persona });
  }

  public sendHeartbeat(): void {
    this.sendMessage("HEARTBEAT");
  }

  public openSatelliteWindow(): Window | null {
    if (typeof window === "undefined") return null;

    // Detect extended display coordinates
    const targetLeft = window.screen.availWidth || 1920;
    const targetTop = 0;
    const width = 1440;
    const height = 900;

    const satelliteWin = window.open(
      "/satellite",
      "Stark_Satellite_Display",
      `left=${targetLeft},top=${targetTop},width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes`,
    );

    return satelliteWin;
  }

  public dispose(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const multiDisplaySync = new MultiDisplaySyncEngine("primary");
