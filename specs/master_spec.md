# 📐 J.A.R.V.I.S. Master Engineering Specification

## 1. System Vision & Architecture
J.A.R.V.I.S. (Just A Rather Very Intelligent System) is an autonomous multimodal personal AI desktop copilot built for **SantoStark**.

```
                         ┌─────────────────────────┐
                         │   SANTOSTARK (User)     │
                         └────────────┬────────────┘
                                      │ (Voice / Touch / Hands)
                                      ▼
                         ┌─────────────────────────┐
                         │   Holographic 3D HUD    │ (Three.js Untouched Orb)
                         └────────────┬────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │                                                   │
            ▼                                                   ▼
┌─────────────────────────┐                           ┌─────────────────────────┐
│ Real-Time Voice Engine  │                           │  Autonomous Tool Router │
│ (VAD + Barge-In Audio)  │                           │  (Windows OS + Vision)  │
└───────────┬─────────────┘                           └────────────┬────────────┘
            │                                                      │
            └─────────────────────────┬────────────────────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   Tiered AI Core        │
                         │  (Groq/Gemini/Ollama)   │
                         └────────────┬────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │                                                   │
            ▼                                                   ▼
┌─────────────────────────┐                           ┌─────────────────────────┐
│   Stark Memory Vault    │                           │ Real-Time World Intel   │
│  (SQLite Persistent)    │                           │ (13+ Parallel Sources)  │
└─────────────────────────┘                           └─────────────────────────┘
```

---

## 2. Core Subsystems

### A. 3D Visual Holographic Orb (`lib/orbScene.ts`)
- **Status:** Locked & Preserved.
- Custom WebGL/Three.js shader mesh rendering the pulsing Arc Reactor core, inner energy spheres, and audio-reactive particle rings.

### B. Stark Memory Vault (`jarvis_brain/memory_vault.py` & `/api/memory`)
- Local SQLite database (`stark_memory.sqlite`) storing:
  - User identity, personal directives, preferences.
  - Important notes, reminders, project knowledge.
  - Session history summaries.

### C. Native Windows Computer Control (`/api/system/launch` & `lib/deviceAutomation.ts`)
- Safe execution engine for:
  - App Launcher (Spotify, VS Code, Chrome, Terminal, Notepad, Calculator, Explorer).
  - System commands (Volume adjustment, workstation lock, screen capture).

### D. Real-Time Voice & Audio Interruption (`lib/jarvisVoice.ts`)
- Full-duplex speech synthesis & recognition with active barge-in cancellation.

### E. Multi-Source Global Intel (`lib/realtimeWorldIntel.ts`)
- 13+ zero-key parallel live data feeds: Weather, News, Stocks, Crypto, Sports/Cricket, Reddit, GitHub, Movies, Music, Forex, Wikipedia, Web Search, Math.
