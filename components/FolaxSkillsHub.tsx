import React, { useState } from "react";

interface FolaxSkillsHubProps {
  isOpen: boolean;
  onClose: () => void;
  userTranscript: string;
  aiResponse: string;
  isListening: boolean;
  isSpeaking: boolean;
  onToggleVoice: () => void;
  onSelectPrompt: (prompt: string) => void;
  onOpenAppTab: (app: "youtube" | "maps" | "whatsapp" | "email" | "camera" | "empty") => void;
  onTriggerAction: (action: string) => void;
}

interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  sections: {
    title: string;
    items: { text: string; hot?: boolean; app?: string; actionType?: string }[];
  }[];
}

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "social",
    name: "Social",
    icon: "📞",
    sections: [
      {
        title: "Phone",
        items: [
          { text: "Call mom", hot: true },
          { text: "Redial" },
        ],
      },
      {
        title: "WhatsApp",
        items: [
          { text: "Call mom on WhatsApp", app: "whatsapp" },
          { text: "Send my recent photo to mom on WhatsApp", hot: true, app: "whatsapp" },
        ],
      },
    ],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: "🎭",
    sections: [
      {
        title: "Music",
        items: [
          { text: "Play music", app: "youtube" },
          { text: "Play album \"Timeless\"", hot: true, app: "youtube" },
          { text: "Play a Kendrick Lamar song", app: "youtube" },
          { text: "I want to listen to rock music", app: "youtube" },
          { text: "Play Rema's song on Spotify", app: "youtube" },
        ],
      },
      {
        title: "Videos",
        items: [
          { text: "Play videos about football", app: "youtube" },
          { text: "Play popular videos", app: "youtube" },
        ],
      },
      {
        title: "FM",
        items: [{ text: "Listen to FM" }],
      },
      {
        title: "Customization",
        items: [
          { text: "Sing a Christmas song" },
          { text: "New year wishes" },
        ],
      },
      {
        title: "Jokes",
        items: [{ text: "Tell me a joke" }],
      },
    ],
  },
  {
    id: "tools",
    name: "Tools",
    icon: "🛠️",
    sections: [
      {
        title: "Camera",
        items: [
          { text: "Open Camera", app: "camera" },
          { text: "Take selfies", app: "camera" },
          { text: "Ask About Your Screen (Forensic Scanner)", hot: true, actionType: "forensics" },
        ],
      },
      {
        title: "Alarms",
        items: [
          { text: "Set an alarm for 8 AM every Wednesday", hot: true },
          { text: "What time is it now?" },
        ],
      },
      {
        title: "Applications",
        items: [
          { text: "Open Facebook" },
          { text: "Search Spotify", app: "youtube" },
          { text: "Open WhatsApp", app: "whatsapp" },
          { text: "Open YouTube", app: "youtube" },
        ],
      },
      {
        title: "Devices",
        items: [
          { text: "Boost phone (Clear Telemetry RAM)", hot: true, actionType: "boost" },
          { text: "Turn off GPS" },
          { text: "Set screen timeout" },
          { text: "Enable screen auto-rotation" },
          { text: "Turn on Do Not Disturb" },
        ],
      },
      {
        title: "Settings",
        items: [
          { text: "Change my wallpaper (Switch Theme)", actionType: "theme" },
          { text: "Turn up the brightness" },
          { text: "Reset my lockscreen password", actionType: "lock" },
        ],
      },
    ],
  },
  {
    id: "life",
    name: "Life",
    icon: "🌟",
    sections: [
      {
        title: "Weather",
        items: [
          { text: "How's the weather today?", hot: true },
          { text: "London's temperature tomorrow." },
          { text: "Bengaluru 3-day weather forecast" },
        ],
      },
      {
        title: "Navigation",
        items: [
          { text: "Go to Office", app: "maps" },
          { text: "What are the restaurants nearby?", app: "maps" },
          { text: "Directions to the train station", app: "maps" },
        ],
      },
      {
        title: "Drive",
        items: [
          { text: "Remember the parking space" },
          { text: "Where's my car?" },
        ],
      },
    ],
  },
  {
    id: "knowledge",
    name: "Knowledge",
    icon: "📚",
    sections: [
      {
        title: "Real-Time News Briefing",
        items: [
          { text: "Todays latest news", hot: true },
          { text: "India-focused breaking news" },
          { text: "International sports & football news" },
        ],
      },
      {
        title: "Football",
        items: [
          { text: "Show me Premier League goal ranking" },
          { text: "Show scores between Liverpool and Manchester City" },
        ],
      },
      {
        title: "Geography",
        items: [
          { text: "What's the capital of Nigeria?" },
          { text: "What's the highest mountain in the world?" },
        ],
      },
      {
        title: "Encyclopedia",
        items: [
          { text: "What is APEC ?" },
          { text: "Which has more calories, potatoes or rice?" },
          { text: "When is Lionel Messi's birthday?" },
          { text: "Delhi HC: Critical Medical updates" },
          { text: "Explore blue eyes" },
        ],
      },
    ],
  },
  {
    id: "companion",
    name: "Companion",
    icon: "💖",
    sections: [
      {
        title: "About Me",
        items: [
          { text: "Self-introduction" },
          { text: "Do you have a favorite poet or poem?" },
          { text: "Tell me Tony Stark's daily rules" },
        ],
      },
    ],
  },
  {
    id: "creation",
    name: "Creation",
    icon: "🪐",
    sections: [
      {
        title: "Reading Assistant",
        items: [
          { text: "Document Q&A" },
          { text: "Link Q&A" },
        ],
      },
      {
        title: "Creative Tools",
        items: [
          { text: "Create empty holographic workspace", app: "empty" },
          { text: "New AI design tools" },
        ],
      },
    ],
  },
];

export const FolaxSkillsHub: React.FC<FolaxSkillsHubProps> = ({
  isOpen,
  onClose,
  userTranscript,
  aiResponse,
  isListening,
  isSpeaking,
  onToggleVoice,
  onSelectPrompt,
  onOpenAppTab,
  onTriggerAction,
}) => {
  const [mainView, setMainView] = useState<"dialogue" | "explore" | "skills_drawer">("explore");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("social");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const handleItemClick = (item: { text: string; actionType?: string; app?: string }) => {
    if (item.app) {
      onOpenAppTab(item.app as any);
    }
    if (item.actionType) {
      onTriggerAction(item.actionType);
    }
    onSelectPrompt(item.text);
    setMainView("dialogue");
  };

  const selectedCategory = SKILL_CATEGORIES.find((c) => c.id === selectedCategoryId) || SKILL_CATEGORIES[0];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        background: "rgba(0, 4, 12, 0.82)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          height: "92vh",
          maxHeight: "92vh",
          background: "linear-gradient(180deg, #11141a 0%, #0a0c10 100%)",
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 -20px 60px rgba(0, 0, 0, 0.9)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#fff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
          <div style={{ width: "42px", height: "4.5px", background: "rgba(255, 255, 255, 0.25)", borderRadius: "3px" }} />
        </div>

        {/* Header (Exact Folax Style) */}
        <div style={{ padding: "8px 20px 12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              <button
                onClick={() => setMainView("dialogue")}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  fontWeight: mainView === "dialogue" ? "700" : "400",
                  color: mainView === "dialogue" ? "#ffffff" : "rgba(255, 255, 255, 0.45)",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                Dialogue
              </button>
              <button
                onClick={() => setMainView("explore")}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "22px",
                  fontWeight: mainView !== "dialogue" ? "700" : "400",
                  color: mainView !== "dialogue" ? "#ffffff" : "rgba(255, 255, 255, 0.45)",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                Explore
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                onClick={() => setMainView("skills_drawer")}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
                title="SantoStark Identity"
              >
                👤
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: "#fff",
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* VIEW 1: DIALOGUE VIEW (Folax Intelligent Chat UI) */}
        {/* ═══════════════════════════════════════════════════ */}
        {mainView === "dialogue" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Folax Assistant Header */}
            <div
              style={{
                padding: "12px 20px",
                background: "rgba(255, 255, 255, 0.03)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #1ad1b5 0%, #0077ff 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#fff",
                }}
              >
                ⚡
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: "700" }}>
                  Hi, I'm J.A.R.V.I.S. | STARK AI Smart Assistant
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "rgba(255, 255, 255, 0.5)" }}>
                  AI Empowerment • Intelligent Conversation • Device Assistant
                </p>
              </div>
            </div>

            {/* Conversation Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* User Bubble */}
              {userTranscript && (
                <div style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
                  <div
                    style={{
                      background: "#3b5998",
                      color: "#fff",
                      padding: "10px 16px",
                      borderRadius: "18px",
                      borderBottomRightRadius: "4px",
                      fontSize: "13.5px",
                    }}
                  >
                    {userTranscript}
                  </div>
                </div>
              )}

              {/* J.A.R.V.I.S. Structured Response Bubble */}
              <div style={{ alignSelf: "flex-start", maxWidth: "96%", width: "100%" }}>
                <div
                  style={{
                    background: "#1f2229",
                    color: "rgba(255, 255, 255, 0.95)",
                    padding: "16px 18px",
                    borderRadius: "18px",
                    borderBottomLeftRadius: "4px",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-line",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  {aiResponse}
                </div>
                <div style={{ marginTop: "6px", fontSize: "9.5px", color: "rgba(255, 255, 255, 0.35)", textAlign: "center" }}>
                  Content generated by AI. For reference only.
                </div>
              </div>
            </div>

            {/* Bottom Quick Chips & Mic Bar */}
            <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", background: "#11141a" }}>
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px" }}>
                {["Todays latest news", "How's the weather today?", "What is Bitcoin price today?", "Tell me a joke", "Explode 3D Orb"].map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectPrompt(chip)}
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.8)",
                      padding: "6px 12px",
                      borderRadius: "16px",
                      fontSize: "11.5px",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
                <button
                  onClick={onToggleVoice}
                  style={{
                    flex: 1,
                    background: isListening ? "#ff4444" : "linear-gradient(135deg, #00e5ff 0%, #0077ff 100%)",
                    border: "none",
                    color: "#fff",
                    padding: "12px",
                    borderRadius: "14px",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: isListening ? "0 0 15px rgba(255, 68, 68, 0.5)" : "0 0 15px rgba(0, 229, 255, 0.3)",
                  }}
                >
                  {isListening ? "🔴 LISTENING... TAP TO STOP" : "🎙️ TAP TO SPEAK TO J.A.R.V.I.S."}
                </button>
                <button
                  onClick={() => setMainView("explore")}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    color: "#fff",
                    padding: "12px 16px",
                    borderRadius: "14px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Explore ➔
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* VIEW 2: EXPLORE DASHBOARD (Exact Folax Image 2-5)  */}
        {/* ═══════════════════════════════════════════════════ */}
        {mainView === "explore" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 40px" }}>
            {/* 1. Engaging Content (4 Grid Action Cards) */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "14px" }}>
                Engaging Content
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* WhatsApp */}
                <div
                  onClick={() => { onOpenAppTab("whatsapp"); onClose(); }}
                  style={{
                    background: "#1c2029",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#fff", lineHeight: "1.3" }}>
                    Call someone<br />on WhatsApp
                  </span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    📞
                  </div>
                </div>

                {/* Ask About Your Screen */}
                <div
                  onClick={() => { onTriggerAction("forensics"); onClose(); }}
                  style={{
                    background: "#1c2029",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#fff", lineHeight: "1.3" }}>
                    Ask About<br />Your Screen
                  </span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#00e5ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    📱
                  </div>
                </div>

                {/* Play Music */}
                <div
                  onClick={() => { onOpenAppTab("youtube"); onClose(); }}
                  style={{
                    background: "#1c2029",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>
                    Play music
                  </span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#4a76a8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    🎵
                  </div>
                </div>

                {/* Start Screen Recording */}
                <div
                  onClick={() => { onTriggerAction("record"); onClose(); }}
                  style={{
                    background: "#1c2029",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#fff", lineHeight: "1.3" }}>
                    Start screen<br />recording
                  </span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#6b8af6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    🎥
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Explore More (Horizontal Scrolling Pill Chips) */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "12px" }}>
                Explore More
              </h3>
              <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "6px" }}>
                {[
                  { text: "Kim Kardashian's Skims Launching...", tag: "NEW" },
                  { text: "New AI design tools", icon: "🎙️" },
                  { text: "Directions to the train station" },
                  { text: "Turn on Do Not Disturb", icon: "⚙️" },
                  { text: "How is the weather in Tokyo?" },
                ].map((chip, idx) => (
                  <div
                    key={idx}
                    onClick={() => { onSelectPrompt(chip.text); setMainView("dialogue"); }}
                    style={{
                      background: "#1f242e",
                      borderRadius: "20px",
                      padding: "8px 16px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    {chip.tag && (
                      <span style={{ background: "#2563eb", color: "#fff", fontSize: "9px", fontWeight: "bold", padding: "1px 5px", borderRadius: "4px" }}>
                        {chip.tag}
                      </span>
                    )}
                    {chip.icon && <span>{chip.icon}</span>}
                    <span>{chip.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Skills List: Hot Leaderboard */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "12px" }}>
                Skills List
              </h3>
              <div style={{ background: "#1a1d24", borderRadius: "20px", padding: "18px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>Hot</span>
                  <span style={{ fontSize: "20px" }}>🏆</span>
                </div>
                {[
                  { rank: "1", title: "Delhi HC: Critical Medical ...", query: "Delhi HC: Critical Medical updates", rankBg: "#e06c55" },
                  { rank: "2", title: "Explore blue eyes", query: "Explore blue eyes genetics and origins", rankBg: "#d99b26" },
                  { rank: "3", title: "Reset my lockscreen pass...", query: "How to reset lockscreen password", rankBg: "#8a96a8" },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: i < 2 ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "4px",
                          background: item.rankBg,
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {item.rank}
                      </span>
                      <span style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.9)" }}>{item.title}</span>
                    </div>
                    <button
                      onClick={() => { onSelectPrompt(item.query); setMainView("dialogue"); }}
                      style={{
                        background: "rgba(0, 255, 136, 0.12)",
                        border: "none",
                        color: "#00e676",
                        padding: "5px 12px",
                        borderRadius: "14px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Try
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Folax Is Also Capable Of (Categorized Cards) */}
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "14px" }}>
                J.A.R.V.I.S. Is Also Capable of
              </h3>

              {/* Device Assistant Card */}
              <div style={{ background: "#1a1d24", borderRadius: "20px", padding: "18px", marginBottom: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <h4 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: "700", color: "#fff" }}>Device Assistant</h4>
                <p style={{ margin: "0 0 14px", fontSize: "11.5px", color: "rgba(255, 255, 255, 0.45)" }}>Provide considerate services.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {["Set screen timeout", "How's the weather today?", "Enable screen auto-rotation"].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { onSelectPrompt(p); setMainView("dialogue"); }}
                      style={{
                        background: "#242833",
                        border: "none",
                        borderRadius: "12px",
                        padding: "11px 16px",
                        color: "rgba(255, 255, 255, 0.9)",
                        textAlign: "left",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Music Player Card */}
              <div style={{ background: "#1a1d24", borderRadius: "20px", padding: "18px", marginBottom: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <h4 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: "700", color: "#fff" }}>Music Player</h4>
                <p style={{ margin: "0 0 14px", fontSize: "11.5px", color: "rgba(255, 255, 255, 0.45)" }}>Enjoy an immersive listening experience.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {["Play a Kendrick Lamar song", "I want to listen to rock music", "Play Rema's song on Spotify"].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { onOpenAppTab("youtube"); onSelectPrompt(p); setMainView("dialogue"); }}
                      style={{
                        background: "#242833",
                        border: "none",
                        borderRadius: "12px",
                        padding: "11px 16px",
                        color: "rgba(255, 255, 255, 0.9)",
                        textAlign: "left",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Encyclopedia Card */}
              <div style={{ background: "#1a1d24", borderRadius: "20px", padding: "18px", marginBottom: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <h4 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: "700", color: "#fff" }}>Encyclopedia</h4>
                <p style={{ margin: "0 0 14px", fontSize: "11.5px", color: "rgba(255, 255, 255, 0.45)" }}>Open the door to knowledge.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {["What is APEC ?", "Which has more calories, potatoes or rice?", "When is Lionel Messi's birthday?"].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { onSelectPrompt(p); setMainView("dialogue"); }}
                      style={{
                        background: "#242833",
                        border: "none",
                        borderRadius: "12px",
                        padding: "11px 16px",
                        color: "rgba(255, 255, 255, 0.9)",
                        textAlign: "left",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apps Box Card */}
              <div style={{ background: "#1a1d24", borderRadius: "20px", padding: "18px", marginBottom: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <h4 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: "700", color: "#fff" }}>Apps Box</h4>
                <p style={{ margin: "0 0 14px", fontSize: "11.5px", color: "rgba(255, 255, 255, 0.45)" }}>Tap once to access various apps.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { label: "Open AI Gallery / Forensic Cam", app: "camera" },
                    { label: "Open WhatsApp", app: "whatsapp" },
                    { label: "Open YouTube", app: "youtube" },
                  ].map((appObj, i) => (
                    <button
                      key={i}
                      onClick={() => { onOpenAppTab(appObj.app as any); onSelectPrompt(appObj.label); setMainView("dialogue"); }}
                      style={{
                        background: "#242833",
                        border: "none",
                        borderRadius: "12px",
                        padding: "11px 16px",
                        color: "rgba(255, 255, 255, 0.9)",
                        textAlign: "left",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      {appObj.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Joy Card */}
              <div style={{ background: "#1a1d24", borderRadius: "20px", padding: "18px", marginBottom: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <h4 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: "700", color: "#fff" }}>Joy</h4>
                <p style={{ margin: "0 0 14px", fontSize: "11.5px", color: "rgba(255, 255, 255, 0.45)" }}>Light up your life.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {["Tell me a joke", "Sing a Christmas song", "New year wishes"].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { onSelectPrompt(p); setMainView("dialogue"); }}
                      style={{
                        background: "#242833",
                        border: "none",
                        borderRadius: "12px",
                        padding: "11px 16px",
                        color: "rgba(255, 255, 255, 0.9)",
                        textAlign: "left",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Big Green Explore More Button */}
              <button
                onClick={() => setMainView("skills_drawer")}
                style={{
                  width: "100%",
                  background: "#00c853",
                  border: "none",
                  borderRadius: "26px",
                  padding: "14px",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  marginTop: "10px",
                  boxShadow: "0 4px 20px rgba(0, 200, 83, 0.35)",
                }}
              >
                Explore More Skills
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* VIEW 3: FULL 7-CATEGORY SKILLS DRAWER (Images 6-9) */}
        {/* ═══════════════════════════════════════════════════ */}
        {mainView === "skills_drawer" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Top Subheader with Back Button and Search Icon */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => setMainView("explore")}
                  style={{ background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}
                >
                  ←
                </button>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700" }}>Skills</h3>
              </div>
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "#1c2029",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "16px",
                  padding: "6px 12px",
                  fontSize: "11.5px",
                  color: "#fff",
                  width: "140px",
                  outline: "none",
                }}
              />
            </div>

            {/* 2-Column Rail Layout */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Left Rail */}
              <div style={{ width: "90px", background: "#0c0e14", borderRight: "1px solid rgba(255, 255, 255, 0.06)", overflowY: "auto", padding: "8px 0" }}>
                {SKILL_CATEGORIES.map((cat) => {
                  const isSelected = cat.id === selectedCategoryId;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "14px 4px",
                        cursor: "pointer",
                        background: isSelected ? "#1c2029" : "transparent",
                        borderLeft: isSelected ? "3px solid #00e5ff" : "3px solid transparent",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: isSelected ? "rgba(0, 229, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                          marginBottom: "4px",
                        }}
                      >
                        {cat.icon}
                      </div>
                      <span style={{ fontSize: "10.5px", fontWeight: isSelected ? "700" : "400", color: isSelected ? "#00e5ff" : "rgba(255, 255, 255, 0.6)" }}>
                        {cat.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Right Content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 40px" }}>
                {selectedCategory.sections.map((sec, sIdx) => (
                  <div key={sIdx} style={{ marginBottom: "22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                      <div style={{ width: "3px", height: "13px", background: "#00e5ff", borderRadius: "2px" }} />
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#fff" }}>
                        {sec.title}
                      </h4>
                      <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>&gt;</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {sec.items
                        .filter((it) => it.text.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((item, iIdx) => (
                          <div
                            key={iIdx}
                            onClick={() => handleItemClick(item)}
                            style={{
                              background: "#1c2029",
                              borderRadius: "12px",
                              padding: "11px 15px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                            }}
                          >
                            <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.9)" }}>
                              {item.text}
                            </span>
                            {item.hot && (
                              <span style={{ fontSize: "12px" }}>🔥</span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
