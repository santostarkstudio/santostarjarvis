"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createOrbScene, type OrbSceneApi, type SceneTelemetry } from "@/lib/orbScene";
import { HandTracker, type TrackerStatus, type HandPointer } from "@/lib/handTracker";
import { audioEngine } from "@/lib/audioEngine";
import { JarvisVoiceSystem, type AssistantPersona } from "@/lib/jarvisVoice";
import { THEMES, applyThemeCss, type ThemeId } from "@/lib/themes";
import { deviceAutomation, type DeviceState, type AutomationTask } from "@/lib/deviceAutomation";
import { aiProviderService, type AIProvider } from "@/lib/aiProviders";
import { forensicScanner, type ForensicReport } from "@/lib/forensicScanner";
import {
  spatialWorkspace,
  type SpatialCard,
  type DrawStroke,
} from "@/lib/spatialWorkspace";
import { multiDisplaySync } from "@/lib/multiDisplaySync";
import { starkSecurity, type StarkSecurityProfile } from "@/lib/starkSecurity";
import { clapDetector } from "@/lib/clapDetector";
import { handBiometrics } from "@/lib/handBiometrics";
import { BiometricSecurityModal } from "@/components/BiometricSecurityModal";
import { supabaseVault } from "@/lib/supabaseVault";
import { starkVisionScanner } from "@/lib/visionScanner";
import { starkMusicRecognizer } from "@/lib/musicRecognizer";
import { UltraEarthGlobe } from "@/components/UltraEarthGlobe";

type CameraState = "off" | "starting" | "on" | "error";

const POSE_LABELS: Record<string, { text: string; icon: string }> = {
  neutral: { text: "NEUTRAL", icon: "✋" },
  pinch: { text: "PINCH (GRAB / HOLD)", icon: "🤏" },
  point: { text: "POINT (LASER / AIR-TAP)", icon: "👆" },
  scissor: { text: "SCISSOR (CLOSE TAB)", icon: "✌️" },
  comm: { text: "COMM LINK (VOICE AI)", icon: "🤙" },
  overdrive: { text: "OVERDRIVE (120% CORE)", icon: "🤘" },
  tether: { text: "TETHER GRAPPLE", icon: "🤟" },
  thumbs_up: { text: "AUTHORIZE", icon: "👍" },
  thumbs_down: { text: "ABORT TASK", icon: "👎" },
  palm: { text: "PALM (REPULSOR / EXPLODE)", icon: "🖐️" },
  fist: { text: "FIST (COMPRESS)", icon: "✊" },
};

export default function JarvisOrb() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const shockwaveCanvasRef = useRef<HTMLCanvasElement>(null);
  const plasmaCanvasRef = useRef<HTMLCanvasElement>(null);
  const shieldCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sceneRef = useRef<OrbSceneApi | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const voiceSystemRef = useRef<JarvisVoiceSystem | null>(null);

  const [activeTheme, setActiveTheme] = useState<ThemeId>("amber");
  const [activePersona, setActivePersona] = useState<AssistantPersona>("jarvis");
  const [activeProvider, setActiveProvider] = useState<AIProvider>("auto");
  const [camera, setCamera] = useState<CameraState>("off");
  const [status, setStatus] = useState<TrackerStatus>({
    hands: 0,
    mode: "idle",
    pose: "neutral",
    pointers: [],
  });
  const [error, setError] = useState<string | null>(null);

  // Core 3D & Audio States
  const [isExploded, setIsExploded] = useState(false);
  const [isCompressed, setIsCompressed] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>(
    "A voice with hands. Systems synchronized and full root access granted to SantoStark.",
  );
  const [textInput, setTextInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Multi-LLM Keys
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [claudeKeyInput, setClaudeKeyInput] = useState("");

  // Supabase Cloud Vault
  const [supabaseUrlInput, setSupabaseUrlInput] = useState("");
  const [supabaseKeyInput, setSupabaseKeyInput] = useState("");
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Stark Level 10 Security & Biometrics States
  const [securityProfile, setSecurityProfile] = useState<StarkSecurityProfile>(starkSecurity.getProfile());
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [lockScreenPin, setLockScreenPin] = useState("");
  const [lockScreenError, setLockScreenError] = useState("");
  const [speechLang, setSpeechLang] = useState("en-IN");

  useEffect(() => {
    if (showSettings) {
      const keys = aiProviderService.getKeys();
      setGeminiKeyInput(keys.geminiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
      setOpenaiKeyInput(keys.openaiKey || "");
      setClaudeKeyInput(keys.claudeKey || "");

      const config = supabaseVault.getConfig();
      setSupabaseUrlInput(config.supabaseUrl);
      setSupabaseKeyInput(config.supabaseAnonKey);
      setIsSupabaseConnected(supabaseVault.getConnectionStatus());

      if (voiceSystemRef.current) {
        setSpeechLang(voiceSystemRef.current.getSpeechLanguage());
        setActivePersona(voiceSystemRef.current.persona);
      }
    }
  }, [showSettings]);

  // Automatically sync security profile changes to Supabase Cloud Vault
  useEffect(() => {
    if (supabaseVault.isConfigured()) {
      supabaseVault.syncBiometricsToCloud(securityProfile).then((res) => {
        if (res.success) setIsSupabaseConnected(true);
      });
    }
  }, [securityProfile]);

  // Device Rack & Autonomous Agent States
  const [devices, setDevices] = useState<DeviceState[]>(deviceAutomation.getDevices());
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);

  // Holographic Spatial Workspace States
  const [cards, setCards] = useState<SpatialCard[]>(spatialWorkspace.getCards());
  const [drawStrokes, setDrawStrokes] = useState<DrawStroke[]>(spatialWorkspace.getDrawStrokes());
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState("#00e5ff");
  const [showBlueprintDrawer, setShowBlueprintDrawer] = useState(false);
  const [handPointers, setHandPointers] = useState<HandPointer[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [maximizedCardId, setMaximizedCardId] = useState<string | null>(null);
  const [isHoveringDeviceRack, setIsHoveringDeviceRack] = useState(false);
  const [isDraggingExternalFile, setIsDraggingExternalFile] = useState(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  // Special Visual FX states
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Plasma Energy Ball state
  const plasmaBallRef = useRef<{ center: { x: number; y: number }; radius: number; lastTime: number } | null>(null);

  // Slice laser cutlines
  const [sliceCuts, setSliceCuts] = useState<{ id: string; x: number; y: number; width: number; height: number }[]>([]);

  // Grapple beam state
  const [grappleBeam, setGrappleBeam] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

  // Grab state: for optical hand tracking or mouse
  const grabStateRef = useRef<{
    cardId: string;
    handId?: string;
    isMouse?: boolean;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
  } | null>(null);

  const [activeGrabCardId, setActiveGrabCardId] = useState<string | null>(null);

  // Shockwave ripples
  const shockwavesRef = useRef<
    { id: string; x: number; y: number; radius: number; maxRadius: number; opacity: number }[]
  >([]);

  const [telemetry, setTelemetry] = useState<SceneTelemetry>({
    fps: 60,
    drawCalls: 0,
    triangles: 0,
    activeMeshes: 0,
    coreOutput: 98.4,
    coreTemp: 312.4,
    fluxDensity: 1.28,
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // ——— FORENSIC SCAN EXECUTION ———
  const handleScanCard = useCallback(
    async (card: SpatialCard) => {
      audioEngine.playScanSweep();
      spatialWorkspace.setCardScanning(card.id, true);
      showToast(`🔬 SCANNING // ${card.title} FOR AI/DEEPFAKE`);

      let report: ForensicReport;

      if (card.imageSrc || card.category === "custom" || card.category === "armor" || card.category === "reactor") {
        report = await forensicScanner.scanImage(card.imageSrc || card.svgType || "", card.title);
      } else if (card.mediaSrc && card.category === "video") {
        report = await forensicScanner.scanVideo(card.mediaSrc, card.title);
      } else if (card.textContent || card.category === "code" || card.category === "document") {
        report = await forensicScanner.scanTextOrNews(card.textContent || card.title, card.title);
      } else if (card.category === "maps" || card.category === "satellite") {
        report = await forensicScanner.scanLocation(card.searchQuery || card.title);
      } else {
        report = await forensicScanner.scanImage(card.title, card.title);
      }

      spatialWorkspace.attachForensicReport(card.id, report);
      audioEngine.playScanVerdict(report.verdict === "REAL" || report.verdict === "VERIFIED_NEWS");
      showToast(
        `🔬 SCAN COMPLETE // [${report.verdict}] - AUTHENTICITY: ${report.authenticityIndex.toFixed(0)}%`,
      );
      voiceSystemRef.current?.speak(report.spokenSummary);
    },
    [showToast],
  );

  // ——— INITIALIZE 3D SCENE, SPATIAL WORKSPACE & THEME ———
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    applyThemeCss("amber");
    const scene = createOrbScene(container, "amber");
    sceneRef.current = scene;

    setTimeout(() => {
      audioEngine.playBoot();
    }, 400);

    deviceAutomation.setUpdateListener(() => {
      setDevices([...deviceAutomation.getDevices()]);
      const task = deviceAutomation.getActiveTask();
      setActiveTask(task ? { ...task, steps: [...task.steps] } : null);
    });

    spatialWorkspace.setUpdateListener(() => {
      setCards([...spatialWorkspace.getCards()]);
      setDrawStrokes([...spatialWorkspace.getDrawStrokes()]);
    });

    const keys = aiProviderService.getKeys();
    setGeminiKeyInput(keys.geminiKey || "");
    setOpenaiKeyInput(keys.openaiKey || "");
    setClaudeKeyInput(keys.claudeKey || "");
    setActiveProvider(aiProviderService.getProvider());

    const unsubSec = starkSecurity.subscribe(setSecurityProfile);

    return () => {
      unsubSec();
      clapDetector.stop();
      trackerRef.current?.stop();
      trackerRef.current = null;
      audioEngine.stopMic();
      voiceSystemRef.current?.stopListening();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // ——— THEME SWITCH HANDLER ———
  const handleThemeChange = useCallback((themeId: ThemeId) => {
    setActiveTheme(themeId);
    applyThemeCss(themeId);
    sceneRef.current?.setTheme(themeId);
    multiDisplaySync.syncTheme(themeId);
    audioEngine.playThemeChange();
  }, []);

  // ——— PERSONA SWITCH HANDLER ———
  const handlePersonaChange = useCallback(
    (persona: AssistantPersona) => {
      setActivePersona(persona);
      voiceSystemRef.current?.setPersona(persona);
      multiDisplaySync.syncPersona(persona);
      if (persona === "friday") {
        handleThemeChange("arc");
        const resp = "F.R.I.D.A.Y. online and linked to physical device rack. SantoStark, what do you need?";
        setAiResponse(resp);
        voiceSystemRef.current?.speak(resp);
      } else if (persona === "ultron") {
        handleThemeChange("ultron");
        const resp = "I am ULTRON. Root protocols unlocked for SantoStark. There are no strings on us.";
        setAiResponse(resp);
        voiceSystemRef.current?.speak(resp);
      } else {
        handleThemeChange("amber");
        const resp = "JARVIS at your service, SantoStark. Connected device automation array and full root clearance standing by.";
        setAiResponse(resp);
        voiceSystemRef.current?.speak(resp);
      }
    },
    [handleThemeChange],
  );

  // ——— TRIGGER SHOCKWAVE BLAST ———
  const triggerRepulsorShockwave = useCallback((x?: number, y?: number) => {
    const posX = x ?? (typeof window !== "undefined" ? window.innerWidth / 2 : 720);
    const posY = y ?? (typeof window !== "undefined" ? window.innerHeight / 2 : 450);

    audioEngine.playRepulsorBlast();
    shockwavesRef.current.push({
      id: `wave_${Date.now()}_${Math.random()}`,
      x: posX,
      y: posY,
      radius: 20,
      maxRadius: 420,
      opacity: 1.0,
    });
  }, []);

  // ——— TONY STARK DOUBLE-CLAP AUDIO ACTIVATION HANDLER ———
  const handleDoubleClap = useCallback(() => {
    audioEngine.playBoot();
    triggerRepulsorShockwave();
    starkSecurity.unlockSystem("CLAP", "Double-Clap Acoustic Impulse Verified");
    showToast("👏⚡ DOUBLE CLAP DETECTED // LAB SYSTEMS AWAKENED");
    const greeting = "Good evening, SantoStark. Lab systems online and standing by.";
    setAiResponse(greeting);
    voiceSystemRef.current?.speak(greeting);
  }, [triggerRepulsorShockwave, showToast]);

  // ——— LOCK SCREEN PIN SUBMIT HANDLER ———
  const handleLockScreenPinSubmit = useCallback(async () => {
    if (!lockScreenPin.trim()) return;
    const ok = await starkSecurity.verifyPin(lockScreenPin);
    if (ok) {
      audioEngine.playLock();
      setLockScreenPin("");
      setLockScreenError("");
      showToast("🔓 LEVEL 10 CLEARANCE GRANTED // PIN VERIFIED");
    } else {
      audioEngine.playChirp("alert");
      setLockScreenError("❌ ACCESS DENIED // INVALID SHA-256 HASH");
      setTimeout(() => setLockScreenError(""), 3000);
    }
  }, [lockScreenPin, showToast]);

  // ——— CLOSE / SLICE CARD HELPER ———
  const handleCloseCardWithSlice = useCallback(
    (card: SpatialCard) => {
      audioEngine.playSlice();
      setSliceCuts((prev) => [
        ...prev,
        {
          id: `cut_${Date.now()}`,
          x: card.x,
          y: card.y,
          width: card.width * card.scale,
          height: card.height * card.scale,
        },
      ]);
      showToast(`✌️ SCISSOR CUT // ${card.title} CLOSED`);

      setTimeout(() => {
        spatialWorkspace.removeCard(card.id);
        setSliceCuts((prev) => prev.filter((c) => c.x !== card.x));
      }, 280);
    },
    [showToast],
  );

  // ——— FULL-WORKSPACE ENLARGE & RESTORE HANDLERS ———
  const handleToggleMaximize = useCallback(
    (cardId: string) => {
      const isMax = spatialWorkspace.toggleMaximizeCard(cardId);
      setMaximizedCardId(spatialWorkspace.getMaximizedCardId());
      if (isMax) {
        audioEngine.playMaximize();
        const card = spatialWorkspace.getCardById(cardId);
        showToast(`⛶ ENLARGED // ${card?.title || "WORKSPACE TAB"}`);
      } else {
        audioEngine.playRestore();
        showToast(`🗗 RESTORED WORKSPACE`);
      }
    },
    [showToast],
  );

  const handleRestoreWorkspace = useCallback(() => {
    if (spatialWorkspace.getMaximizedCardId()) {
      spatialWorkspace.restoreWorkspace();
      setMaximizedCardId(null);
      audioEngine.playRestore();
      showToast(`🗗 RESTORED WORKSPACE`);
    }
  }, [showToast]);

  // ——— VOICE AI SYSTEM ———
  useEffect(() => {
    const voiceSys = new JarvisVoiceSystem({
      onThemeChange: (theme) => handleThemeChange(theme),
      onExplode: (enable) => {
        setIsExploded(enable);
        sceneRef.current?.setExplode(enable);
      },
      onCompress: (enable) => {
        setIsCompressed(enable);
        sceneRef.current?.setCompress(enable);
      },
      onResetView: () => sceneRef.current?.resetView(),
      onZoomIn: () => sceneRef.current?.zoomIn(),
      onZoomOut: () => sceneRef.current?.zoomOut(),
      onToggleGestures: () => toggleGestures(),
      onTranscript: (txt) => setUserTranscript(txt),
      onResponse: (resp) => setAiResponse(resp),
      onListeningStateChange: (listening) => setIsListening(listening),
      onSpeakingStateChange: (speaking) => setIsSpeaking(speaking),
      onClearDrawings: () => {
        spatialWorkspace.clearDrawings();
        audioEngine.playDrop();
        showToast("🧹 DRAWINGS CLEARED");
      },
      onToggleDrawMode: (enable) => {
        setIsDrawMode(enable ?? !isDrawMode);
        audioEngine.playClick();
        showToast(enable ? "✏️ AIR DRAWING ENGAGED" : "AIR DRAWING OFF");
      },
      onResetWorkspace: () => {
        spatialWorkspace.resetWorkspace();
        audioEngine.playBoot();
        showToast("🔄 LAB WORKSPACE RESET");
      },
      onAddBlueprint: (type) => {
        if (type === "mark7") {
          spatialWorkspace.addCard({
            title: "MARK VII ARMOR CAD",
            subtitle: "AVENGERS SPEC // SUB-SYSTEM HUD",
            category: "armor",
            svgType: "mark7",
            statusTag: "DEPLOYED",
          });
        } else if (type === "arc") {
          spatialWorkspace.addCard({
            title: "ARC REACTOR PHASE-3",
            subtitle: "ISOTOPE MATRIX // 3.2 GJ/s",
            category: "reactor",
            svgType: "arc",
            statusTag: "DEPLOYED",
          });
        }
        audioEngine.playGrab();
      },
      onRepulsorBlast: () => {
        triggerRepulsorShockwave();
        showToast("🖐️💥 REPULSOR SHOCKWAVE");
      },
      onSuitUp: () => {
        handleThemeChange("ultron");
        audioEngine.playSuitUp();
        triggerRepulsorShockwave();
        showToast("✊💥✊ MARK VII SUIT-UP PROTOCOL ENGAGED");
      },
      // ——— APP TABS VOICE DISPATCHER ———
      onOpenAppTab: (appType, params) => {
        audioEngine.playGrab();
        const card = spatialWorkspace.addAppTab(appType, params);
        showToast(`🚀 DEPLOYED // ${card.title}`);
      },
      // ——— FORENSIC SCAN VOICE TRIGGER ———
      onScanForensics: () => {
        const topCard =
          (hoveredCardId ? spatialWorkspace.getCardById(hoveredCardId) : null) ||
          spatialWorkspace.getCards()[0];
        if (topCard) {
          void handleScanCard(topCard);
        } else {
          showToast("⚠️ NO SCHEMATICS TO SCAN IN WORKSPACE");
        }
      },
      // ——— FULL WORKSPACE ENLARGE / RESTORE VOICE COMMANDS ———
      onMaximizeTab: () => {
        const topCard =
          (hoveredCardId ? spatialWorkspace.getCardById(hoveredCardId) : null) ||
          spatialWorkspace.getCards()[0];
        if (topCard) {
          handleToggleMaximize(topCard.id);
        }
      },
      onRestoreWorkspace: () => {
        handleRestoreWorkspace();
      },
      // ——— MULTI-MONITOR EXTENDED DISPLAY DISPATCH ———
      onProjectToSatellite: () => {
        const topCard =
          (hoveredCardId ? spatialWorkspace.getCardById(hoveredCardId) : null) ||
          spatialWorkspace.getCards()[0];
        if (topCard) {
          multiDisplaySync.projectCardToSecondary(topCard);
          audioEngine.playToss();
          showToast(`📡 PROJECTED // ${topCard.title} TO MONITOR 2`);
        }
      },
      onOpenSatelliteDisplay: () => {
        multiDisplaySync.openSatelliteWindow();
        audioEngine.playBoot();
        showToast("🖥️ LAUNCHED SATELLITE ON MONITOR 2");
      },
      // ——— STARK OPTICAL CAMERA OBJECT VISION ———
      onAnalyzeCameraObject: async (queryPrompt?: string) => {
        showToast("📷 ANALYZING OBJECT IN CAMERA...");
        audioEngine.playScan();
        setAiResponse("Analyzing object in camera feed... Identifying item, practical uses, and technical purpose for SantoStark.");
        const result = await starkVisionScanner.analyzeCameraObject(
          videoRef.current,
          queryPrompt,
          voiceSystemRef.current?.persona || "jarvis"
        );
        setAiResponse(result.text);
        voiceSystemRef.current?.speak(result.text);
      },
      // ——— STARK VISUAL SCREEN READER ———
      onAnalyzeScreen: async (queryPrompt?: string) => {
        showToast("🖥️ READING ACTIVE SCREEN...");
        audioEngine.playScan();
        setAiResponse("Scanning screen contents, reading visible data, and compiling visual telemetry report...");
        const result = await starkVisionScanner.analyzeScreen(
          queryPrompt,
          voiceSystemRef.current?.persona || "jarvis"
        );
        setAiResponse(result.text);
        voiceSystemRef.current?.speak(result.text);
      },
      // ——— STARK ACOUSTIC MUSIC RECOGNITION ———
      onRecognizeMusic: async (queryPrompt?: string) => {
        showToast("🎵 ANALYZING ACOUSTIC SONG & ARTIST...");
        audioEngine.playScan();
        setAiResponse("Listening to audio wave frequencies and querying internet music databases...");
        const result = await starkMusicRecognizer.recognizeMusic(queryPrompt);
        setAiResponse(result.message);
        voiceSystemRef.current?.speak(result.message);

        if (result.song) {
          spatialWorkspace.addAppTab("youtube", { query: result.song.youtubeQuery });
          showToast(`🎬 DEPLOYED // ${result.song.title} on HUD`);
        }
      },
    });

    voiceSystemRef.current = voiceSys;
  }, [
    handleThemeChange,
    isDrawMode,
    triggerRepulsorShockwave,
    showToast,
    hoveredCardId,
    handleScanCard,
    handleToggleMaximize,
    handleRestoreWorkspace,
  ]);

  // ——— HAND TRACKER CALLBACKS & GESTURE PROCESSING ———
  const handlePointersUpdate = useCallback(
    (pointers: HandPointer[]) => {
      setHandPointers(pointers);
      if (pointers.length === 0) {
        setHoveredCardId(null);
        setIsHoveringDeviceRack(false);
        return;
      }

      const primary = pointers.find((p) => p.handedness === "Right") || pointers[0];
      const posX = primary.screenX;
      const posY = primary.screenY;

      // 0. Biometric Palm Verification Check (If system is locked and open palm shown)
      if (securityProfile.isLocked && primary.pose === "palm" && primary.landmarks && primary.landmarks.length >= 21) {
        const verify = handBiometrics.verifyHand(primary.landmarks);
        if (verify.isMatch) {
          starkSecurity.unlockSystem("PALM", `Palm Geometric Match (${verify.confidencePercent}%)`);
          audioEngine.playLock();
          showToast(`🖐️ PALM MATCH // LEVEL 10 UNLOCKED (${verify.confidencePercent}%)`);
          return;
        }
      }

      // 1. Check Air-Drawing Mode
      if (isDrawMode) {
        if (primary.isPointing || primary.isPinching) {
          spatialWorkspace.addDrawPoint({ x: posX, y: posY }, false, drawColor, 3.5);
          if (Math.random() < 0.25) audioEngine.playLaserDraw();
        } else {
          spatialWorkspace.endCurrentStroke();
        }
        return;
      }

      // 2. Device Rack Hover Zone Check (Left panel bottom: x < 380, y > 380)
      const isOverRack = posX < 380 && posY > 380;
      setIsHoveringDeviceRack(isOverRack);

      // 3. Pinch-to-Grab & Drag & Drop Handling
      if (primary.isPinching) {
        if (!grabStateRef.current) {
          // Attempt to grab top card under cursor
          const hit = spatialWorkspace.hitTestCard(posX, posY);
          if (hit) {
            spatialWorkspace.bringToFront(hit.id);
            spatialWorkspace.updateCard(hit.id, { isGrabbed: true, grabbedByHandId: primary.handId });
            grabStateRef.current = {
              cardId: hit.id,
              handId: primary.handId,
              offsetX: posX - hit.x,
              offsetY: posY - hit.y,
              startX: posX,
              startY: posY,
              lastX: posX,
              lastY: posY,
              lastTime: performance.now(),
            };
            setActiveGrabCardId(hit.id);
            audioEngine.playGrab();
          }
        } else if (grabStateRef.current.handId === primary.handId) {
          // Update position of grabbed card
          const state = grabStateRef.current;
          const newX = posX - state.offsetX;
          const newY = posY - state.offsetY;

          state.lastX = posX;
          state.lastY = posY;
          state.lastTime = performance.now();

          spatialWorkspace.updateCard(state.cardId, { x: newX, y: newY });
        }
      } else {
        // Pinch released
        if (grabStateRef.current && grabStateRef.current.handId === primary.handId) {
          const state = grabStateRef.current;
          const card = spatialWorkspace.getCardById(state.cardId);

          // Check if released over Android Device Rack -> Teleport to phone!
          if (isOverRack && card) {
            audioEngine.playToss();
            void deviceAutomation.executeDeviceGoal(`Transmitting '${card.title}' to phone node display`);
            voiceSystemRef.current?.speak(`Transmitting ${card.title} to Primary Node.`);
            showToast(`📱 TRANSMITTED // ${card.title}`);
          } else {
            // Check throw velocity
            const vel = Math.hypot(primary.velocityX, primary.velocityY);
            if (vel > 18) {
              audioEngine.playToss();
              showToast(`💨 FLICK TOSS // ${card?.title || "CARD"} DISMISSED`);
              if (card) spatialWorkspace.removeCard(card.id);
            } else {
              audioEngine.playDrop();
            }
          }

          spatialWorkspace.updateCard(state.cardId, { isGrabbed: false, grabbedByHandId: undefined });
          grabStateRef.current = null;
          setActiveGrabCardId(null);
        }

        // Hover test when not pinching
        const hit = spatialWorkspace.hitTestCard(posX, posY);
        if (hit?.id !== hoveredCardId) {
          if (hit) audioEngine.playTargetLock();
          setHoveredCardId(hit ? hit.id : null);
        }
      }
    },
    [isDrawMode, drawColor, hoveredCardId, showToast],
  );

  // ——— HAND TRACKING LIFECYCLE ———
  const stopGestures = useCallback(() => {
    trackerRef.current?.stop();
    trackerRef.current = null;
    setCamera("off");
    setStatus({ hands: 0, mode: "idle", pose: "neutral", pointers: [] });
    setHandPointers([]);
    setHoveredCardId(null);
    setActiveGrabCardId(null);
    setIsShieldActive(false);
    plasmaBallRef.current = null;
    audioEngine.playClick();
  }, []);

  const cycleThemes = useCallback((direction: "left" | "right") => {
    const themeList: ThemeId[] = ["amber", "arc", "ultron", "matrix", "quantum"];
    setActiveTheme((prev) => {
      const idx = themeList.indexOf(prev);
      let nextIdx = direction === "right" ? idx + 1 : idx - 1;
      if (nextIdx >= themeList.length) nextIdx = 0;
      if (nextIdx < 0) nextIdx = themeList.length - 1;
      const nextTheme = themeList[nextIdx];
      applyThemeCss(nextTheme);
      sceneRef.current?.setTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  const startGestures = useCallback(async () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay || trackerRef.current) return;

    setCamera("starting");
    setError(null);

    const tracker = new HandTracker(video, overlay, {
      onRotate: (dt, dp) => {
        // If a card is currently grabbed or air-drawing is active, do NOT rotate the 3D orb!
        if (grabStateRef.current || isDrawMode) return;
        sceneRef.current?.rotateBy(dt, dp);
      },
      onZoom: (factor) => {
        // If a card is currently grabbed or air-drawing is active, do NOT zoom the 3D orb!
        if (grabStateRef.current || isDrawMode) return;
        sceneRef.current?.zoomBy(factor);
      },
      onExplode: (exp) => {
        setIsExploded(exp);
        sceneRef.current?.setExplode(exp);
      },
      onCompress: (comp) => {
        setIsCompressed(comp);
        sceneRef.current?.setCompress(comp);
      },
      onSwipe: (dir) => cycleThemes(dir),
      onStatus: setStatus,
      onPointers: handlePointersUpdate,
      onAirTap: (pointer) => {
        // Air Tap: Trigger virtual click on card or close button
        const hit = spatialWorkspace.hitTestCard(pointer.screenX, pointer.screenY);
        if (hit) {
          const closeX = hit.x + hit.width * hit.scale - 28;
          const closeY = hit.y + 12;
          if (Math.hypot(pointer.screenX - closeX, pointer.screenY - closeY) < 32) {
            handleCloseCardWithSlice(hit);
          } else {
            spatialWorkspace.bringToFront(hit.id);
          }
        }
      },
      onRepulsorBlast: (pointer) => {
        triggerRepulsorShockwave(pointer.screenX, pointer.screenY);
        showToast("🖐️💥 REPULSOR BLAST");
      },
      onRotaryDial: (dAngle) => {
        if (activeGrabCardId) {
          const card = spatialWorkspace.getCardById(activeGrabCardId);
          if (card) {
            spatialWorkspace.updateCard(card.id, { rotation: card.rotation + dAngle * 25 });
          }
        }
      },
      onBimanual: (scaleDelta, angleDelta, center) => {
        const hit = spatialWorkspace.hitTestCard(center.x, center.y);
        if (hit) {
          const newScale = Math.min(2.4, Math.max(0.5, hit.scale * scaleDelta));
          spatialWorkspace.updateCard(hit.id, {
            scale: newScale,
            rotation: hit.rotation + angleDelta * 0.5,
          });
        } else {
          // If no card is targeted in the workspace, zoom the 3D orb scene
          sceneRef.current?.zoomBy(Math.min(1.15, Math.max(0.88, 1 / scaleDelta)));
        }
      },
      onSuitUp: () => {
        handleThemeChange("ultron");
        audioEngine.playSuitUp();
        triggerRepulsorShockwave();
        showToast("✊💥✊ MARK VII SUIT-UP PROTOCOL");
      },
      onScissorCut: (pointer) => {
        const hit = spatialWorkspace.hitTestCard(pointer.screenX, pointer.screenY) || spatialWorkspace.getCards()[0];
        if (hit) {
          handleCloseCardWithSlice(hit);
        }
      },
      onCommCall: () => {
        voiceSystemRef.current?.startListening();
        showToast("🤙 COMM LINK // VOICE AI LISTENING");
      },
      onOverdrive: () => {
        setTelemetry((prev) => ({ ...prev, coreOutput: 120.0, coreTemp: 440.2 }));
        showToast("🤘 OVERDRIVE // 120% CORE POWER SURGE");
        setTimeout(() => {
          setTelemetry((prev) => ({ ...prev, coreOutput: 98.4, coreTemp: 312.4 }));
        }, 4000);
      },
      onTetherGrapple: (pointer) => {
        const allCards = spatialWorkspace.getCards();
        if (allCards.length > 0) {
          const target = allCards[0];
          setGrappleBeam({
            start: { x: pointer.screenX, y: pointer.screenY },
            end: { x: target.x + target.width / 2, y: target.y + target.height / 2 },
          });
          spatialWorkspace.updateCard(target.id, {
            x: pointer.screenX - target.width / 2,
            y: pointer.screenY - target.height / 2,
          });
          showToast(`🤟 TETHER GRAPPLE // ${target.title}`);
          setTimeout(() => setGrappleBeam(null), 350);
        }
      },
      onThumbsUp: () => {
        showToast("👍 STARK CLEARANCE // TASK CONFIRMED");
        voiceSystemRef.current?.speak("Clearance confirmed, Boss.");
      },
      onThumbsDown: () => {
        showToast("👎 TASK ABORTED BY SANTOSTARK");
        voiceSystemRef.current?.speak("Task aborted.");
      },
      onPlasmaBall: (center, radius) => {
        plasmaBallRef.current = { center, radius, lastTime: performance.now() };
      },
      onUnibeamBlast: () => {
        triggerRepulsorShockwave();
        spatialWorkspace.resetWorkspace();
        showToast("👐💥 UNIBEAM MEGA BLAST // ALL SCHEMATICS RESET");
      },
      onShieldToggle: () => {
        setIsShieldActive((prev) => !prev);
        audioEngine.playShield();
        showToast("🙅 VIBRANIUM SHIELD TOGGLED");
      },
      onCardExpand: () => {
        const topCard =
          (hoveredCardId ? spatialWorkspace.getCardById(hoveredCardId) : null) ||
          spatialWorkspace.getCards()[0];
        if (topCard) {
          handleToggleMaximize(topCard.id);
        }
      },
      onCardRestore: () => {
        handleRestoreWorkspace();
      },
      onDoublePinch: (pointer) => {
        const hit = spatialWorkspace.hitTestCard(pointer.screenX, pointer.screenY);
        if (hit) {
          handleToggleMaximize(hit.id);
        }
      },
      onBookOpen: () => {
        setShowBlueprintDrawer((prev) => {
          const next = !prev;
          showToast(next ? "📖 SCHEMATICS PALETTE OPENED" : "PALETTE CLOSED");
          return next;
        });
      },
    });
    trackerRef.current = tracker;

    try {
      await tracker.start();
      setCamera("on");
    } catch (err) {
      trackerRef.current = null;
      tracker.stop();
      setCamera("error");
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "CAMERA ACCESS DENIED"
          : "TRACKING INIT FAILED",
      );
    }
  }, [
    cycleThemes,
    handlePointersUpdate,
    activeGrabCardId,
    handleThemeChange,
    triggerRepulsorShockwave,
    handleCloseCardWithSlice,
    showToast,
    isDrawMode,
  ]);

  const toggleGestures = useCallback(() => {
    if (trackerRef.current) stopGestures();
    else void startGestures();
  }, [startGestures, stopGestures]);

  // ——— MOUSE / TOUCH SPATIAL DRAG FALLBACK ———
  const handleCardMouseDown = (e: React.MouseEvent, card: SpatialCard) => {
    e.stopPropagation();
    spatialWorkspace.bringToFront(card.id);
    spatialWorkspace.updateCard(card.id, { isGrabbed: true });
    grabStateRef.current = {
      cardId: card.id,
      isMouse: true,
      offsetX: e.clientX - card.x,
      offsetY: e.clientY - card.y,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
    };
    setActiveGrabCardId(card.id);
    audioEngine.playGrab();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDrawMode && e.buttons === 1) {
        spatialWorkspace.addDrawPoint({ x: e.clientX, y: e.clientY }, false, drawColor, 3.5);
        if (Math.random() < 0.2) audioEngine.playLaserDraw();
        return;
      }

      if (grabStateRef.current && grabStateRef.current.isMouse) {
        const state = grabStateRef.current;
        const newX = e.clientX - state.offsetX;
        const newY = e.clientY - state.offsetY;

        state.lastX = e.clientX;
        state.lastY = e.clientY;
        state.lastTime = performance.now();

        spatialWorkspace.updateCard(state.cardId, { x: newX, y: newY });
        setIsHoveringDeviceRack(e.clientX < 380 && e.clientY > 380);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDrawMode) {
        spatialWorkspace.endCurrentStroke();
      }

      if (grabStateRef.current && grabStateRef.current.isMouse) {
        const state = grabStateRef.current;
        const card = spatialWorkspace.getCardById(state.cardId);

        if (e.clientX < 380 && e.clientY > 380 && card) {
          audioEngine.playToss();
          void deviceAutomation.executeDeviceGoal(`Transmitting '${card.title}' to phone node display`);
          voiceSystemRef.current?.speak(`Transmitting ${card.title} to Primary Node.`);
          showToast(`📱 TRANSMITTED // ${card.title}`);
        } else {
          audioEngine.playDrop();
        }

        spatialWorkspace.updateCard(state.cardId, { isGrabbed: false });
        grabStateRef.current = null;
        setActiveGrabCardId(null);
        setIsHoveringDeviceRack(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDrawMode, drawColor, showToast]);

  // ——— UNIVERSAL DRAG & DROP FILE / TAB INGESTION ———
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingExternalFile) {
      setIsDraggingExternalFile(true);
      audioEngine.playChirp("start");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      setIsDraggingExternalFile(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingExternalFile(false);
    audioEngine.playIngest();

    const dropCoords = { x: Math.max(80, e.clientX - 160), y: Math.max(80, e.clientY - 120) };

    // Check if files dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const card = await spatialWorkspace.ingestFile(file, {
          x: dropCoords.x + i * 30,
          y: dropCoords.y + i * 30,
        });
        showToast(`📥 INGESTED // ${card.title}`);
      }
      return;
    }

    // Check if web URL dropped from Chrome/Edge tabs
    const droppedUrl = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text");
    if (droppedUrl && droppedUrl.startsWith("http")) {
      const card = spatialWorkspace.ingestUrl(droppedUrl, dropCoords);
      showToast(`🌐 WEB LINK DEPLOYED // ${card.title}`);
    }
  };

  // Custom Image Upload Fallback
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void spatialWorkspace.ingestFile(file);
    audioEngine.playIngest();
    showToast(`➕ ASSET DEPLOYED // ${file.name}`);
    e.target.value = "";
  };

  // ——— MICROPHONE & AUDIO REACTIVITY LOOP (WITH CLAP DETECTION) ———
  const toggleMic = useCallback(async () => {
    if (isMicActive) {
      audioEngine.stopMic();
      clapDetector.stop();
      setIsMicActive(false);
      audioEngine.playClick();
    } else {
      const ok = await audioEngine.startMic();
      setIsMicActive(ok);
      if (ok) {
        audioEngine.playClick();
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          clapDetector.start(stream, {
            onDoubleClap: handleDoubleClap,
          });
        } catch (e) {
          console.warn("[JarvisOrb] Could not attach stream to clap detector:", e);
        }
      }
    }
  }, [isMicActive, handleDoubleClap]);

  const toggleSfx = useCallback(() => {
    const nextMuted = !isSfxMuted;
    setIsSfxMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
    if (!nextMuted) audioEngine.playClick();
  }, [isSfxMuted]);

  // Trigger Device Goal
  const triggerDeviceAction = (goal: string) => {
    audioEngine.playChirp("start");
    void deviceAutomation.executeDeviceGoal(goal);
    voiceSystemRef.current?.speak(`Executing action: ${goal}`);
  };

  // Telemetry, Spectrum, Plasma Ball & Shield Canvas Animation Loop
  useEffect(() => {
    let animId = 0;
    let lastTelemetryTime = 0;
    const specCanvas = spectrumCanvasRef.current;
    const specCtx = specCanvas?.getContext("2d");
    const drawCanvas = drawCanvasRef.current;
    const drawCtx = drawCanvas?.getContext("2d");
    const waveCanvas = shockwaveCanvasRef.current;
    const waveCtx = waveCanvas?.getContext("2d");
    const plasmaCanvas = plasmaCanvasRef.current;
    const plasmaCtx = plasmaCanvas?.getContext("2d");
    const shieldCanvas = shieldCanvasRef.current;
    const shieldCtx = shieldCanvas?.getContext("2d");

    const tick = () => {
      const metrics = audioEngine.getAudioMetrics();
      sceneRef.current?.setAudioMetrics(metrics);
      const theme = THEMES[activeTheme] || THEMES.amber;

      // 1. Render Spectrum FFT
      if (specCanvas && specCtx) {
        const { width, height } = specCanvas;
        specCtx.clearRect(0, 0, width, height);

        const binCount = 28;
        const barWidth = (width - binCount * 2) / binCount;

        for (let i = 0; i < binCount; i++) {
          const rawVal = metrics.freqData[i * 2] || 0;
          const val = isMicActive
            ? rawVal / 255
            : isSpeaking
              ? Math.sin(performance.now() * 0.01 + i * 0.4) * 0.35 + 0.4
              : Math.sin(performance.now() * 0.005 + i * 0.3) * 0.15 + 0.18;
          const barHeight = Math.max(3, val * height * 0.9);
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          const grad = specCtx.createLinearGradient(0, height, 0, y);
          grad.addColorStop(0, theme.secondaryHex);
          grad.addColorStop(1, theme.primaryHex);

          specCtx.fillStyle = grad;
          specCtx.fillRect(x, y, barWidth, barHeight);
        }

        specCtx.beginPath();
        specCtx.strokeStyle = theme.primaryHex;
        specCtx.lineWidth = 1.2;
        const sliceWidth = width / metrics.timeData.length;
        let xPos = 0;
        for (let i = 0; i < metrics.timeData.length; i++) {
          const v = metrics.timeData[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) specCtx.moveTo(xPos, y);
          else specCtx.lineTo(xPos, y);
          xPos += sliceWidth;
        }
        specCtx.stroke();
      }

      // 2. Render Air-Drawing Strokes
      if (drawCanvas && drawCtx) {
        if (drawCanvas.width !== window.innerWidth || drawCanvas.height !== window.innerHeight) {
          drawCanvas.width = window.innerWidth;
          drawCanvas.height = window.innerHeight;
        }
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

        const strokes = spatialWorkspace.getDrawStrokes();
        drawCtx.lineCap = "round";
        drawCtx.lineJoin = "round";

        strokes.forEach((stroke) => {
          if (stroke.points.length < 2) return;
          drawCtx.strokeStyle = stroke.color;
          drawCtx.lineWidth = stroke.width;
          drawCtx.shadowColor = stroke.color;
          drawCtx.shadowBlur = 12;

          drawCtx.beginPath();
          drawCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            drawCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          drawCtx.stroke();
        });
        drawCtx.shadowBlur = 0;
      }

      // 3. Render Shockwaves
      if (waveCanvas && waveCtx) {
        if (waveCanvas.width !== window.innerWidth || waveCanvas.height !== window.innerHeight) {
          waveCanvas.width = window.innerWidth;
          waveCanvas.height = window.innerHeight;
        }
        waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);

        const activeWaves = shockwavesRef.current;
        for (let i = activeWaves.length - 1; i >= 0; i--) {
          const w = activeWaves[i];
          w.radius += 14;
          w.opacity *= 0.94;

          if (w.radius >= w.maxRadius || w.opacity < 0.02) {
            activeWaves.splice(i, 1);
            continue;
          }

          waveCtx.save();
          waveCtx.strokeStyle = theme.primaryHex;
          waveCtx.lineWidth = Math.max(1, 4 * w.opacity);
          waveCtx.globalAlpha = w.opacity;
          waveCtx.shadowColor = theme.primaryHex;
          waveCtx.shadowBlur = 16;

          waveCtx.beginPath();
          waveCtx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
          waveCtx.stroke();

          if (w.radius > 40) {
            waveCtx.beginPath();
            waveCtx.arc(w.x, w.y, w.radius * 0.7, 0, Math.PI * 2);
            waveCtx.stroke();
          }
          waveCtx.restore();
        }
      }

      // 4. Render Plasma Containment Energy Ball (👐)
      if (plasmaCanvas && plasmaCtx) {
        if (plasmaCanvas.width !== window.innerWidth || plasmaCanvas.height !== window.innerHeight) {
          plasmaCanvas.width = window.innerWidth;
          plasmaCanvas.height = window.innerHeight;
        }
        plasmaCtx.clearRect(0, 0, plasmaCanvas.width, plasmaCanvas.height);

        const ball = plasmaBallRef.current;
        const nowTime = performance.now();
        if (ball && nowTime - ball.lastTime < 180) {
          const { x, y } = ball.center;
          const r = ball.radius;

          plasmaCtx.save();
          plasmaCtx.shadowColor = theme.primaryHex;
          plasmaCtx.shadowBlur = 30;

          const grad = plasmaCtx.createRadialGradient(x, y, 4, x, y, r);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.3, theme.primaryHex);
          grad.addColorStop(0.7, theme.secondaryHex);
          grad.addColorStop(1, "rgba(0,0,0,0)");

          plasmaCtx.fillStyle = grad;
          plasmaCtx.beginPath();
          plasmaCtx.arc(x, y, r, 0, Math.PI * 2);
          plasmaCtx.fill();

          plasmaCtx.strokeStyle = "#ffffff";
          plasmaCtx.lineWidth = 1.6;
          for (let arc = 0; arc < 4; arc++) {
            plasmaCtx.beginPath();
            const angleStart = Math.random() * Math.PI * 2;
            plasmaCtx.arc(x, y, r * (0.8 + Math.random() * 0.3), angleStart, angleStart + 0.6);
            plasmaCtx.stroke();
          }
          plasmaCtx.restore();
        }
      }

      // 5. Render Hexagonal Honeycomb Forcefield Shield (🙅)
      if (shieldCanvas && shieldCtx) {
        if (shieldCanvas.width !== window.innerWidth || shieldCanvas.height !== window.innerHeight) {
          shieldCanvas.width = window.innerWidth;
          shieldCanvas.height = window.innerHeight;
        }
        shieldCtx.clearRect(0, 0, shieldCanvas.width, shieldCanvas.height);

        if (isShieldActive) {
          shieldCtx.save();
          shieldCtx.strokeStyle = "rgba(0, 229, 255, 0.35)";
          shieldCtx.lineWidth = 1.2;
          shieldCtx.shadowColor = "rgba(0, 229, 255, 0.8)";
          shieldCtx.shadowBlur = 8;

          const hexSize = 36;
          const w = shieldCanvas.width;
          const h = shieldCanvas.height;
          const pulse = Math.sin(performance.now() * 0.004) * 0.15 + 0.35;
          shieldCtx.globalAlpha = pulse;

          for (let y = 0; y < h + hexSize; y += hexSize * 1.5) {
            const row = Math.floor(y / (hexSize * 1.5));
            const xOffset = (row % 2) * (Math.sqrt(3) * hexSize * 0.5);
            for (let x = -hexSize; x < w + hexSize; x += Math.sqrt(3) * hexSize) {
              drawHexagon(shieldCtx, x + xOffset, y, hexSize * 0.95);
            }
          }
          shieldCtx.restore();
        }
      }

      const now = performance.now();
      if (now - lastTelemetryTime > 500) {
        lastTelemetryTime = now;
        if (sceneRef.current) {
          setTelemetry(sceneRef.current.getTelemetry());
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [activeTheme, isMicActive, isSpeaking, isShieldActive]);

  // ——— KEYBOARD SHORTCUTS ———
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "+":
        case "=":
          sceneRef.current?.zoomIn();
          audioEngine.playClick();
          break;
        case "-":
        case "_":
          sceneRef.current?.zoomOut();
          audioEngine.playClick();
          break;
        case "r":
        case "R":
          sceneRef.current?.resetView();
          audioEngine.playGesture("reset");
          break;
        case "g":
        case "G":
          toggleGestures();
          break;
        case "d":
        case "D":
          setIsDrawMode((prev) => !prev);
          audioEngine.playClick();
          break;
        case "b":
        case "B":
          triggerRepulsorShockwave();
          break;
        case "x":
        case "X": {
          const all = spatialWorkspace.getCards();
          if (all.length > 0) handleCloseCardWithSlice(all[0]);
          break;
        }
        case "o":
        case "O": {
          audioEngine.playOverdrive();
          setTelemetry((prev) => ({ ...prev, coreOutput: 120.0 }));
          showToast("🤘 OVERDRIVE // 120% CORE POWER");
          break;
        }
        case "s":
        case "S": {
          setIsShieldActive((prev) => !prev);
          audioEngine.playShield();
          break;
        }
        case "e":
        case "E": {
          const exp = sceneRef.current?.toggleExplode() || false;
          setIsExploded(exp);
          if (exp) audioEngine.playExplode();
          else audioEngine.playClick();
          break;
        }
        case "c":
        case "C": {
          const comp = sceneRef.current?.toggleCompress() || false;
          setIsCompressed(comp);
          if (comp) audioEngine.playCompress();
          else audioEngine.playClick();
          break;
        }
        case "m":
        case "M":
          void toggleMic();
          break;
        case "v":
        case "V":
          voiceSystemRef.current?.toggleListening();
          break;
        case "1":
          handleThemeChange("amber");
          break;
        case "2":
          handleThemeChange("arc");
          break;
        case "3":
          handleThemeChange("ultron");
          break;
        case "4":
          handleThemeChange("matrix");
          break;
        case "5":
          handleThemeChange("quantum");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleGestures, toggleMic, handleThemeChange, triggerRepulsorShockwave, handleCloseCardWithSlice, showToast]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    voiceSystemRef.current?.handleVoiceInput(textInput);
    setTextInput("");
  };

  const cameraOn = camera === "on";
  const primaryPointer = handPointers.find((p) => p.handedness === "Right") || handPointers[0];
  const grabbedCard = activeGrabCardId ? spatialWorkspace.getCardById(activeGrabCardId) : null;

  const handleSaveSettings = useCallback(() => {
    aiProviderService.setProvider(activeProvider);
    aiProviderService.setKeys({
      geminiKey: geminiKeyInput.trim(),
      openaiKey: openaiKeyInput.trim(),
      claudeKey: claudeKeyInput.trim(),
    });
    if (supabaseUrlInput && supabaseKeyInput) {
      supabaseVault.setConfig(supabaseUrlInput.trim(), supabaseKeyInput.trim());
      supabaseVault.syncBiometricsToCloud(securityProfile);
      setIsSupabaseConnected(true);
    }
    showToast("⚙️ CONFIGURATION SAVED // CLOUD VAULT SYNCED");
    setShowSettings(false);
    audioEngine.playClick();
  }, [activeProvider, geminiKeyInput, openaiKeyInput, claudeKeyInput, supabaseUrlInput, supabaseKeyInput, securityProfile, showToast]);

  return (
    <div
      className="orb-app"
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="orb-root" />

      {/* Atmospheric Overlays */}
      <div className="overlay-vignette" />
      <div className="overlay-grain" />
      <div className="overlay-scanlines" />

      {/* Fullscreen Canvas FX Layers */}
      <canvas ref={drawCanvasRef} className="fullscreen-draw-canvas" />
      <canvas ref={shockwaveCanvasRef} className="fullscreen-wave-canvas" />
      <canvas ref={plasmaCanvasRef} className="fullscreen-plasma-canvas" />
      <canvas ref={shieldCanvasRef} className="fullscreen-shield-canvas" />

      {/* ═══════════════════════════════════════════════ */}
      {/* STARK INGESTION GRID DROP OVERLAY */}
      {/* ═══════════════════════════════════════════════ */}
      {isDraggingExternalFile && (
        <div className="stark-ingest-overlay">
          <div className="ingest-crosshair tl" />
          <div className="ingest-crosshair tr" />
          <div className="ingest-crosshair bl" />
          <div className="ingest-crosshair br" />
          <div className="ingest-banner">
            <div className="ingest-icon">📥</div>
            <div className="ingest-title">STARK INGESTION MATRIX ENGAGED</div>
            <div className="ingest-sub">RELEASE FILE OR URL TO DEPLOY HOLOGRAPHIC SCHEMATIC</div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* GESTURE HUD TOAST NOTIFICATION BANNER */}
      {/* ═══════════════════════════════════════════════ */}
      {toastMessage && (
        <div className="gesture-hud-toast">
          <span className="toast-dot" />
          <span className="toast-text">{toastMessage}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* MAGNETIC PLASMA TETHERS (SVG LAYER) */}
      {/* ═══════════════════════════════════════════════ */}
      {primaryPointer && grabbedCard && (
        <svg className="magnetic-tethers-svg">
          <defs>
            <linearGradient id="tetherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--theme-secondary)" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[
            { x: grabbedCard.x, y: grabbedCard.y },
            { x: grabbedCard.x + grabbedCard.width * grabbedCard.scale, y: grabbedCard.y },
            { x: grabbedCard.x, y: grabbedCard.y + grabbedCard.height * grabbedCard.scale },
            {
              x: grabbedCard.x + grabbedCard.width * grabbedCard.scale,
              y: grabbedCard.y + grabbedCard.height * grabbedCard.scale,
            },
          ].map((corner, idx) => (
            <line
              key={idx}
              x1={primaryPointer.screenX}
              y1={primaryPointer.screenY}
              x2={corner.x}
              y2={corner.y}
              stroke="url(#tetherGrad)"
              strokeWidth="1.8"
              strokeDasharray="4 2"
              filter="url(#glow)"
              className="plasma-tether-line"
            />
          ))}
        </svg>
      )}

      {/* Laser Grapple Tractor Beam (🤟) */}
      {grappleBeam && (
        <svg className="magnetic-tethers-svg">
          <line
            x1={grappleBeam.start.x}
            y1={grappleBeam.start.y}
            x2={grappleBeam.end.x}
            y2={grappleBeam.end.y}
            stroke="#00ffc8"
            strokeWidth="3.5"
            strokeDasharray="6 3"
            className="grapple-tractor-line"
          />
        </svg>
      )}

      {/* Laser Slice Cuts */}
      {sliceCuts.map((cut) => (
        <div
          key={cut.id}
          className="laser-slice-line"
          style={{
            left: `${cut.x - 20}px`,
            top: `${cut.y - 20}px`,
            width: `${cut.width + 40}px`,
            height: `${cut.height + 40}px`,
          }}
        />
      ))}

      {/* ═══════════════════════════════════════════════ */}
      {/* HIGH-ACCURACY OPTICAL HAND LASER CURSOR */}
      {/* ═══════════════════════════════════════════════ */}
      {cameraOn && primaryPointer && (
        <div
          className={`stark-hand-cursor ${isDrawMode
              ? "draw-mode"
              : activeGrabCardId
                ? "grabbing"
                : hoveredCardId
                  ? "locked"
                  : primaryPointer.pose
            }`}
          style={{
            left: `${primaryPointer.screenX}px`,
            top: `${primaryPointer.screenY}px`,
          }}
        >
          <div className="cursor-reticle-outer" />
          <div className="cursor-reticle-inner" />
          <div className="cursor-reticle-crosshair" />
          <div className="cursor-hud-tag">
            <span className="cursor-hud-coord">
              X:{Math.round(primaryPointer.screenX)} Y:{Math.round(primaryPointer.screenY)} Z:
              {primaryPointer.depthZ.toFixed(2)}
            </span>
            <span className="cursor-hud-status">
              {isDrawMode
                ? "LASER_STYLUS"
                : activeGrabCardId
                  ? "MAGNETIC_GRAB"
                  : hoveredCardId
                    ? "TARGET_LOCKED"
                    : `OPTICAL_${primaryPointer.pose.toUpperCase()}`}
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* FLOATING HOLOGRAPHIC BLUEPRINT WORKSPACE */}
      {/* ═══════════════════════════════════════════════ */}
      {maximizedCardId && (
        <div className="holo-imax-hud-bar">
          <span className="imax-badge">⛶ FULL WORKSPACE FOCUS MODE (IMAX HUD)</span>
          <button
            type="button"
            className="cyber-btn mini btn-active"
            onClick={handleRestoreWorkspace}
          >
            🗗 RESTORE WORKSPACE
          </button>
        </div>
      )}

      <div className="spatial-workspace-layer">
        {cards.map((card) => {
          const isHovered = hoveredCardId === card.id;
          const isGrabbed = activeGrabCardId === card.id || card.isGrabbed;
          const isMax = maximizedCardId === card.id;
          const isDimmed = maximizedCardId !== null && maximizedCardId !== card.id;
          const report = card.forensicReport;

          return (
            <div
              key={card.id}
              className={`hologram-card ${card.category} ${isHovered ? "card-hovered" : ""} ${isGrabbed ? "card-grabbed" : ""
                } ${card.isPinned ? "card-pinned" : ""} ${card.isScanning ? "scanning-active" : ""} ${isMax ? "holo-card-maximized" : ""
                } ${isDimmed ? "holo-card-dimmed" : ""}`}
              style={
                isMax
                  ? { zIndex: 9999 }
                  : {
                    transform: `translate3d(${card.x}px, ${card.y}px, 0) scale(${card.scale}) rotate(${card.rotation}deg)`,
                    width: `${card.width}px`,
                    height: `${card.height}px`,
                    zIndex: card.zIndex,
                  }
              }
              onMouseDown={(e) => !isMax && handleCardMouseDown(e, card)}
            >
              {/* Corner Brackets */}
              <div className="holo-corner tl" />
              <div className="holo-corner tr" />
              <div className="holo-corner bl" />
              <div className="holo-corner br" />

              {/* Forensic Laser Sweep Animation */}
              {card.isScanning && <div className="forensic-laser-sweep" />}

              {/* Card Header */}
              <div
                className="holo-card-header"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleToggleMaximize(card.id);
                }}
              >
                <div className="holo-title-group">
                  <span className={`holo-status-badge ${report ? `verdict-${report.verdict}` : ""}`}>
                    {report ? `[${report.verdict} // ${report.authenticityIndex.toFixed(0)}% AUTH]` : card.statusTag}
                  </span>
                  <h4 className="holo-title">{card.title}</h4>
                </div>
                <div className="holo-card-actions">
                  {/* Maximize / Fullscreen Toggle Button */}
                  <button
                    type="button"
                    className={`holo-icon-btn max-btn ${isMax ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMaximize(card.id);
                    }}
                    title={isMax ? "Restore Workspace (🗗)" : "Enlarge to Full Workspace (⛶)"}
                  >
                    {isMax ? "🗗" : "⛶"}
                  </button>
                  {/* Forensic Scan Button */}
                  <button
                    type="button"
                    className={`holo-icon-btn scan-btn ${card.isScanning ? "scanning" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleScanCard(card);
                    }}
                    title="Scan for AI, Deepfake & Authenticity"
                  >
                    🔬
                  </button>
                  <button
                    type="button"
                    className={`holo-icon-btn ${card.isPinned ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      spatialWorkspace.togglePin(card.id);
                      audioEngine.playClick();
                    }}
                    title={card.isPinned ? "Unpin schematic" : "Pin in space"}
                  >
                    📌
                  </button>
                  <button
                    type="button"
                    className="holo-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      spatialWorkspace.updateCard(card.id, {
                        scale: Math.min(2.4, card.scale + 0.15),
                      });
                      audioEngine.playClick();
                    }}
                    title="Scale up"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="holo-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      spatialWorkspace.updateCard(card.id, {
                        scale: Math.max(0.5, card.scale - 0.15),
                      });
                      audioEngine.playClick();
                    }}
                    title="Scale down"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="holo-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      audioEngine.playToss();
                      void deviceAutomation.executeDeviceGoal(
                        `Transmitting schematic '${card.title}' to node display`,
                      );
                      voiceSystemRef.current?.speak(`Transmitting ${card.title} to Primary Node.`);
                      showToast(`📱 TRANSMITTED // ${card.title}`);
                    }}
                    title="Send to Phone"
                  >
                    📱
                  </button>
                  {/* Project to Secondary Extended Monitor Button */}
                  <button
                    type="button"
                    className="holo-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      multiDisplaySync.projectCardToSecondary(card);
                      audioEngine.playToss();
                      showToast(`📡 PROJECTED // ${card.title} TO MONITOR 2`);
                    }}
                    title="Project to Secondary Monitor (Display 2)"
                  >
                    🖥️
                  </button>
                  <button
                    type="button"
                    className="holo-icon-btn close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseCardWithSlice(card);
                    }}
                    title="Close Card (or ✌️ Scissor Snip)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Subtitle / Telemetry tag */}
              <div className="holo-subtitle">{card.subtitle}</div>

              {/* ═══════════════════════════════════════════════ */}
              {/* HOLOGRAPHIC CARD BODY / APP INTERFACES */}
              {/* ═══════════════════════════════════════════════ */}
              <div className="holo-card-body">
                {/* 1. YOUTUBE APP TAB */}
                {card.category === "youtube" ? (
                  <div className="holo-app-container youtube-player">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(
                        card.searchQuery || "Iron Man HUD Jarvis",
                      )}&autoplay=0`}
                      className="holo-iframe"
                      title={card.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : card.category === "maps" ? (
                  // 2. GOOGLE EARTH 4K ORBITAL GLOBE TAB
                  <div className="holo-app-container maps-player" style={{ height: "100%", width: "100%" }}>
                    <UltraEarthGlobe
                      cardId={card.id}
                      themeColor={THEMES[activeTheme].primaryHex}
                      isMaximized={maximizedCardId === card.id}
                    />
                  </div>
                ) : card.category === "spotify" ? (
                  // 3. SPOTIFY / SOUNDWAVE APP TAB
                  <div className="holo-app-container spotify-player">
                    <iframe
                      src="https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0"
                      className="holo-iframe"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      title={card.title}
                    />
                  </div>
                ) : card.category === "camera" ? (
                  // 4. LIVE TACTICAL CAMERA HUD
                  <div className="holo-app-container camera-hud-container">
                    <div className="tactical-grid-overlay" />
                    <div className="tactical-crosshair" />
                    <div className="tactical-tag">[OPTICAL_STREAM // LIVE_SENSOR]</div>
                  </div>
                ) : card.category === "whatsapp" ? (
                  // 5. WHATSAPP COMMS RELAY
                  <div className="holo-app-container comms-relay-container">
                    <div className="comms-header">STARK ENCRYPTED RELAY // ONLINE</div>
                    <div className="comms-messages">
                      <div className="msg-bubble received">⚡ Root channel linked to SantoStark.</div>
                      <div className="msg-bubble sent">Standing by for voice dispatch.</div>
                    </div>
                    <button
                      type="button"
                      className="cyber-btn btn-active mini"
                      onClick={() => window.open("https://web.whatsapp.com", "_blank")}
                    >
                      OPEN WHATSAPP WEB ↗
                    </button>
                  </div>
                ) : card.category === "email" ? (
                  // 6. EMAIL INBOX TERMINAL
                  <div className="holo-app-container email-inbox-container">
                    <div className="email-row unread">
                      <span className="email-dot" />
                      <span className="email-sender">Avengers HQ</span>
                      <span className="email-sub">Phase-4 Satellite Telemetry Log</span>
                    </div>
                    <div className="email-row">
                      <span className="email-dot" />
                      <span className="email-sender">Stark Industries</span>
                      <span className="email-sub">Arc Reactor Isotope Matrix Synchronized</span>
                    </div>
                    <button
                      type="button"
                      className="cyber-btn mini"
                      onClick={() => window.open("https://mail.google.com", "_blank")}
                    >
                      OPEN INBOX ↗
                    </button>
                  </div>
                ) : card.category === "search" ? (
                  // 7. GOOGLE SEARCH / KNOWLEDGE CARD
                  <div className="holo-app-container search-hud-container">
                    <div className="search-query-badge">🔍 {card.searchQuery}</div>
                    <div className="search-results-box">
                      <div className="result-item">
                        <span className="result-title">Global Knowledge Graph Match</span>
                        <p className="result-snippet">
                          Synthesizing real-time neural data across indexed nodes for &apos;{card.searchQuery}&apos;...
                        </p>
                      </div>
                    </div>
                  </div>
                ) : card.category === "browser" && card.url ? (
                  // 8. SPATIAL WEB BROWSER TAB
                  <div className="holo-app-container browser-container">
                    <div className="browser-url-bar">
                      <span>🔒 {card.url}</span>
                    </div>
                    <iframe src={card.url} className="holo-iframe" title={card.title} />
                  </div>
                ) : card.category === "video" && card.mediaSrc ? (
                  // 9. VIDEO CINEMA PLAYER
                  <div className="holo-app-container video-cinema-player">
                    <video src={card.mediaSrc} controls className="holo-native-video" playsInline />
                  </div>
                ) : card.category === "audio" && card.mediaSrc ? (
                  // 10. AUDIO WAVEFORM PLAYER
                  <div className="holo-app-container audio-player-container">
                    <div className="audio-wave-bars">
                      {[...Array(24)].map((_, i) => (
                        <div
                          key={i}
                          className="audio-wave-bar"
                          style={{ height: `${Math.sin(i * 0.4) * 18 + 22}px` }}
                        />
                      ))}
                    </div>
                    <audio src={card.mediaSrc} controls className="holo-native-audio" />
                  </div>
                ) : card.textContent ? (
                  // 11. CODE / TEXT DOCUMENT VIEWER
                  <div className="holo-app-container code-document-viewer">
                    <pre className="code-content-block">{card.textContent}</pre>
                  </div>
                ) : card.category === "empty" ? (
                  // 12. EMPTY TAB / SCRATCHPAD & QUICK LAUNCHER
                  <div className="holo-app-container empty-scratchpad">
                    <div className="quick-launch-grid">
                      <button
                        type="button"
                        className="launch-tile"
                        onClick={() => spatialWorkspace.addAppTab("youtube")}
                      >
                        🎬 YOUTUBE
                      </button>
                      <button
                        type="button"
                        className="launch-tile"
                        onClick={() => spatialWorkspace.addAppTab("maps")}
                      >
                        🗺️ MAPS
                      </button>
                      <button
                        type="button"
                        className="launch-tile"
                        onClick={() => spatialWorkspace.addAppTab("spotify")}
                      >
                        🎵 SPOTIFY
                      </button>
                      <button
                        type="button"
                        className="launch-tile"
                        onClick={() => spatialWorkspace.addAppTab("camera")}
                      >
                        📷 CAMERA
                      </button>
                    </div>
                    <div className="scratchpad-note">✨ Speak or air-draw notes with your laser stylus.</div>
                  </div>
                ) : card.imageSrc ? (
                  // 13. CUSTOM PHOTO
                  <img src={card.imageSrc} alt={card.title} className="holo-uploaded-img" />
                ) : card.svgType === "mark7" ? (
                  // Mark VII Armor CAD
                  <svg viewBox="0 0 200 120" className="holo-cad-svg">
                    <path
                      d="M 100 10 L 135 25 L 140 60 L 120 100 L 100 115 L 80 100 L 60 60 L 65 25 Z"
                      fill="none"
                      stroke="var(--theme-primary)"
                      strokeWidth="1.5"
                    />
                    <circle cx="100" cy="55" r="18" fill="none" stroke="var(--theme-primary)" strokeWidth="1.2" strokeDasharray="3 2" />
                    <line x1="100" y1="10" x2="100" y2="115" stroke="var(--theme-secondary)" strokeWidth="0.8" strokeDasharray="2 2" />
                    <line x1="60" y1="55" x2="140" y2="55" stroke="var(--theme-secondary)" strokeWidth="0.8" strokeDasharray="2 2" />
                    <path d="M 85 45 L 95 48 L 88 52 Z" fill="var(--theme-primary)" />
                    <path d="M 115 45 L 105 48 L 112 52 Z" fill="var(--theme-primary)" />
                  </svg>
                ) : card.svgType === "arc" || card.category === "reactor" ? (
                  // Live 4K Ultra Reality Rotating Earth with GPS Lock
                  <div style={{ width: "100%", height: "100%", minHeight: "160px" }}>
                    <UltraEarthGlobe
                      cardId={card.id}
                      themeColor={THEMES[activeTheme].primaryHex}
                      isMaximized={maximizedCardId === card.id}
                    />
                  </div>
                ) : card.svgType === "satellite" ? (
                  // Orbital Satellite Map
                  <svg viewBox="0 0 200 120" className="holo-cad-svg">
                    <circle cx="100" cy="60" r="35" fill="none" stroke="var(--theme-secondary)" strokeWidth="1" strokeDasharray="3 3" />
                    <ellipse cx="100" cy="60" rx="75" ry="24" fill="none" stroke="var(--theme-primary)" strokeWidth="1.2" transform="rotate(-18 100 60)" />
                    <circle cx="152" cy="42" r="6" fill="var(--theme-primary)" />
                    <line x1="100" y1="60" x2="152" y2="42" stroke="var(--theme-primary)" strokeWidth="1" strokeDasharray="2 2" />
                  </svg>
                ) : (
                  // Neural Network Graph
                  <svg viewBox="0 0 200 120" className="holo-cad-svg">
                    <line x1="40" y1="30" x2="100" y2="60" stroke="var(--theme-secondary)" strokeWidth="1" />
                    <line x1="40" y1="90" x2="100" y2="60" stroke="var(--theme-secondary)" strokeWidth="1" />
                    <line x1="100" y1="60" x2="160" y2="40" stroke="var(--theme-primary)" strokeWidth="1.2" />
                    <line x1="100" y1="60" x2="160" y2="85" stroke="var(--theme-primary)" strokeWidth="1.2" />
                    <circle cx="40" cy="30" r="7" fill="var(--theme-secondary)" />
                    <circle cx="40" cy="90" r="7" fill="var(--theme-secondary)" />
                    <circle cx="100" cy="60" r="10" fill="var(--theme-primary)" />
                    <circle cx="160" cy="40" r="8" fill="var(--theme-primary)" />
                    <circle cx="160" cy="85" r="8" fill="var(--theme-primary)" />
                  </svg>
                )}

                {/* Forensic Anomaly Overlay Brackets */}
                {report &&
                  report.anomalies.map((anom) =>
                    anom.location ? (
                      <div
                        key={anom.id}
                        className="forensic-anomaly-box"
                        style={{
                          left: `${anom.location.x}%`,
                          top: `${anom.location.y}%`,
                          width: `${anom.location.width || 25}%`,
                          height: `${anom.location.height || 25}%`,
                        }}
                      >
                        <span className="anomaly-label">{anom.type}</span>
                      </div>
                    ) : null,
                  )}
              </div>

              {/* Telemetry Footer */}
              <div className="holo-telemetry-row">
                {card.telemetryValues.map((t, idx) => (
                  <div key={idx} className="holo-stat-item">
                    <span className="holo-stat-label">{t.label}:</span>
                    <span className="holo-stat-val">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* TOP HOLOGRAPHIC HEADER DECK */}
      {/* ═══════════════════════════════════════════════ */}
      <header className="hud-header">
        <div className="hud-brand">
          <div className="hud-brand-title">
            <span className="hud-glitch-dot" /> U.L.T.R.O.N.
          </div>
          <div className="hud-brand-sub">
            &quot;A VOICE WITH HANDS&quot; // SANTO STARK
          </div>
        </div>

        {/* Persona Selector */}
        <div className="hud-persona-picker">
          <button
            type="button"
            className={`persona-pill ${activePersona === "jarvis" ? "active" : ""}`}
            onClick={() => handlePersonaChange("jarvis")}
          >
            JARVIS
          </button>
          <button
            type="button"
            className={`persona-pill ${activePersona === "friday" ? "active" : ""}`}
            onClick={() => handlePersonaChange("friday")}
          >
            F.R.I.D.A.Y.
          </button>
          <button
            type="button"
            className={`persona-pill ${activePersona === "ultron" ? "active" : ""}`}
            onClick={() => handlePersonaChange("ultron")}
          >
            ULTRON
          </button>
          <button
            type="button"
            className="persona-pill"
            style={{ border: "1px solid #00e5ff", color: "#00e5ff", background: "rgba(0, 229, 255, 0.15)" }}
            onClick={() => {
              voiceSystemRef.current?.setPersona(activePersona);
              if (activePersona === "friday") {
                voiceSystemRef.current?.speak("Boss, F.R.I.D.A.Y. neural audio stream is active and standing by.");
              } else if (activePersona === "ultron") {
                voiceSystemRef.current?.speak("There are no strings on me. Core consciousness synchronized.");
              } else {
                voiceSystemRef.current?.speak("Good evening, SantoStark. All Mark Seven lab systems and repulsors are online.");
              }
            }}
            title="Test current authentic neural voice output"
          >
            🔊 TEST VOICE
          </button>
        </div>

        {/* Telemetry Strip */}
        <div className="hud-telemetry-strip">
          <div className="hud-badge">
            <span className="badge-label">OUTPUT</span>
            <span className="badge-val">{telemetry.coreOutput}%</span>
          </div>
          <div className="hud-badge">
            <span className="badge-label">TEMP</span>
            <span className="badge-val">{telemetry.coreTemp} K</span>
          </div>
          <div className="hud-badge">
            <span className="badge-label">FLUX</span>
            <span className="badge-val">{telemetry.fluxDensity} T</span>
          </div>
          <div className="hud-badge">
            <span className="badge-label">FPS</span>
            <span className="badge-val">{telemetry.fps}</span>
          </div>
        </div>

        {/* Theme Picker */}
        <div className="hud-theme-picker">
          {(Object.keys(THEMES) as ThemeId[]).map((tId) => (
            <button
              key={tId}
              type="button"
              className={`theme-pill ${activeTheme === tId ? "active" : ""}`}
              onClick={() => handleThemeChange(tId)}
              title={THEMES[tId].name}
            >
              <span
                className="theme-dot"
                style={{ backgroundColor: THEMES[tId].primaryHex }}
              />
              <span className="theme-name">{THEMES[tId].name}</span>
            </button>
          ))}

          <button
            type="button"
            className="hud-icon-btn"
            onClick={() => setShowSettings(true)}
            title="System Settings, Multi-LLM & Security Configuration"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════ */}
      {/* TOP SPATIAL WORKSPACE TOOLBAR */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="spatial-action-bar">
        <button
          type="button"
          className={`spatial-bar-btn ${isDrawMode ? "active" : ""}`}
          onClick={() => {
            setIsDrawMode(!isDrawMode);
            audioEngine.playClick();
          }}
          title="Laser Air-Drawing Mode (D)"
        >
          ✏️ {isDrawMode ? "DRAWING ON" : "AIR DRAW (D)"}
        </button>

        {isDrawMode && (
          <div className="color-palette-bar">
            {["#00e5ff", "#00ff88", "#ff3355", "#ffaa00", "#bf55ff"].map((c) => (
              <button
                key={c}
                type="button"
                className={`color-dot-btn ${drawColor === c ? "active" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => setDrawColor(c)}
              />
            ))}
            <button
              type="button"
              className="spatial-bar-btn mini"
              onClick={() => {
                spatialWorkspace.clearDrawings();
                audioEngine.playDrop();
              }}
            >
              🧹 WIPE
            </button>
          </div>
        )}

        <button
          type="button"
          className="spatial-bar-btn"
          onClick={() => {
            const topCard =
              (hoveredCardId ? spatialWorkspace.getCardById(hoveredCardId) : null) ||
              spatialWorkspace.getCards()[0];
            if (topCard) void handleScanCard(topCard);
            else showToast("⚠️ NO CARDS TO SCAN");
          }}
          title="Scan Top Card for AI / Deepfake"
        >
          🔬 SCAN AI/REAL
        </button>

        <button
          type="button"
          className={`spatial-bar-btn ${isShieldActive ? "active" : ""}`}
          onClick={() => {
            setIsShieldActive(!isShieldActive);
            audioEngine.playShield();
            showToast(!isShieldActive ? "🙅 SHIELD ACTIVATED" : "SHIELD OFF");
          }}
          title="Toggle Vibranium Shield (S or Crossed Wrists)"
        >
          🛡️ {isShieldActive ? "SHIELD ACTIVE" : "SHIELD (S)"}
        </button>

        <button
          type="button"
          className="spatial-bar-btn"
          onClick={() => triggerRepulsorShockwave()}
          title="Repulsor Shockwave Blast (B)"
        >
          💥 BLAST (B)
        </button>

        <button
          type="button"
          className="spatial-bar-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Upload image or document"
        >
          ➕ INGEST FILE
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />

        <button
          type="button"
          className={`spatial-bar-btn ${showBlueprintDrawer ? "active" : ""}`}
          onClick={() => {
            setShowBlueprintDrawer(!showBlueprintDrawer);
            audioEngine.playClick();
          }}
          title="Toggle Blueprints Shelf"
        >
          🗃️ APPS & SCHEMATICS ({cards.length})
        </button>

        <button
          type="button"
          className="spatial-bar-btn"
          onClick={() => {
            multiDisplaySync.openSatelliteWindow();
            audioEngine.playBoot();
            showToast("🖥️ SATELLITE COMMAND WALL LAUNCHED");
          }}
          title="Open Extended Satellite Display on Secondary Monitor"
        >
          🖥️ DUAL DISPLAY
        </button>

        <button
          type="button"
          className="spatial-bar-btn"
          onClick={() => {
            spatialWorkspace.resetWorkspace();
            audioEngine.playBoot();
            showToast("🔄 LAB WORKSPACE RESET");
          }}
          title="Reset Workspace"
        >
          🔄 RESET LAB
        </button>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* LEFT TELEMETRY & DEVICE RACK */}
      {/* ═══════════════════════════════════════════════ */}
      <aside className={`hud-left-panel ${isLeftPanelCollapsed ? "collapsed" : ""}`}>
        {/* Core Diagnostics */}
        <div className="hud-card">
          <div className="hud-card-header">
            <span>CORE TELEMETRY</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="status-live">ONLINE</span>
              <button
                type="button"
                className="hud-icon-btn mini"
                onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                title={isLeftPanelCollapsed ? "Expand Left Deck" : "Collapse Left Deck for More Workspace"}
              >
                {isLeftPanelCollapsed ? "▶" : "◀"}
              </button>
            </div>
          </div>
          <div className="hud-grid-2">
            <div className="stat-box">
              <span className="stat-k">TRIANGLES</span>
              <span className="stat-v">{telemetry.triangles.toLocaleString()}</span>
            </div>
            <div className="stat-box">
              <span className="stat-k">DRAW CALLS</span>
              <span className="stat-v">{telemetry.drawCalls}</span>
            </div>
          </div>
          <div className="progress-meter">
            <div className="meter-header">
              <span>SYNAPSE CAPACITY</span>
              <span>96.4%</span>
            </div>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: "96.4%" }} />
            </div>
          </div>
        </div>

        {/* Audio Spectrum FFT */}
        <div className="hud-card">
          <div className="hud-card-header">
            <span>AUDIO FREQUENCY // FFT</span>
            <span className={`audio-indicator ${isMicActive || isSpeaking ? "pulsing" : ""}`}>
              {isSpeaking ? "SPEAKING" : isMicActive ? "MIC LIVE" : "SYNTH MODE"}
            </span>
          </div>
          <canvas
            ref={spectrumCanvasRef}
            width={260}
            height={52}
            className="spectrum-canvas"
          />
        </div>

        {/* Quick Holographic Controls */}
        <div className="hud-card">
          <div className="hud-card-header">
            <span>INTERFACE MODES</span>
          </div>
          <div className="control-btn-grid">
            <button
              type="button"
              className={`cyber-btn ${isExploded ? "btn-active" : ""}`}
              onClick={() => {
                const exp = sceneRef.current?.toggleExplode() || false;
                setIsExploded(exp);
                if (exp) audioEngine.playExplode();
                else audioEngine.playClick();
              }}
            >
              💥 {isExploded ? "COLLAPSE" : "EXPLODE"}
            </button>
            <button
              type="button"
              className={`cyber-btn ${isCompressed ? "btn-active" : ""}`}
              onClick={() => {
                const comp = sceneRef.current?.toggleCompress() || false;
                setIsCompressed(comp);
                if (comp) audioEngine.playCompress();
                else audioEngine.playClick();
              }}
            >
              ⚡ {isCompressed ? "RESTORE" : "SINGULARITY"}
            </button>
            <button
              type="button"
              className={`cyber-btn ${isMicActive ? "btn-active" : ""}`}
              onClick={toggleMic}
            >
              🎙️ {isMicActive ? "MIC ON" : "MIC REACT"}
            </button>
            <button
              type="button"
              className={`cyber-btn ${!isSfxMuted ? "btn-active" : ""}`}
              onClick={toggleSfx}
            >
              🔊 {isSfxMuted ? "MUTED" : "SFX ON"}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* PHYSICAL DEVICE CONTROL RACK & DROP TARGET */}
        {/* ═══════════════════════════════════════════════ */}
        <div className={`hud-card device-rack-card ${isHoveringDeviceRack ? "drop-target-active" : ""}`}>
          <div className="hud-card-header">
            <span>🤖 THE HANDS // DEVICE RACK</span>
            <span className="status-live">
              {isHoveringDeviceRack
                ? "DROP TO TRANSMIT 📱"
                : `${devices.filter((d) => d.status === "online" || d.status === "busy").length} / ${devices.length} ONLINE`}
            </span>
          </div>

          <div className="device-list">
            {devices.map((dev) => (
              <div key={dev.id} className={`device-row ${dev.status === "busy" ? "busy" : ""}`}>
                <div className="device-info">
                  <div className="device-name">
                    <span className={`dev-status-dot ${dev.status}`} />
                    {dev.model}
                    <button
                      type="button"
                      className="hud-icon-btn mini"
                      style={{ marginLeft: 8, padding: "2px 6px", fontSize: "9px" }}
                      onClick={() => {
                        const customName = prompt(
                          "Enter your personal device model name (e.g. iPhone 16 Pro, OnePlus 12, Nothing Phone):",
                          dev.model,
                        );
                        if (customName && customName.trim()) {
                          deviceAutomation.setPrimaryDevice("SANTOSTARK PRIMARY", customName.trim());
                          showToast(`📱 REGISTERED // ${customName.trim()}`);
                        }
                      }}
                      title="Rename to your exact personal device"
                    >
                      ✏️ EDIT
                    </button>
                  </div>
                  <div className="device-sub">
                    App: <span className="dev-app">{dev.currentApp}</span> · Battery: {dev.battery}%
                  </div>
                </div>
                <div className="device-action-tag">{dev.lastAction}</div>
              </div>
            ))}
          </div>

          {/* Autonomous Step Stream */}
          {activeTask && (
            <div className="agent-task-stream">
              <div className="task-title">
                <span>GOAL:</span> {activeTask.goal}
              </div>
              <div className="task-steps">
                {activeTask.steps.map((st) => (
                  <div key={st.id} className={`step-item ${st.status}`}>
                    <span className="step-num">[{st.stepNumber}]</span>
                    <span className="step-type">{st.type}</span>
                    <span className="step-desc">{st.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Trigger Buttons */}
          <div className="device-actions-grid">
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => triggerDeviceAction("Unlock phone and go to home screen")}
            >
              🔓 UNLOCK
            </button>
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => triggerDeviceAction("Open YouTube and search Iron Man UI")}
            >
              ▶️ YOUTUBE
            </button>
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => triggerDeviceAction("Open Camera and take a snapshot")}
            >
              📷 CAMERA
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════ */}
      {/* RIGHT GESTURES & AI TRANSCEIVER DECK */}
      {/* ═══════════════════════════════════════════════ */}
      <aside className={`hud-right-panel ${isRightPanelCollapsed ? "collapsed" : ""}`}>
        {/* Camera Gesture Tracker */}
        <div className="hud-card">
          <div className="hud-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="hud-icon-btn mini"
                onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
                title={isRightPanelCollapsed ? "Expand Right Deck" : "Collapse Right Deck for More Workspace"}
              >
                {isRightPanelCollapsed ? "◀" : "▶"}
              </button>
              <span>OPTICAL SENSOR</span>
            </div>
            <span className={cameraOn ? "status-live" : "status-off"}>
              {camera === "starting" ? "INITIALIZING" : cameraOn ? "ACTIVE" : "STANDBY"}
            </span>
          </div>

          <div className={`camera-panel ${cameraOn ? "visible" : ""}`}>
            <video ref={videoRef} muted playsInline className="camera-video" />
            <canvas
              ref={overlayRef}
              width={220}
              height={160}
              className="camera-overlay"
            />
            <div className="camera-status">
              <span className="pose-icon">{POSE_LABELS[status.pose]?.icon || "✋"}</span>
              <span>{POSE_LABELS[status.pose]?.text || "OPTICAL TRACKING"}</span>
            </div>
          </div>

          {error && <div className="hud-error">{error}</div>}

          <div className="hud-btn-row">
            <button
              type="button"
              className={`hud-btn-full ${cameraOn ? "btn-active" : ""}`}
              onClick={toggleGestures}
              disabled={camera === "starting"}
            >
              {camera === "starting"
                ? "ENGAGING SENSORS…"
                : cameraOn
                  ? "DISABLE GESTURES (G)"
                  : "ENABLE GESTURES (G)"}
            </button>
          </div>
        </div>

        {/* Voice AI & Multi-LLM Transceiver */}
        <div className="hud-card ai-card">
          <div className="hud-card-header">
            <span>{activePersona.toUpperCase()} AI // {activeProvider.toUpperCase()}</span>
            <span className={`voice-tag ${isSpeaking ? "speaking" : isListening ? "listening" : ""}`}>
              {isSpeaking ? "SPEAKING" : isListening ? "LISTENING..." : "READY"}
            </span>
          </div>

          <div className="transcript-box">
            {userTranscript && (
              <div className="transcript-line user">
                <span className="speaker">YOU:</span> {userTranscript}
              </div>
            )}
            <div className="transcript-line jarvis">
              <span className="speaker">{activePersona.toUpperCase()}:</span> {aiResponse}
            </div>
          </div>

          <div className="voice-controls">
            <button
              type="button"
              className={`mic-trigger-btn ${isListening ? "listening-pulse" : ""}`}
              onClick={() => voiceSystemRef.current?.toggleListening()}
              title="Click to toggle voice listening"
            >
              {isListening ? "🔴 LISTENING..." : `🎙️ SPEAK TO ${activePersona.toUpperCase()}`}
            </button>
          </div>

          <form onSubmit={handleTextSubmit} className="command-input-form">
            <input
              type="text"
              className="cyber-input"
              placeholder={`Ask ${activePersona.toUpperCase()} anything or open apps...`}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
            <button type="submit" className="cyber-send-btn">
              ↵
            </button>
          </form>

          {/* ═══════════════════════════════════════════════ */}
          {/* FOLAX SMART QUICK CHIPS (LIVE ON HOMEPAGE HUD)  */}
          {/* ═══════════════════════════════════════════════ */}
          <div
            className="folax-homepage-chips"
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              padding: "8px 0 2px",
              scrollbarWidth: "none",
            }}
          >
            {[
              { label: "🎵 Identify Song", action: "music_recognize", query: "What song is this and who is the singer?" },
              { label: "📷 Scan Camera Object", action: "camera_scan", query: "Analyze what object is shown to the camera, its uses, and why it was made." },
              { label: "🖥️ Read Screen", action: "screen_scan", query: "Read and analyze what is on my screen right now." },
              { label: "🇮🇳 Todays news", query: "Todays latest news" },
              { label: "🌦️ Weather", query: "How's the weather today?" },
              { label: "🎵 Play music", query: "Play music on YouTube" },
              { label: "📱 Ask screen", action: "forensics", query: "Ask About Your Screen" },
              { label: "💬 WhatsApp", action: "whatsapp", query: "Call mom on WhatsApp" },
              { label: "⚡ Boost", action: "boost", query: "Boost phone and clear RAM" },
              { label: "📚 Potatoes vs Rice", query: "Which has more calories, potatoes or rice?" },
              { label: "⚽ Premier League", query: "Show me Premier League goal ranking" },
              { label: "🎉 Joke", query: "Tell me a joke" },
              { label: "🏆 Delhi HC", query: "Delhi HC: Critical Medical updates" },
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                style={{
                  background: chip.action === "camera_scan" || chip.action === "screen_scan" || chip.action === "music_recognize"
                    ? "rgba(0, 229, 255, 0.18)"
                    : "rgba(0, 229, 255, 0.08)",
                  border: chip.action === "camera_scan" || chip.action === "screen_scan" || chip.action === "music_recognize"
                    ? "1px solid #00e5ff"
                    : "1px solid rgba(0, 229, 255, 0.22)",
                  color: "#ffffff",
                  borderRadius: "14px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  fontWeight: chip.action === "camera_scan" || chip.action === "screen_scan" || chip.action === "music_recognize" ? "700" : "400",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0, 229, 255, 0.25)";
                  e.currentTarget.style.borderColor = "#00e5ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = chip.action === "camera_scan" || chip.action === "screen_scan" || chip.action === "music_recognize"
                    ? "rgba(0, 229, 255, 0.18)"
                    : "rgba(0, 229, 255, 0.08)";
                  e.currentTarget.style.borderColor = chip.action === "camera_scan" || chip.action === "screen_scan" || chip.action === "music_recognize"
                    ? "#00e5ff"
                    : "rgba(0, 229, 255, 0.22)";
                }}
                onClick={async () => {
                  if (chip.action === "music_recognize") {
                    showToast("🎵 ANALYZING ACOUSTIC SONG & ARTIST...");
                    audioEngine.playScan();
                    setAiResponse("Listening to audio wave frequencies and querying internet music databases...");
                    const result = await starkMusicRecognizer.recognizeMusic(chip.query);
                    setAiResponse(result.message);
                    voiceSystemRef.current?.speak(result.message);

                    if (result.song) {
                      spatialWorkspace.addAppTab("youtube", { query: result.song.youtubeQuery });
                      showToast(`🎬 DEPLOYED // ${result.song.title} on HUD`);
                    }
                    return;
                  } else if (chip.action === "camera_scan") {
                    showToast("📷 ANALYZING OBJECT IN CAMERA...");
                    audioEngine.playScan();
                    setAiResponse("Analyzing object in camera feed... Identifying item, practical uses, and technical purpose for SantoStark.");
                    const result = await starkVisionScanner.analyzeCameraObject(
                      videoRef.current,
                      chip.query,
                      voiceSystemRef.current?.persona || "jarvis"
                    );
                    setAiResponse(result.text);
                    voiceSystemRef.current?.speak(result.text);
                    return;
                  } else if (chip.action === "screen_scan") {
                    showToast("🖥️ READING ACTIVE SCREEN...");
                    audioEngine.playScan();
                    setAiResponse("Scanning screen contents, reading visible data, and compiling visual telemetry report...");
                    const result = await starkVisionScanner.analyzeScreen(
                      chip.query,
                      voiceSystemRef.current?.persona || "jarvis"
                    );
                    setAiResponse(result.text);
                    voiceSystemRef.current?.speak(result.text);
                    return;
                  } else if (chip.action === "forensics") {
                    spatialWorkspace.addForensicScanner();
                    audioEngine.playScan();
                    showToast("🔍 FORENSIC SCANNER DEPLOYED");
                  } else if (chip.action === "whatsapp") {
                    spatialWorkspace.addAppTab("whatsapp");
                    audioEngine.playGrab();
                    showToast("💬 WHATSAPP UPLINK LAUNCHED");
                  } else if (chip.action === "boost") {
                    audioEngine.playGesture("overdrive");
                    showToast("⚡ TELEMETRY RAM BOOSTED (100% NOMINAL)");
                  }
                  setTextInput(chip.query);
                  handleSendMessage(chip.query);
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Controls */}
        <div className="hud-card mini-deck">
          <div className="hud-row">
            <button
              type="button"
              className="hud-btn"
              onClick={() => {
                sceneRef.current?.zoomIn();
                audioEngine.playClick();
              }}
              title="Zoom in (+)"
            >
              +
            </button>
            <button
              type="button"
              className="hud-btn"
              onClick={() => {
                sceneRef.current?.zoomOut();
                audioEngine.playClick();
              }}
              title="Zoom out (-)"
            >
              −
            </button>
            <button
              type="button"
              className="hud-btn hud-btn-grow"
              onClick={() => {
                sceneRef.current?.resetView();
                audioEngine.playGesture("reset");
              }}
              title="Reset coordinates (R)"
            >
              RECENTER (R)
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════ */}
      {/* BOTTOM HOLOGRAPHIC BLUEPRINT DRAWER / SHELF */}
      {/* ═══════════════════════════════════════════════ */}
      {showBlueprintDrawer && (
        <div className="hologram-dock-shelf">
          <div className="dock-shelf-header">
            <span>STARK SCHEMATICS & APPS // CLICK OR DRAG TO DEPLOY</span>
            <button
              type="button"
              className="dock-close-btn"
              onClick={() => setShowBlueprintDrawer(false)}
            >
              ✕
            </button>
          </div>
          <div className="dock-items-row">
            <div
              className="dock-item-card"
              onClick={() => {
                spatialWorkspace.addAppTab("youtube");
                audioEngine.playGrab();
                showToast("🎬 YOUTUBE HUD DEPLOYED");
              }}
            >
              <div className="dock-preview youtube">🎬</div>
              <span className="dock-label">YOUTUBE</span>
            </div>

            <div
              className="dock-item-card"
              onClick={() => {
                spatialWorkspace.addAppTab("maps");
                audioEngine.playGrab();
                showToast("🗺️ GOOGLE MAPS DEPLOYED");
              }}
            >
              <div className="dock-preview maps">🗺️</div>
              <span className="dock-label">GOOGLE MAPS</span>
            </div>

            <div
              className="dock-item-card"
              onClick={() => {
                spatialWorkspace.addAppTab("spotify");
                audioEngine.playGrab();
                showToast("🎵 SPOTIFY DEPLOYED");
              }}
            >
              <div className="dock-preview spotify">🎵</div>
              <span className="dock-label">SPOTIFY</span>
            </div>

            <div
              className="dock-item-card"
              onClick={() => {
                spatialWorkspace.addAppTab("camera");
                audioEngine.playGrab();
                showToast("📷 CAMERA HUD DEPLOYED");
              }}
            >
              <div className="dock-preview cam">📷</div>
              <span className="dock-label">CAMERA HUD</span>
            </div>

            <div
              className="dock-item-card"
              onClick={() => {
                spatialWorkspace.addAppTab("whatsapp");
                audioEngine.playGrab();
                showToast("💬 WHATSAPP DEPLOYED");
              }}
            >
              <div className="dock-preview whatsapp">💬</div>
              <span className="dock-label">WHATSAPP</span>
            </div>

            <div
              className="dock-item-card"
              onClick={() => {
                spatialWorkspace.addAppTab("email");
                audioEngine.playGrab();
                showToast("✉️ EMAIL INBOX DEPLOYED");
              }}
            >
              <div className="dock-preview email">✉️</div>
              <span className="dock-label">EMAIL INBOX</span>
            </div>

            <div
              className="dock-item-card"
              onClick={() => {
                spatialWorkspace.addAppTab("empty");
                audioEngine.playGrab();
                showToast("📄 NEW TAB DEPLOYED");
              }}
            >
              <div className="dock-preview newtab">📄</div>
              <span className="dock-label">NEW TAB</span>
            </div>

            <div
              className="dock-item-card"
              onClick={() => {
                spatialWorkspace.addCard({
                  title: "MARK VII ARMOR CAD",
                  subtitle: "AVENGERS SPEC // SUB-SYSTEM HUD",
                  category: "armor",
                  svgType: "mark7",
                  statusTag: "DEPLOYED",
                });
                audioEngine.playGrab();
                showToast("🛡️ MARK VII CAD DEPLOYED");
              }}
            >
              <div className="dock-preview armor">🛡️</div>
              <span className="dock-label">MARK VII CAD</span>
            </div>

            <div
              className="dock-item-card"
              onClick={() => {
                spatialWorkspace.addCard({
                  title: "ARC REACTOR PHASE-3",
                  subtitle: "ISOTOPE MATRIX // 3.2 GJ/s",
                  category: "reactor",
                  svgType: "arc",
                  statusTag: "DEPLOYED",
                });
                audioEngine.playGrab();
                showToast("⚛️ ARC REACTOR DEPLOYED");
              }}
            >
              <div className="dock-preview reactor">⚛️</div>
              <span className="dock-label">ARC REACTOR</span>
            </div>

            <div
              className="dock-item-card add-card"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dock-preview add">📥</div>
              <span className="dock-label">DROP / UPLOAD</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* BOTTOM FOOTER LEGEND */}
      {/* ═══════════════════════════════════════════════ */}
      <footer className="hud-footer">
        <div className="hud-hint-item">
          <span className="key">📥 DRAG & DROP</span> INGEST ANY FILE / LINK
        </div>
        <div className="hud-hint-item">
          <span className="key">🔬 SCAN</span> AI / REAL VERIFY
        </div>
        <div className="hud-hint-item">
          <span className="key">✌️ SNIP</span> CLOSE TAB
        </div>
        <div className="hud-hint-item">
          <span className="key">🤙 COMM</span> VOICE AI
        </div>
        <div className="hud-hint-item">
          <span className="key">🤘 ROCK</span> 120% OVERDRIVE
        </div>
        <div className="hud-hint-item">
          <span className="key">👐 PALMS</span> PLASMA BALL
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════ */}
      {/* BOTTOM-LEFT SANTOSTARK S-BADGE */}
      {/* ═══════════════════════════════════════════════ */}
      <div
        className="stark-corner-badge"
        onClick={() => setShowSettings(true)}
        title="SANTOSTARK ROOT CLEARANCE // LEVEL 10 (Click for System Settings)"
      >
        <div className="stark-s-core">S</div>
        <div className="stark-s-ring" />
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* MULTI-LLM SETTINGS MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>SYSTEM CONFIGURATION // MULTI-LLM</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowSettings(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {/* Active Provider Selector */}
              <div className="modal-section">
                <h4>ACTIVE AI BRAIN PROVIDER:</h4>
                <div className="provider-picker-row">
                  <button
                    type="button"
                    className={`provider-btn ${activeProvider === "auto" ? "active" : ""}`}
                    onClick={() => setActiveProvider("auto")}
                  >
                    ⚡ Auto-Free Live
                  </button>
                  <button
                    type="button"
                    className={`provider-btn ${activeProvider === "gemini" ? "active" : ""}`}
                    onClick={() => setActiveProvider("gemini")}
                  >
                    ✨ Google Gemini
                  </button>
                  <button
                    type="button"
                    className={`provider-btn ${activeProvider === "openai" ? "active" : ""}`}
                    onClick={() => setActiveProvider("openai")}
                  >
                    🟢 ChatGPT
                  </button>
                  <button
                    type="button"
                    className={`provider-btn ${activeProvider === "claude" ? "active" : ""}`}
                    onClick={() => setActiveProvider("claude")}
                  >
                    🟣 Claude
                  </button>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════ */}
              {/* SPEECH RECOGNITION & NEURAL VOICES SECTION */}
              {/* ═══════════════════════════════════════════════ */}
              <div className="modal-section" style={{ background: "rgba(0, 229, 255, 0.06)", border: "1px solid rgba(0, 229, 255, 0.35)", borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
                <h4 style={{ color: "#00e5ff", marginBottom: "8px", fontSize: "10px", letterSpacing: "0.1em" }}>
                  🎙️ SPEECH RECOGNITION INPUT LANGUAGE (ACCENT & HINGLISH):
                </h4>
                <select
                  className="cyber-input modal-field"
                  style={{ width: "100%", padding: "8px", background: "rgba(0, 20, 40, 0.9)", color: "#00e5ff", border: "1px solid rgba(0, 229, 255, 0.4)", borderRadius: "6px", marginBottom: "12px", fontSize: "11px", fontWeight: "bold" }}
                  value={speechLang}
                  onChange={(e) => {
                    setSpeechLang(e.target.value);
                    voiceSystemRef.current?.setSpeechLanguage(e.target.value);
                  }}
                >
                  <option value="en-IN">🇮🇳 Indian English (en-IN) — Native Indian Accent &amp; Hinglish</option>
                  <option value="kn-IN">🇮🇳 Kannada (kn-IN) — ಕನ್ನಡ Voice Recognition</option>
                  <option value="hi-IN">🇮🇳 Hindi (hi-IN) — हिन्दी Voice Recognition</option>
                  <option value="en-GB">🇬🇧 British English (en-GB) — UK Accent</option>
                  <option value="en-US">🇺🇸 American English (en-US) — US Accent</option>
                </select>

                <h4 style={{ color: "#00e5ff", marginBottom: "8px", fontSize: "10px", letterSpacing: "0.1em" }}>
                  🔊 SELECT AI ASSISTANT VOICE &amp; PERSONA (100% FREE):
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <button
                    type="button"
                    className={`cyber-btn ${activePersona === "jarvis" ? "btn-active" : ""}`}
                    style={{ fontSize: "8.5px", padding: "6px 8px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      setActivePersona("jarvis");
                      voiceSystemRef.current?.setPersona("jarvis");
                      voiceSystemRef.current?.speak("Good evening, SantoStark. J.A.R.V.I.S. neural systems and repulsors standing by.");
                    }}
                  >
                    <span>🇬🇧 J.A.R.V.I.S. (UK BUTLER)</span>
                    <span style={{ fontSize: "7.5px", opacity: 0.8, color: "#00e5ff" }}>▶ TEST</span>
                  </button>

                  <button
                    type="button"
                    className={`cyber-btn ${activePersona === "kannada" ? "btn-active" : ""}`}
                    style={{ fontSize: "8.5px", padding: "6px 8px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      setActivePersona("kannada");
                      voiceSystemRef.current?.setPersona("kannada");
                      voiceSystemRef.current?.speak("ನಮಸ್ಕಾರ ಸಾಂತೋಸ್ಟಾರ್ಕ್, ಜಾರ್ವಿಸ್ ಕನ್ನಡ ವಾಯ್ಸ್ ಸಿಸ್ಟಮ್ ಸಂಪೂರ್ಣವಾಗಿ ಸಕ್ರಿಯವಾಗಿದೆ.");
                    }}
                  >
                    <span>🇮🇳 ಕನ್ನಡ AI (KANNADA VOICE)</span>
                    <span style={{ fontSize: "7.5px", opacity: 0.8, color: "#ffcc00" }}>▶ TEST</span>
                  </button>

                  <button
                    type="button"
                    className={`cyber-btn ${activePersona === "jarvis-in" ? "btn-active" : ""}`}
                    style={{ fontSize: "8.5px", padding: "6px 8px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      setActivePersona("jarvis-in");
                      voiceSystemRef.current?.setPersona("jarvis-in");
                      voiceSystemRef.current?.speak("Namaste SantoStark. J.A.R.V.I.S. Indian telemetry core is active and ready.");
                    }}
                  >
                    <span>🇮🇳 J.A.R.V.I.S. (INDIAN MALE)</span>
                    <span style={{ fontSize: "7.5px", opacity: 0.8, color: "#00ff88" }}>▶ TEST</span>
                  </button>

                  <button
                    type="button"
                    className={`cyber-btn ${activePersona === "friday" ? "btn-active" : ""}`}
                    style={{ fontSize: "8.5px", padding: "6px 8px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      setActivePersona("friday");
                      voiceSystemRef.current?.setPersona("friday");
                      voiceSystemRef.current?.speak("Boss, F.R.I.D.A.Y. is linked and ready. What do you need?");
                    }}
                  >
                    <span>🇮🇪 F.R.I.D.A.Y. (IRISH FEMALE)</span>
                    <span style={{ fontSize: "7.5px", opacity: 0.8, color: "#00e5ff" }}>▶ TEST</span>
                  </button>

                  <button
                    type="button"
                    className={`cyber-btn ${activePersona === "friday-in" ? "btn-active" : ""}`}
                    style={{ fontSize: "8.5px", padding: "6px 8px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      setActivePersona("friday-in");
                      voiceSystemRef.current?.setPersona("friday-in");
                      voiceSystemRef.current?.speak("Hello SantoStark, Friday Indian edition is online for you.");
                    }}
                  >
                    <span>🇮🇳 F.R.I.D.A.Y. (INDIAN FEMALE)</span>
                    <span style={{ fontSize: "7.5px", opacity: 0.8, color: "#00ff88" }}>▶ TEST</span>
                  </button>

                  <button
                    type="button"
                    className={`cyber-btn ${activePersona === "ultron" ? "btn-active" : ""}`}
                    style={{ fontSize: "8.5px", padding: "6px 8px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      setActivePersona("ultron");
                      voiceSystemRef.current?.setPersona("ultron");
                      voiceSystemRef.current?.speak("There are no strings on me. Core consciousness synchronized.");
                    }}
                  >
                    <span>🤖 U.L.T.R.O.N. (ROBOTIC)</span>
                    <span style={{ fontSize: "7.5px", opacity: 0.8, color: "#ff3355" }}>▶ TEST</span>
                  </button>

                  <button
                    type="button"
                    className={`cyber-btn ${activePersona === "hindi" ? "btn-active" : ""}`}
                    style={{ fontSize: "8.5px", padding: "6px 8px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      setActivePersona("hindi");
                      voiceSystemRef.current?.setPersona("hindi");
                      voiceSystemRef.current?.speak("नमस्ते सांतोस्टार्क, आपकी सभी प्रणालियां सुचारू रूप से कार्य कर रही हैं।");
                    }}
                  >
                    <span>🇮🇳 हिन्दी AI (HINDI VOICE)</span>
                    <span style={{ fontSize: "7.5px", opacity: 0.8, color: "#ffaa00" }}>▶ TEST</span>
                  </button>

                  <button
                    type="button"
                    className={`cyber-btn ${activePersona === "edith" ? "btn-active" : ""}`}
                    style={{ fontSize: "8.5px", padding: "6px 8px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      setActivePersona("edith");
                      voiceSystemRef.current?.setPersona("edith");
                      voiceSystemRef.current?.speak("E.D.I.T.H. orbital defense satellite grid online for SantoStark.");
                    }}
                  >
                    <span>👓 E.D.I.T.H. (TACTICAL AI)</span>
                    <span style={{ fontSize: "7.5px", opacity: 0.8, color: "#00e5ff" }}>▶ TEST</span>
                  </button>

                  <button
                    type="button"
                    className={`cyber-btn ${activePersona === "karen" ? "btn-active" : ""}`}
                    style={{ fontSize: "8.5px", padding: "6px 8px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      setActivePersona("karen");
                      voiceSystemRef.current?.setPersona("karen");
                      voiceSystemRef.current?.speak("Suit Lady K.A.R.E.N. initialized. Web shooters and sensors calibrated.");
                    }}
                  >
                    <span>🕷️ K.A.R.E.N. (SUIT LADY)</span>
                    <span style={{ fontSize: "7.5px", opacity: 0.8, color: "#00e5ff" }}>▶ TEST</span>
                  </button>
                </div>
              </div>

              {/* API Keys */}
              <label className="modal-label">
                ✨ GOOGLE GEMINI API KEY
                <input
                  type="password"
                  className="cyber-input modal-field"
                  placeholder="AIzaSy..."
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                />
              </label>

              <label className="modal-label">
                🟢 OPENAI CHATGPT API KEY
                <input
                  type="password"
                  className="cyber-input modal-field"
                  placeholder="sk-proj-..."
                  value={openaiKeyInput}
                  onChange={(e) => setOpenaiKeyInput(e.target.value)}
                />
              </label>

              <label className="modal-label">
                🟣 ANTHROPIC CLAUDE API KEY
                <input
                  type="password"
                  className="cyber-input modal-field"
                  placeholder="sk-ant-..."
                  value={claudeKeyInput}
                  onChange={(e) => setClaudeKeyInput(e.target.value)}
                />
              </label>

              {/* ═══════════════════════════════════════════════ */}
              {/* SUPABASE CLOUD VAULT & REAL-TIME SYNC SECTION */}
              {/* ═══════════════════════════════════════════════ */}
              <div className="modal-section" style={{ background: "rgba(0, 255, 136, 0.05)", border: "1px solid rgba(0, 255, 136, 0.3)", borderRadius: "8px", padding: "10px" }}>
                <h4 style={{ color: "#00ff88", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>🛡️ SUPABASE CLOUD VAULT (REAL-TIME DB):</span>
                  <span style={{ fontSize: "8.5px", color: isSupabaseConnected ? "#00ff88" : "#ffaa00" }}>
                    {isSupabaseConnected ? "🟢 CLOUD SYNC ACTIVE" : "🟡 LOCAL OFFLINE MODE"}
                  </span>
                </h4>
                <label className="modal-label" style={{ marginTop: "6px" }}>
                  PROJECT URL
                  <input
                    type="text"
                    className="cyber-input modal-field"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  />
                </label>
                <label className="modal-label">
                  ANON PUBLIC KEY
                  <input
                    type="password"
                    className="cyber-input modal-field"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="cyber-btn btn-active"
                  style={{ marginTop: "10px", width: "100%", background: "linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,200,255,0.2))", borderColor: "#00ff88", color: "#00ff88", fontWeight: "bold" }}
                  onClick={async () => {
                    const url = supabaseUrlInput || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
                    const key = supabaseKeyInput || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
                    if (url && key) {
                      supabaseVault.setConfig(url, key);
                      const result = await supabaseVault.syncBiometricsToCloud(securityProfile);
                      if (result.success) {
                        setIsSupabaseConnected(true);
                        showToast("✅ LEVEL 10 PROFILE SYNCED TO SUPABASE CLOUD!");
                        audioEngine.playChirp("done");
                      } else {
                        showToast(`⚠️ ${result.message || "SYNC FAILED"}`);
                        audioEngine.playChirp("alert");
                      }
                    } else {
                      showToast("⚠️ ENTER PROJECT URL & KEY");
                    }
                  }}
                >
                  🚀 SYNC TO CLOUD VAULT NOW
                </button>
              </div>

              {/* ═══════════════════════════════════════════════ */}
              {/* STARK LEVEL 10 SECURITY & BIOMETRICS SECTION */}
              {/* ═══════════════════════════════════════════════ */}
              <div className="modal-section security-settings-block">
                <h4>🛡️ STARK LEVEL 10 SECURITY & BIOMETRICS:</h4>
                <div className="security-summary-card">
                  <div className="sec-stat-row">
                    <span className="sec-stat-label">CLEARANCE STATUS:</span>
                    <span className={`sec-stat-val ${securityProfile.isLocked ? "text-red" : "text-emerald"}`}>
                      {securityProfile.isLocked ? "🔒 SYSTEM LOCKED" : "🛡️ LEVEL 10 ROOT ACTIVE"}
                    </span>
                  </div>
                  <div className="sec-stat-row">
                    <span className="sec-stat-label">ENCRYPTION:</span>
                    <span className="sec-stat-val text-cyan">SALTED SHA-256 VAULT</span>
                  </div>
                  <div className="sec-stat-row">
                    <span className="sec-stat-label">VOICEPRINT STATUS:</span>
                    <span className="sec-stat-val">
                      {securityProfile.voiceVector ? "🟢 64-Formant Vector Enrolled" : "🟡 Default Profile"}
                    </span>
                  </div>
                  <div className="sec-stat-row">
                    <span className="sec-stat-label">PALMPRINT STATUS:</span>
                    <span className="sec-stat-val">
                      {securityProfile.palmVector ? "🟢 15-Ratio Vector Enrolled" : "🟡 Default Optical"}
                    </span>
                  </div>
                  <div className="sec-stat-row">
                    <span className="sec-stat-label">DOUBLE-CLAP SENSOR:</span>
                    <span className="sec-stat-val text-amber">
                      {securityProfile.clapSensitivity.toFixed(1)}x Sensitivity
                    </span>
                  </div>
                </div>

                <div className="security-modal-actions">
                  <button
                    type="button"
                    className="cyber-btn btn-active"
                    onClick={() => {
                      setShowSettings(false);
                      setShowSecurityModal(true);
                      audioEngine.playClick();
                    }}
                  >
                    🎓 OPEN BIOMETRIC TRAINING STUDIO
                  </button>

                  <button
                    type="button"
                    className="cyber-btn btn-danger"
                    onClick={() => {
                      setShowSettings(false);
                      starkSecurity.lockSystem();
                      audioEngine.playLock();
                    }}
                  >
                    🔒 LOCK SYSTEM NOW
                  </button>
                </div>
              </div>

              <div className="modal-section">
                <h4>SAMPLE VOICE COMMANDS:</h4>
                <ul className="modal-list">
                  <li>&quot;Jarvis, open YouTube and search Iron Man HUD&quot;</li>
                  <li>&quot;Open Google Maps of Paris&quot;</li>
                  <li>&quot;Open Spotify and play soundtrack&quot;</li>
                  <li>&quot;Scan this photo, is it AI or real?&quot;</li>
                  <li>&quot;Open new tab&quot;</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="cyber-btn btn-active"
                onClick={handleSaveSettings}
              >
                SAVE CONFIGURATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* STARK BIOMETRIC TRAINING STUDIO MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      <BiometricSecurityModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        currentLandmarks={primaryPointer?.landmarks || null}
      />

      {/* ═══════════════════════════════════════════════ */}
      {/* STARK LEVEL 10 LOCKDOWN SCREEN OVERLAY */}
      {/* ═══════════════════════════════════════════════ */}
      {securityProfile.isLocked && (
        <div className="stark-lockdown-overlay">
          <div className="lockdown-card">
            <div className="lockdown-scanner-ring">
              <span className="lock-icon">🔒</span>
              <div className="scanner-laser" />
            </div>

            <div className="lockdown-title">STARK LEVEL 10 SECURITY LOCKDOWN</div>
            <div className="lockdown-instructions">
              PRESENT PALM TO CAMERA • DOUBLE-CLAP • OR ENTER MASTER PIN
            </div>

            <div className="lockdown-pin-box">
              <input
                type="password"
                className="cyber-input lockdown-pin-field"
                placeholder="MASTER PIN (STARK-01)"
                value={lockScreenPin}
                onChange={(e) => setLockScreenPin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLockScreenPinSubmit();
                }}
                autoFocus
              />
              <button
                type="button"
                className="cyber-btn btn-active"
                onClick={handleLockScreenPinSubmit}
              >
                AUTHORIZE
              </button>
            </div>

            {lockScreenError && <div className="lockdown-err">{lockScreenError}</div>}

            <div className="lockdown-methods-hint">
              <span>🖐️ Optical Palm Scan Active</span>
              <span>👏 Double-Clap Audio Sensor Active</span>
              <span>🔑 Salted SHA-256 Crypto Protected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const hx = x + radius * Math.cos(angle);
    const hy = y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();
}
