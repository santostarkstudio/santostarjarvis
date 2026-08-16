# 🧠 J.A.R.V.I.S. Python Hybrid Brain Engine

A voice-activated and text-based personal AI assistant built in Python for **SantoStark** with Level 10 Root clearance.

---

## ⚡ Core Features

1. **Hybrid Brain Architecture**:
   - **Primary Tier**: Google Gemini 2.0 Flash via the official `google-genai` SDK.
   - **Offline Local Fallback**: Seamless automatic fallback to local **Ollama** (`llama3.1:8b` or `qwen2.5:7b`) if internet or cloud limits are reached.
2. **Comprehensive Tools & Live Search**:
   - **Keyless Web Search & India News**: `duckduckgo-search` for real-time news, weather, and world facts without paid keys.
   - **Persistent Storage**: Local JSON database (`jarvis_memory.json`) for notes, reminders, schedules, and user context.
   - **OS Automation & Screen Capture**: Safe desktop control via `pyautogui` and `os` to open Chrome, Notepad, YouTube, Spotify, and capture screenshots.
3. **Frontend Delivery Layer**:
   - **Voice Capture (STT)**: `SpeechRecognition` + `pyaudio` for room audio capture.
   - **Offline Speech (TTS)**: Low-latency `pyttsx3` voice audio output.
4. **WebGL Frontend Bridge**:
   - Optional FastAPI & WebSocket bridge (`server.py`) to connect directly with the **ULTRON Next.js 3D Holographic UI**!

---

## 📦 Installation & Setup Guide

### 1. Prerequisites (OS-Level Audio Dependencies)

#### On Windows:
```powershell
# Python 3.10+ recommended
pip install pipwin
pipwin install pyaudio
```

#### On Ubuntu / Debian Linux:
```bash
sudo apt update
sudo apt install python3-pyaudio portaudio19-dev libespeak1 ffmpeg
```

#### On macOS:
```bash
brew install portaudio espeak
```

---

### 2. Install Python Dependencies

In the `jarvis_brain/` directory:

```bash
pip install -r requirements.txt
```

---

### 3. Environment Configuration (Optional)

Create a `.env` file in `jarvis_brain/` (or project root):

```env
# Optional: If omitted, Jarvis runs automatically in local Ollama mode!
GEMINI_API_KEY=your_google_gemini_api_key_here
```

To enable the local fallback model (free & offline), install [Ollama](https://ollama.com) and run:
```bash
ollama run llama3.1:8b
```

---

### 4. Launching Jarvis

#### Option A: Unified Terminal & Voice Assistant (CLI)
```bash
python main.py
```
- Press **`[ENTER]`** with empty input to speak through your microphone!
- Or type prompts directly into the prompt line.

#### Option B: Real-Time FastAPI & WebSocket Bridge (for Next.js ULTRON UI)
```bash
python server.py
```
Runs the bridge on `http://localhost:8000`.

---

## 🗣️ Sample Commands to Try

* *"Jarvis, search the web for the latest SpaceX Starship news."*
* *"What is the current weather in Mumbai?"*
* *"Take a screenshot and store a note that meeting is at 6 PM."*
* *"Open Google Chrome and search for quantum computing."*
* *"List my active reminders."*
* *"Give me system telemetry."*
* *"Explain Einstein's theory of general relativity."*
