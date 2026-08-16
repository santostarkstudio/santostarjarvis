"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const JarvisOrb = dynamic(() => import("@/components/JarvisOrb"), {
  ssr: false,
});

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // 1-second display timer before smooth fade transition
    const timer = setTimeout(() => {
      setIsFading(true);
      const removeTimer = setTimeout(() => {
        setShowSplash(false);
      }, 500); // 500ms fade transition
      return () => clearTimeout(removeTimer);
    }, 1000); // 1.0s full screen splash

    return () => clearTimeout(timer);
  }, []);

  return (
    <main style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <JarvisOrb />

      {showSplash && (
        <div className={`stark-startup-screen ${isFading ? "fade-out" : ""}`}>
          <img
            src="/api/startup-image"
            alt="I am Iron Man"
            className="stark-fullscreen-bg"
          />

          <div className="stark-lightning-glow" />

          <div className="stark-boot-hud">
            <div className="stark-boot-title">INITIALIZING S.A.N.T.O CORE SYSTEM…</div>
            <div className="stark-boot-sub">[ ARC REACTOR ONLINE // SANTOSTARK LEVEL 10 CLEARANCE ]</div>
            <div className="stark-boot-progress">
              <div className="stark-boot-bar" />
            </div>
          </div>

          <style>{`
            .stark-startup-screen {
              position: fixed;
              inset: 0;
              z-index: 999999;
              background: #000000;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-end;
              padding-bottom: 48px;
              color: #00e5ff;
              font-family: monospace;
              letter-spacing: 0.2em;
              overflow: hidden;
              transition: opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .stark-startup-screen.fade-out {
              opacity: 0;
              transform: scale(1.04);
              pointer-events: none;
            }

            .stark-fullscreen-bg {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center;
              filter: brightness(0.95) contrast(1.1);
              animation: heroZoom 1.5s ease-out forwards;
            }

            .stark-lightning-glow {
              position: absolute;
              inset: 0;
              background: radial-gradient(circle at 50% 45%, rgba(0, 229, 255, 0.18) 0%, transparent 60%);
              animation: lightningFlicker 1.2s infinite alternate;
              pointer-events: none;
            }

            .stark-boot-hud {
              position: relative;
              z-index: 20;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              background: rgba(2, 8, 16, 0.75);
              padding: 14px 28px;
              border-radius: 24px;
              border: 1px solid rgba(0, 229, 255, 0.35);
              box-shadow: 0 0 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 229, 255, 0.2);
              backdrop-filter: blur(12px);
              animation: fadeInUp 0.4s ease-out;
            }

            .stark-boot-title {
              font-size: 14px;
              font-weight: bold;
              color: #00e5ff;
              text-shadow: 0 0 12px rgba(0, 229, 255, 0.9);
              letter-spacing: 0.25em;
            }

            .stark-boot-sub {
              font-size: 9px;
              color: #ffaa30;
              letter-spacing: 0.15em;
              opacity: 0.9;
              text-shadow: 0 0 8px rgba(255, 170, 48, 0.7);
            }

            .stark-boot-progress {
              width: 260px;
              height: 3.5px;
              background: rgba(0, 229, 255, 0.2);
              border-radius: 2px;
              overflow: hidden;
              margin-top: 6px;
              position: relative;
            }

            .stark-boot-bar {
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, #ffaa00, #00e5ff, #00ff88, #bf55ff);
              animation: bootProgress 1.0s ease-in-out infinite;
              box-shadow: 0 0 12px #00e5ff;
            }

            @keyframes heroZoom {
              0% { transform: scale(1.08); }
              100% { transform: scale(1.0); }
            }

            @keyframes lightningFlicker {
              0% { opacity: 0.4; }
              50% { opacity: 0.9; }
              100% { opacity: 0.6; }
            }

            @keyframes fadeInUp {
              0% { opacity: 0; transform: translateY(12px); }
              100% { opacity: 1; transform: translateY(0); }
            }

            @keyframes bootProgress {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
      )}
    </main>
  );
}
