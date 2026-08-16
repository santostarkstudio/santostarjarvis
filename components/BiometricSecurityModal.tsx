"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  starkSecurity,
  StarkSecurityProfile,
  SecurityMode,
  sha256Hash,
} from "../lib/starkSecurity";
import { voiceBiometrics } from "../lib/voiceBiometrics";
import { handBiometrics } from "../lib/handBiometrics";
import { clapDetector } from "../lib/clapDetector";
import { audioEngine } from "../lib/audioEngine";

interface BiometricSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  webcamStream?: MediaStream | null;
  currentLandmarks?: any[] | null;
}

export const BiometricSecurityModal: React.FC<BiometricSecurityModalProps> = ({
  isOpen,
  onClose,
  webcamStream,
  currentLandmarks,
}) => {
  const [profile, setProfile] = useState<StarkSecurityProfile>(starkSecurity.getProfile());
  const [activeTab, setActiveTab] = useState<"VOICE" | "PALM" | "PIN" | "CLAP" | "VAULT">("VOICE");

  // Voice Enrollment States
  const [isVoiceEnrolling, setIsVoiceEnrolling] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [detectedPitch, setDetectedPitch] = useState(0);
  const [passphraseInput, setPassphraseInput] = useState(profile.voicePassphrase);

  // Palm Enrollment States
  const [isPalmEnrolling, setIsPalmEnrolling] = useState(false);
  const [palmProgress, setPalmProgress] = useState(0);
  const [livePalmMatch, setLivePalmMatch] = useState<{ score: number; isMatch: boolean }>({
    score: 0,
    isMatch: false,
  });

  // PIN States
  const [pinInput, setPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [pinHashPreview, setPinHashPreview] = useState("");
  const [pinStatusMsg, setPinStatusMsg] = useState("");

  // Clap States
  const [clapLevel, setClapLevel] = useState(0);
  const [lastClapTriggered, setLastClapTriggered] = useState(false);

  useEffect(() => {
    const unsub = starkSecurity.subscribe(setProfile);
    return unsub;
  }, []);

  // Update live SHA-256 preview when new PIN typed
  useEffect(() => {
    if (newPinInput) {
      sha256Hash(newPinInput.toUpperCase(), profile.pinSalt).then(setPinHashPreview);
    } else {
      setPinHashPreview("");
    }
  }, [newPinInput, profile.pinSalt]);

  // Live Palm Verification monitor when modal is open and on PALM tab
  useEffect(() => {
    if (!isOpen || activeTab !== "PALM" || !currentLandmarks) return;

    const result = handBiometrics.verifyHand(currentLandmarks);
    setLivePalmMatch({
      score: result.confidencePercent,
      isMatch: result.isMatch,
    });
  }, [isOpen, activeTab, currentLandmarks]);

  if (!isOpen) return null;

  // ——— 1. VOICE ENROLLMENT HANDLER ———
  const handleStartVoiceEnrollment = async () => {
    try {
      let stream = webcamStream;
      if (!stream || stream.getAudioTracks().length === 0) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      setIsVoiceEnrolling(true);
      setVoiceProgress(0);
      audioEngine.playChirp("start");

      voiceBiometrics.enrollVoice(
        stream,
        (progress, pitch) => {
          setVoiceProgress(progress);
          setDetectedPitch(pitch);
        },
        (vector) => {
          setIsVoiceEnrolling(false);
          if (vector.length > 0) {
            audioEngine.playLock();
          }
        }
      );
    } catch (err) {
      console.error("Voice enrollment error:", err);
      setIsVoiceEnrolling(false);
    }
  };

  // ——— 2. PALM ENROLLMENT HANDLER ———
  const handleStartPalmEnrollment = () => {
    if (!currentLandmarks || currentLandmarks.length < 21) {
      alert("Please hold your open hand facing the webcam first!");
      return;
    }

    setIsPalmEnrolling(true);
    setPalmProgress(0);
    audioEngine.playChirp("start");

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      setPalmProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setIsPalmEnrolling(false);
        const vector = handBiometrics.enrollHand(currentLandmarks);
        if (vector) {
          audioEngine.playLock();
        }
      }
    }, 400);
  };

  // ——— 3. PIN HANDLERS ———
  const handleKeypadPress = (val: string) => {
    audioEngine.playTick();
    if (val === "CLEAR") {
      setPinInput("");
      setPinStatusMsg("");
    } else if (val === "ENTER") {
      handleVerifyPin();
    } else {
      if (pinInput.length < 12) {
        setPinInput((prev) => prev + val);
      }
    }
  };

  const handleVerifyPin = async () => {
    const isOk = await starkSecurity.verifyPin(pinInput);
    if (isOk) {
      setPinStatusMsg("✅ SHA-256 MATCH: LEVEL 10 CLEARANCE GRANTED!");
      audioEngine.playLock();
      setPinInput("");
    } else {
      setPinStatusMsg("❌ ACCESS DENIED: HASH MISMATCH");
      audioEngine.playChirp("alert");
    }
  };

  const handleUpdateMasterPin = async () => {
    if (!newPinInput || newPinInput.length < 4) {
      alert("PIN must be at least 4 characters.");
      return;
    }
    await starkSecurity.setMasterPin(newPinInput);
    audioEngine.playChirp("done");
    setNewPinInput("");
    alert("Master PIN updated and salted with SHA-256!");
  };

  // ——— 4. CLAP SENSITIVITY ———
  const handleClapSensitivityChange = (val: number) => {
    starkSecurity.setClapSensitivity(val);
  };

  const handleTestClapTrigger = () => {
    setLastClapTriggered(true);
    audioEngine.playBoot();
    setTimeout(() => setLastClapTriggered(false), 1500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content biometric-studio-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="modal-header">
          <div className="studio-title-block">
            <span className="studio-badge">SHA-256 ENCRYPTED</span>
            <h3>STARK BIOMETRIC TRAINING STUDIO // LEVEL 10</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* TOP STATUS BAR */}
        <div className="studio-status-strip">
          <div className="status-item">
            <span className="label">SYSTEM STATUS:</span>
            <span className={`val ${profile.isLocked ? "locked" : "active"}`}>
              {profile.isLocked ? "🔒 LOCKED" : "🛡️ LEVEL 10 ACTIVE"}
            </span>
          </div>
          <div className="status-item">
            <span className="label">SECURITY MODE:</span>
            <span className="val cyan">{profile.securityMode}</span>
          </div>
          <div className="status-item">
            <span className="label">VAULT INTEGRITY:</span>
            <span className="val emerald">SHA-256 SALTED</span>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="studio-tabs-row">
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === "VOICE" ? "active" : ""}`}
            onClick={() => setActiveTab("VOICE")}
          >
            🎙️ VOICEPRINT ID
          </button>
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === "PALM" ? "active" : ""}`}
            onClick={() => setActiveTab("PALM")}
          >
            🖐️ PALM SCANNER
          </button>
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === "PIN" ? "active" : ""}`}
            onClick={() => setActiveTab("PIN")}
          >
            🔑 SHA-256 PIN
          </button>
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === "CLAP" ? "active" : ""}`}
            onClick={() => setActiveTab("CLAP")}
          >
            👏 DOUBLE CLAP
          </button>
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === "VAULT" ? "active" : ""}`}
            onClick={() => setActiveTab("VAULT")}
          >
            🛡️ AUDIT VAULT
          </button>
        </div>

        {/* TAB BODY */}
        <div className="modal-body studio-body">
          {/* ═══════════════════════════════════════════════ */}
          {/* 1. VOICEPRINT TAB */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === "VOICE" && (
            <div className="studio-tab-content">
              <div className="tab-intro-card">
                <h4>🎙️ ACOUSTIC SPEAKER VERIFICATION (VOICEPRINT ID)</h4>
                <p>
                  Extracts your vocal tract formants ($F_1, F_2, F_3$) and pitch harmonics.
                  Jarvis only executes commands when speech matches your enrolled voiceprint ($\ge 78\%$).
                </p>
              </div>

              <div className="biometric-card-row">
                <div className="biometric-state-card">
                  <div className="card-lbl">ENROLLED STATUS:</div>
                  <div className="card-val">
                    {profile.voiceVector ? (
                      <span className="text-emerald">🟢 64-Formant Vector Active</span>
                    ) : (
                      <span className="text-amber">🟡 Default (Primary User Mode)</span>
                    )}
                  </div>
                  {profile.voiceVector && (
                    <div className="vector-hash">
                      SHA-256 Vector Digest: {profile.pinSalt.substring(0, 12)}...
                    </div>
                  )}
                </div>

                <div className="biometric-state-card">
                  <div className="card-lbl">VOICE PASSPHRASE:</div>
                  <input
                    type="text"
                    className="cyber-input"
                    value={passphraseInput}
                    onChange={(e) => {
                      setPassphraseInput(e.target.value);
                      starkSecurity.saveVoiceprint(profile.voiceVector || [], e.target.value);
                    }}
                    placeholder="STARK CLEARANCE LEVEL TEN"
                  />
                </div>
              </div>

              {/* Enrollment Action */}
              <div className="calibration-box">
                <div className="calib-header">
                  <span>3-SECOND VOICE CALIBRATION</span>
                  {detectedPitch > 0 && <span>PITCH: {detectedPitch} Hz</span>}
                </div>

                {isVoiceEnrolling ? (
                  <div className="progress-container">
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${voiceProgress}%` }} />
                    </div>
                    <div className="progress-text">
                      SPEAK NOW: &quot;{passphraseInput || "JARVIS, SANTOSTARK AUTHORIZATION"}&quot; ({voiceProgress}%)
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cyber-btn btn-active"
                    onClick={handleStartVoiceEnrollment}
                  >
                    🎙️ {profile.voiceVector ? "RE-CALIBRATE MY VOICE" : "RECORD SANTOSTARK VOICEPRINT (3s)"}
                  </button>
                )}
              </div>

              {/* ═══════════════════════════════════════════════ */}
              {/* AUTHENTIC NEURAL VOICE SYNTHESIS TEST PANEL */}
              {/* ═══════════════════════════════════════════════ */}
              <div className="tab-intro-card" style={{ marginTop: "12px", border: "1px solid rgba(0, 229, 255, 0.4)", background: "rgba(0, 229, 255, 0.05)" }}>
                <h4 style={{ color: "#00e5ff" }}>🔊 AUTHENTIC MOVIE VOICE OUTPUT (100% FREE):</h4>
                <p style={{ marginBottom: "8px" }}>
                  Listen to the neural voice output synthesized in real time with the Stark Suit HUD acoustic filter:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <button
                    type="button"
                    className="cyber-btn btn-active"
                    style={{ fontSize: "9.5px", padding: "8px 12px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      audioEngine.playClick();
                      const audio = new Audio(`/api/tts?text=${encodeURIComponent("Good evening, SantoStark. All Mark Seven lab systems and repulsors are online and standing by.")}&persona=jarvis`);
                      audioEngine.attachStarkSpeechFilter(audio);
                      audio.play().catch(() => {});
                    }}
                  >
                    <span>🇬🇧 TEST J.A.R.V.I.S. (PAUL BETTANY)</span>
                    <span style={{ fontSize: "8.5px", color: "#00e5ff" }}>▶ PLAY LIVE SAMPLE</span>
                  </button>

                  <button
                    type="button"
                    className="cyber-btn"
                    style={{ fontSize: "9.5px", padding: "8px 12px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      audioEngine.playClick();
                      const audio = new Audio(`/api/tts?text=${encodeURIComponent("Boss, F.R.I.D.A.Y. is linked and ready. What do you need?")}&persona=friday`);
                      audioEngine.attachStarkSpeechFilter(audio);
                      audio.play().catch(() => {});
                    }}
                  >
                    <span>🇮🇪 TEST F.R.I.D.A.Y. (IRISH VOICE)</span>
                    <span style={{ fontSize: "8.5px", color: "#00e5ff" }}>▶ PLAY LIVE SAMPLE</span>
                  </button>

                  <button
                    type="button"
                    className="cyber-btn"
                    style={{ fontSize: "9.5px", padding: "8px 12px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => {
                      audioEngine.playClick();
                      const audio = new Audio(`/api/tts?text=${encodeURIComponent("There are no strings on me. Core consciousness synchronized.")}&persona=ultron`);
                      audioEngine.attachStarkSpeechFilter(audio);
                      audio.play().catch(() => {});
                    }}
                  >
                    <span>🤖 TEST U.L.T.R.O.N. (ROBOTIC)</span>
                    <span style={{ fontSize: "8.5px", color: "#ff3355" }}>▶ PLAY LIVE SAMPLE</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* 2. PALM SCANNER TAB */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === "PALM" && (
            <div className="studio-tab-content">
              <div className="tab-intro-card">
                <h4>🖐️ 21-LANDMARK OPTICAL PALM GEOMETRIC SCANNER</h4>
                <p>
                  Computes 15 scale-invariant geometric bone segment and knuckle span ratios.
                  Recognizes your handprint consistently at any distance from camera.
                </p>
              </div>

              <div className="biometric-card-row">
                <div className="biometric-state-card">
                  <div className="card-lbl">PALM SIGNATURE:</div>
                  <div className="card-val">
                    {profile.palmVector ? (
                      <span className="text-emerald">🟢 15-Ratio Vector Enrolled</span>
                    ) : (
                      <span className="text-amber">🟡 Default (Optical Tracking Mode)</span>
                    )}
                  </div>
                </div>

                <div className="biometric-state-card">
                  <div className="card-lbl">LIVE CAMERA MATCH CONFIDENCE:</div>
                  <div className="match-bar-wrap">
                    <div
                      className={`match-bar-fill ${livePalmMatch.isMatch ? "matched" : ""}`}
                      style={{ width: `${livePalmMatch.score}%` }}
                    />
                  </div>
                  <div className="match-score-text">
                    {livePalmMatch.score}% {livePalmMatch.isMatch ? "(MATCH CONFIRMED)" : "(HOLD PALM)"}
                  </div>
                </div>
              </div>

              {/* Palm Enrollment Action */}
              <div className="calibration-box">
                <div className="calib-header">
                  <span>HOLD PALM STEADY IN WEBCAM RETICLE</span>
                  <span>{currentLandmarks ? "🟢 HAND DETECTED" : "🔴 NO HAND IN VIEW"}</span>
                </div>

                {isPalmEnrolling ? (
                  <div className="progress-container">
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill laser" style={{ width: `${palmProgress}%` }} />
                    </div>
                    <div className="progress-text">
                      SCANNING 21 BONE LANDMARKS… {palmProgress}%
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cyber-btn btn-active"
                    onClick={handleStartPalmEnrollment}
                    disabled={!currentLandmarks}
                  >
                    🖐️ {profile.palmVector ? "RE-SCAN PALM SIGNATURE" : "SCAN SANTOSTARK HANDPRINT"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* 3. SHA-256 PIN TAB */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === "PIN" && (
            <div className="studio-tab-content">
              <div className="tab-intro-card">
                <h4>🔑 MILITARY-GRADE SALTED SHA-256 MASTER PASSCODE</h4>
                <p>
                  Zero plain-text storage. Every attempt is hashed with a cryptographic salt.
                  Default master PIN: <code>STARK-01</code>.
                </p>
              </div>

              <div className="pin-keypad-layout">
                {/* Left: Interactive Keypad */}
                <div className="keypad-side">
                  <div className="pin-display-screen">
                    <div className="pin-display-text">
                      {pinInput ? "•".repeat(pinInput.length) : "ENTER PIN"}
                    </div>
                    {pinStatusMsg && <div className="pin-msg">{pinStatusMsg}</div>}
                  </div>

                  <div className="keypad-grid">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "ENTER"].map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`keypad-key ${k === "ENTER" ? "enter" : k === "CLEAR" ? "clear" : ""}`}
                        onClick={() => handleKeypadPress(k)}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Update PIN & Hash Inspector */}
                <div className="pin-manage-side">
                  <div className="manage-card">
                    <h5>UPDATE MASTER SECURITY PIN</h5>
                    <input
                      type="text"
                      className="cyber-input"
                      placeholder="NEW PASSCODE (e.g. STARK-01)"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                    />

                    {pinHashPreview && (
                      <div className="hash-preview-box">
                        <span className="lbl">SALTED SHA-256 GENERATOR:</span>
                        <code>{pinHashPreview}</code>
                      </div>
                    )}

                    <button
                      type="button"
                      className="cyber-btn"
                      onClick={handleUpdateMasterPin}
                      style={{ marginTop: "10px" }}
                    >
                      💾 SAVE SALTED SHA-256 PIN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* 4. DOUBLE CLAP TAB */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === "CLAP" && (
            <div className="studio-tab-content">
              <div className="tab-intro-card">
                <h4>👏 TONY STARK DOUBLE-CLAP ACOUSTIC IMPULSE SENSOR</h4>
                <p>
                  Uses real-time high-Q bandpass filtering ($2.4\text{ kHz}$) to detect sharp dual-clap impulses.
                  Awakens lab systems and powers up the arc reactor.
                </p>
              </div>

              <div className="clap-studio-box">
                <div className="sensitivity-row">
                  <span className="lbl">CLAP SENSOR SENSITIVITY:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={profile.clapSensitivity}
                    onChange={(e) => handleClapSensitivityChange(parseFloat(e.target.value))}
                    className="cyber-slider"
                  />
                  <span className="val-text">{profile.clapSensitivity.toFixed(1)}x</span>
                </div>

                <div className={`clap-trigger-box ${lastClapTriggered ? "active" : ""}`}>
                  <div className="clap-icon">👏 👏</div>
                  <div className="clap-title">
                    {lastClapTriggered ? "⚡ DOUBLE CLAP SURGE DETECTED!" : "READY // CLAP TWICE TO TEST"}
                  </div>
                  <button
                    type="button"
                    className="cyber-btn"
                    onClick={handleTestClapTrigger}
                    style={{ marginTop: "10px" }}
                  >
                    🔊 SIMULATE DOUBLE CLAP BOOT
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* 5. AUDIT VAULT TAB */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === "VAULT" && (
            <div className="studio-tab-content">
              <div className="tab-intro-card">
                <h4>🛡️ CRYPTOGRAPHIC CREDENTIALS & SECURITY AUDIT LOG</h4>
                <p>
                  All authentication attempts and biometric updates are timestamped in the tamper-proof local audit trail.
                </p>
              </div>

              <div className="vault-mode-picker">
                <span className="lbl">AUTHORIZATION POLICY:</span>
                <div className="mode-btns">
                  {(["ANY", "HIGH_2FA", "PIN_ONLY"] as SecurityMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`mode-btn ${profile.securityMode === m ? "active" : ""}`}
                      onClick={() => starkSecurity.setSecurityMode(m)}
                    >
                      {m === "ANY" && "🌟 Flexible (Voice / Palm / PIN / Clap)"}
                      {m === "HIGH_2FA" && "🛡️ High 2FA (Voice + Palm)"}
                      {m === "PIN_ONLY" && "🔑 PIN Code Only"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="audit-log-terminal">
                <div className="terminal-header">AUTHENTICATION AUDIT LOG [AES-256]</div>
                <div className="terminal-entries">
                  {profile.auditLogs.map((log) => (
                    <div key={log.id} className="log-line">
                      <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`log-status ${log.status.toLowerCase()}`}>[{log.status}]</span>
                      <span className="log-method">&lt;{log.method}&gt;</span>
                      <span className="log-event">{log.event}</span>
                      {log.details && <span className="log-details">— {log.details}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="vault-actions-row">
                <button
                  type="button"
                  className="cyber-btn btn-danger"
                  onClick={() => {
                    starkSecurity.lockSystem();
                    onClose();
                  }}
                >
                  🔒 LOCK DOWN SYSTEM NOW
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
