import { type ForensicReport } from "./forensicScanner";

export interface SpatialTelemetry {
  label: string;
  value: string;
}

export type SpatialCardCategory =
  | "armor"
  | "reactor"
  | "satellite"
  | "neural"
  | "camera"
  | "youtube"
  | "maps"
  | "spotify"
  | "whatsapp"
  | "email"
  | "search"
  | "empty"
  | "browser"
  | "video"
  | "audio"
  | "document"
  | "code"
  | "custom";

export interface SpatialCard {
  id: string;
  title: string;
  subtitle: string;
  category: SpatialCardCategory;
  svgType?: "mark7" | "arc" | "satellite" | "neural" | "camera";
  imageSrc?: string;
  mediaSrc?: string;
  textContent?: string;
  url?: string;
  searchQuery?: string;
  forensicReport?: ForensicReport;
  isScanning?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  zIndex: number;
  isPinned: boolean;
  isGrabbed: boolean;
  grabbedByHandId?: string;
  statusTag: string;
  telemetryValues: SpatialTelemetry[];
  createdAt: number;
}

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  points: DrawPoint[];
  color: string;
  width: number;
}

export class SpatialWorkspaceEngine {
  private cards: SpatialCard[] = [];
  private strokes: DrawStroke[] = [];
  private currentStroke: DrawStroke | null = null;
  private maxZIndex = 10;
  private maximizedCardId: string | null = null;
  private onUpdateCallback: (() => void) | null = null;

  constructor() {
    this.initPresetCards();
  }

  public initPresetCards(): void {
    const isClient = typeof window !== "undefined";
    const screenW = isClient ? window.innerWidth : 1440;
    const screenH = isClient ? window.innerHeight : 900;

    const centerX = screenW / 2;
    const centerY = screenH / 2;

    this.cards = [
      {
        id: "blueprint-mark7",
        title: "MARK VII ARMOR CAD",
        subtitle: "AVENGERS SPEC // SUB-SYSTEM HUD",
        category: "armor",
        svgType: "mark7",
        x: Math.max(80, centerX - 380),
        y: Math.max(90, centerY - 220),
        width: 320,
        height: 220,
        scale: 1,
        rotation: -2,
        zIndex: 2,
        isPinned: false,
        isGrabbed: false,
        statusTag: "DIAGNOSTIC_ACTIVE",
        telemetryValues: [
          { label: "THRUST", value: "94.2 kN" },
          { label: "ALLOY", value: "GOLD-TITANIUM" },
          { label: "INTEGRITY", value: "100%" },
        ],
        createdAt: Date.now(),
      },
      {
        id: "blueprint-arc",
        title: "ARC REACTOR // LIVE 4K EARTH",
        subtitle: "GPS BEACON // ULTRA REALITY 3D",
        category: "reactor",
        svgType: "arc",
        x: Math.min(screenW - 420, centerX + 40),
        y: Math.max(90, centerY - 240),
        width: 360,
        height: 270,
        scale: 1,
        rotation: 2,
        zIndex: 3,
        isPinned: false,
        isGrabbed: false,
        statusTag: "GPS_LOCKED",
        telemetryValues: [
          { label: "ORBIT", value: "420 km LEO" },
          { label: "SPIN", value: "23.4° TILT" },
          { label: "RESOLUTION", value: "4K ULTRA" },
        ],
        createdAt: Date.now(),
      },
      {
        id: "blueprint-satellite",
        title: "STARK ORBITAL RECON",
        subtitle: "SAT_UPLINK [GEO-STATIONARY]",
        category: "satellite",
        svgType: "satellite",
        x: Math.max(80, centerX - 160),
        y: Math.min(screenH - 260, centerY + 25),
        width: 320,
        height: 200,
        scale: 0.95,
        rotation: 0,
        zIndex: 4,
        isPinned: false,
        isGrabbed: false,
        statusTag: "ORBITAL_SYNCHRONIZED",
        telemetryValues: [
          { label: "ALTITUDE", value: "35,786 km" },
          { label: "LATENCY", value: "12 ms" },
          { label: "COVERAGE", value: "GLOBAL" },
        ],
        createdAt: Date.now(),
      },
    ];
    this.notifyUpdate();
  }

  public getCards(): SpatialCard[] {
    return this.cards;
  }

  public getCardById(id: string): SpatialCard | undefined {
    return this.cards.find((c) => c.id === id);
  }

  public addCard(card: Partial<SpatialCard> & { title: string }): SpatialCard {
    this.maxZIndex++;
    const isClient = typeof window !== "undefined";
    const screenW = isClient ? window.innerWidth : 1440;
    const screenH = isClient ? window.innerHeight : 900;

    const defaultCard: SpatialCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: card.title,
      subtitle: card.subtitle || "HOLOGRAPHIC SCHEMATIC",
      category: card.category || "custom",
      svgType: card.svgType,
      imageSrc: card.imageSrc,
      mediaSrc: card.mediaSrc,
      textContent: card.textContent,
      url: card.url,
      searchQuery: card.searchQuery,
      x: card.x ?? Math.max(120, screenW / 2 - 180 + (Math.random() * 80 - 40)),
      y: card.y ?? Math.max(100, screenH / 2 - 140 + (Math.random() * 80 - 40)),
      width: card.width || 340,
      height: card.height || 230,
      scale: card.scale || 1,
      rotation: card.rotation || (Math.random() * 4 - 2),
      zIndex: this.maxZIndex,
      isPinned: card.isPinned || false,
      isGrabbed: false,
      statusTag: card.statusTag || "DEPLOYED",
      telemetryValues: card.telemetryValues || [
        { label: "STATUS", value: "ONLINE" },
        { label: "LINK", value: "STARK_NET" },
      ],
      createdAt: Date.now(),
    };

    this.cards.unshift(defaultCard);
    this.notifyUpdate();
    return defaultCard;
  }

  /**
   * Spawn App Tabs by Voice or UI (YouTube, Maps, Spotify, Camera, WhatsApp, Email, Search, Empty Tab)
   */
  public addAppTab(
    appType: "youtube" | "maps" | "spotify" | "camera" | "whatsapp" | "email" | "search" | "empty" | "browser",
    params?: { query?: string; url?: string; location?: string; x?: number; y?: number },
  ): SpatialCard {
    const isClient = typeof window !== "undefined";
    const screenW = isClient ? window.innerWidth : 1440;
    const screenH = isClient ? window.innerHeight : 900;
    const posX = params?.x ?? screenW / 2 - 190;
    const posY = params?.y ?? screenH / 2 - 150;

    switch (appType) {
      case "youtube": {
        const query = params?.query || "Iron Man HUD Jarvis UI";
        return this.addCard({
          title: "YOUTUBE CINEMA HUD",
          subtitle: `SEARCH // ${query.toUpperCase()}`,
          category: "youtube",
          searchQuery: query,
          x: posX,
          y: posY,
          width: 420,
          height: 280,
          statusTag: "STREAM_ONLINE",
          telemetryValues: [
            { label: "QUALITY", value: "4K_ULTRA" },
            { label: "BUFFER", value: "100%" },
            { label: "AUDIO", value: "DOLBY_ATMOS" },
          ],
        });
      }
      case "maps": {
        const loc = params?.location || "Manhattan, New York";
        return this.addCard({
          title: "GOOGLE MAPS // ORBITAL",
          subtitle: `GEODETIC // ${loc.toUpperCase()}`,
          category: "maps",
          searchQuery: loc,
          x: posX,
          y: posY,
          width: 420,
          height: 280,
          statusTag: "GPS_LOCKED",
          telemetryValues: [
            { label: "SAT_LOCK", value: "12 BIRDS" },
            { label: "TERRAIN", value: "3D_LIDAR" },
            { label: "GRID", value: "WGS-84" },
          ],
        });
      }
      case "spotify": {
        return this.addCard({
          title: "SPOTIFY SOUNDWAVE",
          subtitle: "STARK AUDIO MATRIX // STEREO",
          category: "spotify",
          x: posX,
          y: posY,
          width: 360,
          height: 240,
          statusTag: "AUDIO_STREAM",
          telemetryValues: [
            { label: "BITRATE", value: "320 kbps" },
            { label: "DSP", value: "HARMONIC_SURGE" },
          ],
        });
      }
      case "camera": {
        return this.addCard({
          title: "TACTICAL CAMERA HUD",
          subtitle: "SENSOR STREAM // MOTION SCAN",
          category: "camera",
          x: posX,
          y: posY,
          width: 380,
          height: 260,
          statusTag: "OPTICAL_FEED",
          telemetryValues: [
            { label: "FRAME_RATE", value: "60 FPS" },
            { label: "TARGETING", value: "AUTO_LOCK" },
          ],
        });
      }
      case "whatsapp": {
        return this.addCard({
          title: "WHATSAPP // COMMS HUD",
          subtitle: "TACTICAL MESSAGING RELAY",
          category: "whatsapp",
          x: posX,
          y: posY,
          width: 360,
          height: 250,
          statusTag: "ENCRYPTED_SIGNAL",
          telemetryValues: [
            { label: "CIPHER", value: "RSA-4096" },
            { label: "PEERS", value: "CONNECTED" },
          ],
        });
      }
      case "email": {
        return this.addCard({
          title: "STARK INBOX // DISPATCH",
          subtitle: "PRIORITY ENCRYPTED COMM",
          category: "email",
          x: posX,
          y: posY,
          width: 380,
          height: 250,
          statusTag: "INBOX_SYNCED",
          telemetryValues: [
            { label: "UNREAD", value: "3 PRIORITY" },
            { label: "CLEARANCE", value: "LEVEL_10" },
          ],
        });
      }
      case "search": {
        const q = params?.query || "Quantum Computing";
        return this.addCard({
          title: "GOOGLE KNOWLEDGE HUD",
          subtitle: `QUERY // ${q.toUpperCase()}`,
          category: "search",
          searchQuery: q,
          x: posX,
          y: posY,
          width: 400,
          height: 270,
          statusTag: "AI_SEARCH_ACTIVE",
          telemetryValues: [
            { label: "SOURCES", value: "48 INDEXED" },
            { label: "LATENCY", value: "0.04s" },
          ],
        });
      }
      case "browser": {
        const url = params?.url || "https://en.wikipedia.org";
        return this.addCard({
          title: "STARK BROWSER // WEB",
          subtitle: url.replace(/^https?:\/\//, ""),
          category: "browser",
          url,
          x: posX,
          y: posY,
          width: 440,
          height: 300,
          statusTag: "WEB_UPLINK",
          telemetryValues: [
            { label: "PROTOCOL", value: "HTTPS_SECURE" },
            { label: "RENDER", value: "CHROMIUM" },
          ],
        });
      }
      case "empty":
      default: {
        return this.addCard({
          title: "NEW WORKSPACE TAB",
          subtitle: "SCRATCHPAD // APP LAUNCHER",
          category: "empty",
          x: posX,
          y: posY,
          width: 360,
          height: 240,
          statusTag: "READY",
          telemetryValues: [
            { label: "BUFFER", value: "EMPTY" },
            { label: "STYLUS", value: "ENGAGED" },
          ],
        });
      }
    }
  }

  /**
   * Ingest any dropped file (Images, Videos, Code, Audio, PDF, Archives)
   */
  public async ingestFile(file: File, dropCoords?: { x: number; y: number }): Promise<SpatialCard> {
    const isClient = typeof window !== "undefined";
    const screenW = isClient ? window.innerWidth : 1440;
    const screenH = isClient ? window.innerHeight : 900;
    const posX = dropCoords?.x ?? screenW / 2 - 180;
    const posY = dropCoords?.y ?? screenH / 2 - 130;
    const cleanName = file.name.toUpperCase().replace(/\.[^/.]+$/, "");
    const sizeKb = Math.round(file.size / 1024);

    if (file.type.startsWith("image/")) {
      const src = await this.readFileAsDataUrl(file);
      return this.addCard({
        title: cleanName,
        subtitle: `PHOTO // ${sizeKb} KB · ${file.type.split("/")[1]?.toUpperCase()}`,
        category: "custom",
        imageSrc: src,
        x: posX,
        y: posY,
        statusTag: "IMAGE_INGESTED",
        telemetryValues: [
          { label: "FORMAT", value: file.type.split("/")[1]?.toUpperCase() || "IMG" },
          { label: "SIZE", value: `${sizeKb} KB` },
        ],
      });
    }

    if (file.type.startsWith("video/")) {
      const src = URL.createObjectURL(file);
      return this.addCard({
        title: cleanName,
        subtitle: `VIDEO CINEMA // ${sizeKb} KB`,
        category: "video",
        mediaSrc: src,
        x: posX,
        y: posY,
        width: 420,
        height: 280,
        statusTag: "VIDEO_INGESTED",
        telemetryValues: [
          { label: "CODEC", value: file.type.split("/")[1]?.toUpperCase() || "H.264" },
          { label: "SIZE", value: `${sizeKb} KB` },
        ],
      });
    }

    if (file.type.startsWith("audio/")) {
      const src = URL.createObjectURL(file);
      return this.addCard({
        title: cleanName,
        subtitle: `AUDIO TRACK // ${sizeKb} KB`,
        category: "audio",
        mediaSrc: src,
        x: posX,
        y: posY,
        width: 360,
        height: 220,
        statusTag: "AUDIO_INGESTED",
        telemetryValues: [
          { label: "FORMAT", value: file.type.split("/")[1]?.toUpperCase() || "AUDIO" },
          { label: "SIZE", value: `${sizeKb} KB` },
        ],
      });
    }

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const src = URL.createObjectURL(file);
      return this.addCard({
        title: cleanName,
        subtitle: `PDF DOCUMENT // ${sizeKb} KB`,
        category: "document",
        mediaSrc: src,
        x: posX,
        y: posY,
        width: 400,
        height: 280,
        statusTag: "PDF_INGESTED",
        telemetryValues: [
          { label: "TYPE", value: "PDF_DOCUMENT" },
          { label: "SIZE", value: `${sizeKb} KB` },
        ],
      });
    }

    // Default: Read as text/code file
    try {
      const text = await this.readFileAsText(file);
      const isCode = /\.(js|ts|tsx|jsx|py|cpp|c|json|html|css|rs|go|sql|sh)$/i.test(file.name);
      return this.addCard({
        title: cleanName,
        subtitle: `${isCode ? "SOURCE CODE" : "TEXT DOCUMENT"} // ${sizeKb} KB`,
        category: isCode ? "code" : "document",
        textContent: text,
        x: posX,
        y: posY,
        width: 400,
        height: 260,
        statusTag: isCode ? "CODE_PARSED" : "DOC_PARSED",
        telemetryValues: [
          { label: "LINES", value: `${text.split("\n").length}` },
          { label: "WORDS", value: `${text.split(/\s+/).filter(Boolean).length}` },
        ],
      });
    } catch {
      return this.addCard({
        title: cleanName,
        subtitle: `DATA ARCHIVE // ${sizeKb} KB`,
        category: "custom",
        x: posX,
        y: posY,
        statusTag: "BINARY_DATA",
        telemetryValues: [
          { label: "TYPE", value: "BINARY_ARCHIVE" },
          { label: "SIZE", value: `${sizeKb} KB` },
        ],
      });
    }
  }

  /**
   * Ingest external browser URL dropped from Chrome/Edge tabs
   */
  public ingestUrl(url: string, dropCoords?: { x: number; y: number }): SpatialCard {
    return this.addAppTab("browser", { url, x: dropCoords?.x, y: dropCoords?.y });
  }

  public setCardScanning(cardId: string, isScanning: boolean): void {
    const card = this.cards.find((c) => c.id === cardId);
    if (card) {
      card.isScanning = isScanning;
      this.notifyUpdate();
    }
  }

  public attachForensicReport(cardId: string, report: ForensicReport): void {
    const card = this.cards.find((c) => c.id === cardId);
    if (card) {
      card.forensicReport = report;
      card.isScanning = false;
      card.statusTag = `VERDICT_${report.verdict}`;
      this.notifyUpdate();
    }
  }

  public updateCard(id: string, updates: Partial<SpatialCard>): void {
    const idx = this.cards.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.cards[idx] = { ...this.cards[idx], ...updates };
      this.notifyUpdate();
    }
  }

  public removeCard(id: string): void {
    this.cards = this.cards.filter((c) => c.id !== id);
    this.notifyUpdate();
  }

  public bringToFront(id: string): void {
    this.maxZIndex++;
    this.updateCard(id, { zIndex: this.maxZIndex });
  }

  public togglePin(id: string): void {
    const card = this.cards.find((c) => c.id === id);
    if (card) {
      this.updateCard(id, { isPinned: !card.isPinned });
    }
  }

  // ——— FULL-WORKSPACE ENLARGE & FOCUS (IMAX HUD) ———
  public getMaximizedCardId(): string | null {
    return this.maximizedCardId;
  }

  public isCardMaximized(id: string): boolean {
    return this.maximizedCardId === id;
  }

  public toggleMaximizeCard(id: string): boolean {
    if (this.maximizedCardId === id) {
      this.maximizedCardId = null;
    } else {
      this.maximizedCardId = id;
      this.bringToFront(id);
    }
    this.notifyUpdate();
    return this.maximizedCardId !== null;
  }

  public restoreWorkspace(): void {
    if (this.maximizedCardId) {
      this.maximizedCardId = null;
      this.notifyUpdate();
    }
  }

  public hitTestCard(x: number, y: number): SpatialCard | null {
    const sorted = [...this.cards].sort((a, b) => b.zIndex - a.zIndex);
    for (const card of sorted) {
      const cardW = card.width * card.scale;
      const cardH = card.height * card.scale;
      if (x >= card.x && x <= card.x + cardW && y >= card.y && y <= card.y + cardH) {
        return card;
      }
    }
    return null;
  }

  // ——— AIR DRAWING ———
  public getDrawStrokes(): DrawStroke[] {
    return this.strokes;
  }

  public addDrawPoint(pt: DrawPoint, isNewStroke = false, color = "#00e5ff", width = 3): void {
    if (isNewStroke || !this.currentStroke) {
      this.currentStroke = {
        id: `stroke_${Date.now()}_${Math.random()}`,
        points: [pt],
        color,
        width,
      };
      this.strokes.push(this.currentStroke);
    } else {
      this.currentStroke.points.push(pt);
    }
    this.notifyUpdate();
  }

  public endCurrentStroke(): void {
    this.currentStroke = null;
  }

  public clearDrawings(): void {
    this.strokes = [];
    this.currentStroke = null;
    this.notifyUpdate();
  }

  public resetWorkspace(): void {
    this.initPresetCards();
    this.clearDrawings();
  }

  public setUpdateListener(cb: () => void): void {
    this.onUpdateCallback = cb;
  }

  private notifyUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

export const spatialWorkspace = new SpatialWorkspaceEngine();
