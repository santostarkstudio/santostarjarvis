"use client";

import { useEffect, useState, useRef } from "react";
import { MultiDisplaySyncEngine, type DisplayMessage } from "@/lib/multiDisplaySync";
import { type SpatialCard } from "@/lib/spatialWorkspace";
import { THEMES, applyThemeCss, type ThemeId } from "@/lib/themes";
import { type AssistantPersona } from "@/lib/jarvisVoice";
import { deviceAutomation, type DeviceState } from "@/lib/deviceAutomation";

export default function SatelliteDisplayPage() {
  const [activeTheme, setActiveTheme] = useState<ThemeId>("amber");
  const [activePersona, setActivePersona] = useState<AssistantPersona>("jarvis");
  const [projectedCard, setProjectedCard] = useState<SpatialCard | null>(null);
  const [devices, setDevices] = useState<DeviceState[]>(deviceAutomation.getDevices());
  const [isLinked, setIsLinked] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(Date.now());
  const syncEngineRef = useRef<MultiDisplaySyncEngine | null>(null);

  useEffect(() => {
    applyThemeCss("amber");
    const sync = new MultiDisplaySyncEngine("secondary_satellite");
    syncEngineRef.current = sync;

    const cleanup = sync.addListener((msg: DisplayMessage) => {
      setIsLinked(true);
      setLastMessageTime(Date.now());

      if (msg.type === "PROJECT_CARD" && msg.payload?.card) {
        setProjectedCard(msg.payload.card);
      } else if (msg.type === "RECALL_CARD" || msg.type === "CLOSE_PROJECTED") {
        setProjectedCard(null);
      } else if (msg.type === "SYNC_THEME" && msg.payload?.theme) {
        setActiveTheme(msg.payload.theme);
        applyThemeCss(msg.payload.theme);
      } else if (msg.type === "SYNC_PERSONA" && msg.payload?.persona) {
        setActivePersona(msg.payload.persona);
      }
    });

    // Check device automation updates
    deviceAutomation.setUpdateListener(() => {
      setDevices([...deviceAutomation.getDevices()]);
    });

    return () => {
      cleanup();
      sync.dispose();
    };
  }, []);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleRecall = () => {
    syncEngineRef.current?.sendMessage("RECALL_CARD");
    setProjectedCard(null);
  };

  return (
    <main className="satellite-viewport">
      {/* ═══════════════════════════════════════════════ */}
      {/* TOP SATELLITE HUD HEADER */}
      {/* ═══════════════════════════════════════════════ */}
      <header className="satellite-header">
        <div className="satellite-brand">
          <div className="hud-brand-title">
            <span className="hud-glitch-dot" /> STARK SATELLITE HUD // DISPLAY 2
          </div>
          <div className="satellite-sub">
            ROLE: AUXILIARY COMMAND WALL · CLEARANCE: LEVEL 10 (SANTOSTARK)
          </div>
        </div>

        <div className="satellite-status-group">
          <div className={`satellite-link-pill ${isLinked ? "linked" : "searching"}`}>
            <span className="status-dot" />
            {isLinked ? "LINKED TO PRIMARY ORB" : "SEARCHING FOR PRIMARY DISPLAY..."}
          </div>
          <div className="satellite-persona-pill">{activePersona.toUpperCase()} CORE</div>
          <button
            type="button"
            className="cyber-btn mini btn-active"
            onClick={handleFullscreenToggle}
          >
            ⛶ FULLSCREEN (F11)
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════ */}
      {/* MAIN SATELLITE STAGE */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="satellite-stage">
        {projectedCard ? (
          // PROJECTED CARD VIEW (IMAX STAGE)
          <div className="projected-imax-container">
            <div className="projected-header">
              <div className="projected-title-group">
                <span className="projected-badge">📡 LIVE SATELLITE PROJECTION</span>
                <h2 className="projected-title">{projectedCard.title}</h2>
                <span className="projected-sub">{projectedCard.subtitle}</span>
              </div>
              <div className="projected-actions">
                <button type="button" className="cyber-btn mini" onClick={handleRecall}>
                  ⬅️ RECALL TO MONITOR 1
                </button>
              </div>
            </div>

            <div className="projected-body">
              {projectedCard.category === "youtube" ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(
                    projectedCard.searchQuery || "Iron Man HUD Jarvis",
                  )}&autoplay=1`}
                  className="satellite-iframe"
                  title={projectedCard.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : projectedCard.category === "maps" ? (
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    projectedCard.searchQuery || "Manhattan, New York",
                  )}&t=k&z=14&ie=UTF8&iwloc=&output=embed`}
                  className="satellite-iframe"
                  title={projectedCard.title}
                />
              ) : projectedCard.category === "spotify" ? (
                <iframe
                  src="https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0"
                  className="satellite-iframe"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  title={projectedCard.title}
                />
              ) : projectedCard.category === "camera" ? (
                <div className="satellite-camera-feed">
                  <div className="tactical-grid-overlay" />
                  <div className="satellite-reticle" />
                  <span className="camera-feed-tag">[HIGH-ALTITUDE SATELLITE OPTICAL FEED // 4K 60FPS]</span>
                </div>
              ) : projectedCard.category === "video" && projectedCard.mediaSrc ? (
                <video
                  src={projectedCard.mediaSrc}
                  controls
                  autoPlay
                  className="satellite-video"
                  playsInline
                />
              ) : projectedCard.textContent ? (
                <div className="satellite-code-view">
                  <pre className="satellite-code-content">{projectedCard.textContent}</pre>
                </div>
              ) : projectedCard.imageSrc ? (
                <div className="satellite-image-view">
                  <img src={projectedCard.imageSrc} alt={projectedCard.title} className="satellite-img" />
                </div>
              ) : (
                <div className="satellite-generic-view">
                  <h3>{projectedCard.title}</h3>
                  <p>{projectedCard.subtitle}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // STANDBY AUXILIARY COMMAND WALL
          <div className="satellite-standby-grid">
            {/* Left: 3D Orbital Earth Wireframe HUD */}
            <div className="standby-card orbital-card">
              <div className="standby-card-header">
                <span>🛰️ ORBITAL SATELLITE SURVEILLANCE // GLOBAL GPS</span>
                <span className="status-live">SWARM ACTIVE</span>
              </div>
              <div className="orbital-canvas-box">
                <svg viewBox="0 0 400 300" className="orbital-wireframe-svg">
                  {/* Earth Sphere Grid */}
                  <circle cx="200" cy="150" r="100" fill="none" stroke="var(--theme-primary)" strokeWidth="1.5" />
                  <ellipse cx="200" cy="150" rx="100" ry="40" fill="none" stroke="var(--theme-secondary)" strokeWidth="1" strokeDasharray="4 2" />
                  <ellipse cx="200" cy="150" rx="100" ry="75" fill="none" stroke="var(--theme-secondary)" strokeWidth="0.8" strokeDasharray="3 3" />
                  <line x1="200" y1="50" x2="200" y2="250" stroke="var(--theme-secondary)" strokeWidth="1" strokeDasharray="3 3" />
                  {/* Satellites in Orbit */}
                  <circle cx="120" cy="110" r="5" fill="var(--theme-primary)" className="sat-dot" />
                  <circle cx="280" cy="180" r="5" fill="var(--theme-primary)" className="sat-dot" />
                  <circle cx="240" cy="80" r="6" fill="#00ff88" className="sat-dot" />
                  {/* Orbital ring */}
                  <ellipse cx="200" cy="150" rx="150" ry="60" fill="none" stroke="var(--theme-primary)" strokeWidth="1.2" transform="rotate(-20 200 150)" />
                </svg>
                <div className="orbital-hud-info">
                  <div>LAT: 40.7128° N · LON: 74.0060° W</div>
                  <div>ALTITUDE: 420.5 KM · ORBITAL VELOCITY: 7.66 KM/S</div>
                </div>
              </div>
            </div>

            {/* Right: Device Rack Telemetry Wall */}
            <div className="standby-card telemetry-card">
              <div className="standby-card-header">
                <span>🤖 NODE RACK // HARDWARE STATUS</span>
                <span className="status-live">{devices.length} NODES LINKED</span>
              </div>
              <div className="satellite-device-list">
                {devices.map((dev) => (
                  <div key={dev.id} className="satellite-device-row">
                    <div className="dev-header">
                      <span className="dev-name">{dev.model}</span>
                      <span className={`dev-pill ${dev.status}`}>{dev.status.toUpperCase()}</span>
                    </div>
                    <div className="dev-details">
                      <span>App: <strong>{dev.currentApp}</strong></span>
                      <span>Battery: <strong>{dev.battery}%</strong></span>
                      <span>Activity: <strong>{dev.lastAction}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="satellite-instructions-box">
                <div className="instructions-title">💡 HOW TO PROJECT FROM MONITOR 1:</div>
                <ul>
                  <li>Click <strong>[ 🖥️ MONITOR 2 ]</strong> on any floating card header.</li>
                  <li>Or say: <em>&quot;Jarvis, project YouTube to secondary screen&quot;</em>.</li>
                  <li>Or drag any tab to the right edge of your primary screen.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
