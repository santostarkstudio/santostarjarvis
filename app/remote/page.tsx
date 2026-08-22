"use client";

import React, { useState, useEffect } from "react";

export default function StarkMobileRemotePage() {
  const [gyroActive, setGyroActive] = useState(false);
  const [gyroCoords, setGyroCoords] = useState<{ alpha: number; beta: number; gamma: number }>({
    alpha: 0,
    beta: 0,
    gamma: 0,
  });
  const [activeTheme, setActiveTheme] = useState("arc");
  const [statusMsg, setStatusMsg] = useState("LINKED TO STARK MAIN DECK");
  const [isMicActive, setIsMicActive] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>("NONE");

  // Broadcast Channel for Real-Time Sync to Main Screen
  useEffect(() => {
    const channel = new BroadcastChannel("stark_remote_sync");

    // Listen for incoming sync from laptop
    channel.onmessage = (event) => {
      if (event.data?.type === "THEME_CHANGED") {
        setActiveTheme(event.data.theme);
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const sendCommand = (type: string, payload: any = {}) => {
    try {
      const channel = new BroadcastChannel("stark_remote_sync");
      channel.postMessage({ type, payload, timestamp: Date.now() });
      channel.close();

      // Also mirror to localStorage for across-window sync
      localStorage.setItem("stark_remote_last_action", JSON.stringify({ type, payload, time: Date.now() }));
      setLastCommand(type);
      setStatusMsg(`SENT: ${type}`);
      setTimeout(() => setStatusMsg("LINKED TO STARK MAIN DECK"), 1500);
    } catch (e) {
      console.warn("[Remote Send Error]", e);
    }
  };

  // Gyroscope Motion Streamer
  const enableGyroscope = async () => {
    if (typeof window !== "undefined" && typeof (DeviceOrientationEvent as any)?.requestPermission === "function") {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== "granted") {
          alert("Motion sensor permission required for Stark Gyro remote.");
          return;
        }
      } catch (err) {
        console.warn("[Gyro Permission Warning]", err);
      }
    }

    window.addEventListener("deviceorientation", (e) => {
      const alpha = Math.round(e.alpha || 0);
      const beta = Math.round(e.beta || 0);
      const gamma = Math.round(e.gamma || 0);
      setGyroCoords({ alpha, beta, gamma });
      sendCommand("GYRO_UPDATE", { alpha, beta, gamma });
    });

    setGyroActive(true);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at center, #051428 0%, #000208 100%)",
        color: "#ffffff",
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px",
        userSelect: "none",
      }}
    >
      {/* Header Deck */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(0, 229, 255, 0.3)",
          paddingBottom: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#00e5ff", letterSpacing: "1.5px" }}>
            SANTOSTARK REMOTE // HUD SYNC
          </div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
            {statusMsg}
          </div>
        </div>
        <div
          style={{
            background: "rgba(0, 255, 136, 0.15)",
            border: "1px solid #00ff88",
            color: "#00ff88",
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "10px",
            fontFamily: "monospace",
          }}
        >
          🟢 LIVE
        </div>
      </div>

      {/* Gyroscope 3D Attitude Indicator */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(2, 10, 24, 0.8)",
          border: "1px solid rgba(0, 229, 255, 0.35)",
          borderRadius: "8px",
          padding: "14px",
          marginBottom: "16px",
          textAlign: "center",
          boxShadow: "0 0 20px rgba(0, 229, 255, 0.15)",
        }}
      >
        <div style={{ fontSize: "11px", color: "#00e5ff", fontWeight: "bold", marginBottom: "8px" }}>
          🧭 SPATIAL GYRO CONTROLLER
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "12px", fontFamily: "monospace", fontSize: "12px" }}>
          <div>PITCH: <span style={{ color: "#00ff88" }}>{gyroCoords.beta}°</span></div>
          <div>ROLL: <span style={{ color: "#00ff88" }}>{gyroCoords.gamma}°</span></div>
          <div>YAW: <span style={{ color: "#00ff88" }}>{gyroCoords.alpha}°</span></div>
        </div>
        {!gyroActive ? (
          <button
            type="button"
            onClick={enableGyroscope}
            style={{
              width: "100%",
              background: "linear-gradient(90deg, #0088ff 0%, #00e5ff 100%)",
              color: "#000",
              fontWeight: "bold",
              border: "none",
              borderRadius: "6px",
              padding: "10px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            📱 ENABLE GYROSCOPE STEERING
          </button>
        ) : (
          <div style={{ fontSize: "11px", color: "#00ff88" }}>✓ Gyroscope Steering Active on Main Screen</div>
        )}
      </div>

      {/* Quick Tactical Action Buttons */}
      <div style={{ width: "100%", maxWidth: "420px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        <button
          type="button"
          onClick={() => sendCommand("REPULSOR_BLAST")}
          style={{
            background: "radial-gradient(circle, rgba(255, 51, 85, 0.3) 0%, rgba(255, 51, 85, 0.1) 100%)",
            border: "1px solid #ff3355",
            color: "#ff3355",
            fontWeight: "bold",
            padding: "16px 10px",
            borderRadius: "8px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          💥 REPULSOR BLAST
        </button>

        <button
          type="button"
          onClick={() => sendCommand("VIBRANIUM_SHIELD")}
          style={{
            background: "radial-gradient(circle, rgba(0, 229, 255, 0.3) 0%, rgba(0, 229, 255, 0.1) 100%)",
            border: "1px solid #00e5ff",
            color: "#00e5ff",
            fontWeight: "bold",
            padding: "16px 10px",
            borderRadius: "8px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          🛡️ VIBRANIUM SHIELD
        </button>

        <button
          type="button"
          onClick={() => sendCommand("EXPLODE_ORB")}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            color: "#fff",
            padding: "14px 10px",
            borderRadius: "8px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          💥 EXPAND 3D CORE
        </button>

        <button
          type="button"
          onClick={() => sendCommand("LOCKDOWN_LAB")}
          style={{
            background: "rgba(255, 0, 60, 0.15)",
            border: "1px solid #ff003c",
            color: "#ff003c",
            fontWeight: "bold",
            padding: "14px 10px",
            borderRadius: "8px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          🚨 LAB LOCKDOWN
        </button>
      </div>

      {/* Theme Switcher Deck */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(2, 10, 24, 0.8)",
          border: "1px solid rgba(0, 229, 255, 0.3)",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginBottom: "8px", textAlign: "center" }}>
          🎨 SWITCH HUD COLOR THEME
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          {[
            { id: "arc", name: "CYAN", color: "#00e5ff" },
            { id: "ultron", name: "RED", color: "#ff1a40" },
            { id: "matrix", name: "GREEN", color: "#00ff88" },
            { id: "amber", name: "GOLD", color: "#ffb703" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTheme(t.id);
                sendCommand("CHANGE_THEME", { theme: t.id });
              }}
              style={{
                background: activeTheme === t.id ? t.color : "rgba(255,255,255,0.05)",
                color: activeTheme === t.id ? "#000" : t.color,
                border: `1px solid ${t.color}`,
                fontWeight: "bold",
                borderRadius: "4px",
                padding: "8px 4px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Mic Broadcast */}
      <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => {
            const next = !isMicActive;
            setIsMicActive(next);
            sendCommand("TOGGLE_MIC", { active: next });
          }}
          style={{
            width: "100%",
            background: isMicActive ? "#ff003c" : "rgba(0, 229, 255, 0.2)",
            border: isMicActive ? "2px solid #ff003c" : "1px solid #00e5ff",
            color: "#fff",
            fontWeight: "bold",
            borderRadius: "30px",
            padding: "14px",
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: isMicActive ? "0 0 25px rgba(255,0,60,0.6)" : "0 0 15px rgba(0,229,255,0.2)",
          }}
        >
          {isMicActive ? "🔴 MIC TRANSMITTING TO PC..." : "🎙️ PUSH TO TALK TO J.A.R.V.I.S."}
        </button>
      </div>
    </div>
  );
}
