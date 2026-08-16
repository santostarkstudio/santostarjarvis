# ULTRON Holographic AI Interface // SANTO STARK

An Iron Man–inspired holographic AI interface built for **SantoStark** with **Next.js**, **Three.js**, **MediaPipe** hand tracking, **Web Speech API**, and **Multi-LLM intelligence (Gemini, ChatGPT, Claude)** — complete with real-time Jarvis voice interaction, procedural cyber sound effects, audio-reactive core geometry, 5 holographic themes, expanded gestures, and a telemetry diagnostics HUD.

> 🔮 **ULTRON — "A Voice with Hands"** — Dedicated AI system with Level 10 root access for **SantoStark**.

![ULTRON orb UI](docs/screenshot.png)

---

## ⚡ Features

* 🧲 **Holographic Spatial Workspace & Iron Man Air-Grabbing**:
  * **Precision Optical Laser Cursor**: Jitter-free hand tracking with dynamic HUD reticle and real-time $(X, Y, Z)$ telemetry coordinates.
  * **Air-Pinch Grab & Drag**: Pinch in mid-air to grab floating CAD blueprints and images with glowing **Magnetic Plasma Energy Tethers**.
  * **Air-Tap Virtual Touch**: Push index finger forward to click buttons and UI elements in mid-air without touching keyboard/mouse.
  * **Laser Air-Drawing (Stark Stylus)**: Sketch neon annotations and circles in mid-air on top of holograms.
  * **Repulsor Shockwave Blast**: Thrust open palm forward to emit a resonant sub-bass energy blast wave.
  * **Dual-Hand Bimanual Stretch & Rotate**: Pinch with two hands to scale up or rotate schematics.
  * **Throw to Device Rack**: Drag and throw blueprints directly onto connected Android devices.
  * **Preset Iron Man CAD Blueprints**: Mark VII Armor Wireframe, Arc Reactor Phase-3 CAD, Stark Recon Satellite, Neural Network Synapse Mesh, and Custom Image Uploads.
* 🎙️ **Multi-LLM Voice AI & Jarvis/Friday Assistant**:
  * Real-time Speech-to-Text & Text-to-Speech responses.
  * **Unified Multi-LLM Engine**: Switch between **Google Gemini**, **OpenAI ChatGPT**, **Anthropic Claude**, and **Auto-Free Live Web Knowledge**.
  * Real-time factual answers (real-world facts, coding, temporal date/time, math, science, and Android device automation).
  * Voice commands for themes, layer explosions, core compression, zoom, spatial blueprints, drawing, and diagnostics.
* 🔊 **Audio-Reactive 3D Core & Synthesizer SFX**:
  * Procedural cybernetic UI sounds (boot sweeps, repulsor blast thumps, magnetic grab hums, air-tap clicks, drawing hisses, suit-up locks).
  * Real-time microphone FFT audio analyzer modulating 3D geometry, core pulsating, and HUD equalizer bars.
* 🎨 **5 Multi-Color Holographic Themes**:
  * **Mark VII (Jarvis Amber / Gold)**
  * **Arc Reactor (Stark Electric Cyan)**
  * **Ultron Prime (Crimson Red)**
  * **Cyber Matrix (Neon Green)**
  * **Quantum (Amethyst Violet)**
* 🖐️ **Expanded Optical Hand Gestures (MediaPipe)**:
  * **Pinch (1 Hand)**: Grab & move floating holograms or spin the 3D orb.
  * **Pinch (2 Hands)**: Scale and stretch blueprints or zoom 3D orb.
  * **Point (👆)**: Laser pointer & Air-Tap virtual button click.
  * **Open Palm Forward (🖐️💥)**: Repulsor Shockwave blast or explode layers.
  * **Closed Fist (✊)**: Compress core into hyper-dense singularity.
  * **Dual Fists (✊💥✊)**: Suit-Up Mark VII Armor Protocol.
  * **Swipe (↔️)**: Cycle through holographic themes.
* 📊 **Futuristic Diagnostics HUD**:
  * Real-time FPS, draw calls, triangle count, reactor core output %, temperature, and flux density.
  * Live audio frequency equalizer & oscilloscope waveform monitor.

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🎮 Controls

### Hand Gestures (Webcam)
Press `G` or click **ENABLE GESTURES (G)**, then:
| Gesture | Action |
| --- | --- |
| **Point (👆) + Move** | High-precision Laser Cursor tracking |
| **Point (👆) + Push Forward** | **Air-Tap** (Virtual mouse click on UI) |
| **Pinch (🤏) over Blueprint** | **Magnetic Grab** with glowing plasma tethers |
| **Hold Pinch + Move Hand** | **Spatial Drag & Move** hologram across screen |
| **Release Pinch** | **Drop & Pin** schematic in place |
| **Pinch (2 Hands) & Spread** | **Scale / Enlarge** blueprint or zoom 3D orb |
| **Thrust Palm Forward (🖐️💥)** | **Repulsor Blast** shockwave explosion |
| **Dual Fists Together (✊💥✊)** | **Suit-Up Protocol** lock-on sequence |
| **Wrist Twist while Pinching** | **Rotary Dial** (Rotate card / adjust parameters) |
| **Swipe (↔️)** | Cycle color themes |

### Mouse / Touch Fallback
| Input | Action |
| --- | --- |
| Click & Drag Card | Move floating blueprints anywhere |
| Click & Drag Orb | Spin 3D core |
| Scroll | Zoom in & out |

### Keyboard Shortcuts
| Key | Action |
| --- | --- |
| `G` | Toggle webcam gestures |
| `D` | Toggle Laser Air-Drawing Mode |
| `B` | Trigger Repulsor Shockwave Blast |
| `V` | Toggle Voice AI listening |
| `M` | Toggle Microphone audio reactivity |
| `E` | Toggle Explode mode |
| `C` | Toggle Compress / Singularity mode |
| `R` | Reset camera coordinates |
| `+` / `−` | Zoom in / out |
| `1` – `5` | Switch Holographic Themes (Amber, Cyan, Red, Green, Violet) |

---

## 🏗️ Architecture

- **`lib/orbScene.ts`** — Three.js holographic scene: multi-layered wireframe shells, spiral geodesic inner core, floating code text, orbiting debris, particle dust, scan rings, audio-reactive deformation, layer expansion/compression, and bloom.
- **`lib/handTracker.ts`** — MediaPipe hand tracking engine with adaptive sub-pixel low-pass filtering, real-time laser cursor coordinates, air-tap, magnetic grabbing, air-drawing, repulsor blast, rotary dials, and dual-hand scaling.
- **`lib/spatialWorkspace.ts`** — Holographic spatial workspace managing floating CAD blueprints, custom image holograms, spatial hit-testing, magnetic tethers, and air-drawing strokes.
- **`lib/audioEngine.ts`** — Web Audio API procedural synthesizer for sci-fi SFX (repulsor blasts, magnetic grab hums, air-tap clicks, pneumatic drops, suit-up locks) and live microphone FFT spectrum analyzer.
- **`lib/jarvisVoice.ts`** — Voice AI assistant engine supporting Web Speech STT/TTS, command dispatching, and Multi-LLM integration.
- **`lib/themes.ts`** — 5 dynamic holographic theme configurations with synchronized Three.js materials and CSS custom properties.
- **`components/JarvisOrb.tsx`** — Complete HUD layout, spatial workspace canvas, laser cursor overlay, telemetry diagnostics, AI transceiver, and live visualizer.

---

## License

MIT
