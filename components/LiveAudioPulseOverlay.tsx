"use client";

import React, { useEffect, useRef } from "react";
import { audioEngine } from "@/lib/audioEngine";

interface LiveAudioPulseOverlayProps {
  isListening: boolean;
  isSpeaking: boolean;
  activeTheme?: string;
  enabled?: boolean;
}

export const LiveAudioPulseOverlay: React.FC<LiveAudioPulseOverlayProps> = ({
  isListening,
  isSpeaking,
  activeTheme = "arc",
  enabled = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const pulsePhaseRef = useRef(0);
  const speechEnvelopeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      if (!isRunning) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(canvas.width, canvas.height) * 0.22;

      pulsePhaseRef.current += 0.04;

      // Fetch live real-time mic metrics
      const metrics = typeof (audioEngine as any).getAudioMetrics === "function" 
        ? audioEngine.getAudioMetrics() 
        : typeof (audioEngine as any).getMetrics === "function"
        ? (audioEngine as any).getMetrics()
        : { bass: 0, mid: 0, treble: 0, overall: 0, freqData: new Uint8Array(128), timeData: new Uint8Array(256) };
      const micVolume = isListening ? Math.max(metrics.overall, metrics.bass * 0.8) : 0;

      // Smooth speech envelope follower for Jarvis TTS output
      if (isSpeaking) {
        speechEnvelopeRef.current = Math.min(1.0, speechEnvelopeRef.current + 0.1);
      } else {
        speechEnvelopeRef.current = Math.max(0, speechEnvelopeRef.current - 0.05);
      }

      // Determine palette based on state and theme
      let primaryColor = "#00e5ff"; // Default Cyan
      let secondaryColor = "#00ff88"; // Emerald
      if (activeTheme === "ultron") {
        primaryColor = "#ff1a40";
        secondaryColor = "#ff5500";
      } else if (activeTheme === "amber") {
        primaryColor = "#ffb703";
        secondaryColor = "#00e5ff";
      }

      // ——— 1. USER SPEAKING (INPUT MIC LIVE SPECTRUM RING) ———
      if (isListening || micVolume > 0.05) {
        const audioData = metrics.freqData;
        const barCount = 48;
        const angleStep = (Math.PI * 2) / barCount;
        const spectrumRadius = baseRadius * 1.15;

        ctx.save();
        ctx.translate(centerX, centerY);

        // Circular frequency equalizer bars
        for (let i = 0; i < barCount; i++) {
          const angle = i * angleStep;
          const dataIndex = Math.floor((i / barCount) * (audioData.length / 2));
          const freqVal = (audioData[dataIndex] || 0) / 255;
          const barHeight = 8 + freqVal * 60 * (1 + micVolume);

          const x1 = Math.cos(angle) * spectrumRadius;
          const y1 = Math.sin(angle) * spectrumRadius;
          const x2 = Math.cos(angle) * (spectrumRadius + barHeight);
          const y2 = Math.sin(angle) * (spectrumRadius + barHeight);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 10;
          ctx.stroke();
        }

        // Concentric acoustic pulse wave
        const waveRadius = spectrumRadius + (Math.sin(pulsePhaseRef.current * 2) * 12 + micVolume * 40);
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(10, waveRadius), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 229, 255, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
      }

      // ——— 2. J.A.R.V.I.S. SPEAKING (OUTPUT ARC CORONA FLARE) ———
      if (speechEnvelopeRef.current > 0.01) {
        const env = speechEnvelopeRef.current;
        const speechPulse = Math.sin(pulsePhaseRef.current * 4) * 0.15 + 0.85;
        const flareRadius = baseRadius * (1.05 + env * 0.35 * speechPulse);

        ctx.save();
        ctx.translate(centerX, centerY);

        // Outward radiant holographic bloom
        const grad = ctx.createRadialGradient(0, 0, baseRadius * 0.7, 0, 0, flareRadius);
        grad.addColorStop(0, "rgba(255, 183, 3, 0)");
        grad.addColorStop(0.5, `rgba(0, 229, 255, ${0.18 * env})`);
        grad.addColorStop(1, `rgba(255, 183, 3, ${0.35 * env * speechPulse})`);

        ctx.beginPath();
        ctx.arc(0, 0, flareRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Radiating vocal wave rings
        for (let r = 1; r <= 3; r++) {
          const ringR = baseRadius * (0.9 + r * 0.15 + (pulsePhaseRef.current % 1) * 0.2);
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 200, 50, ${0.3 * (1 - (r * 0.25)) * env})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isListening, isSpeaking, activeTheme, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
};
