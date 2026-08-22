"""
FastAPI & WebSocket Bridge:
Connects the Python Jarvis Brain with the Next.js 3D WebGL Holographic Frontend in real-time.
"""

import os
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from brain import brain
from memory import memory
from tools import tools

app = FastAPI(title="Jarvis Neural Bridge API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from proactive import friday_protocol

@app.on_event("startup")
async def proactive_startup_event():
    print("[JARVIS] Initiating Proactive Protocols...")
    friday_protocol.start()

@app.on_event("shutdown")
def shutdown_event():
    print("[JARVIS] Shutting down Proactive Protocols...")
    friday_protocol.stop()


class ChatRequest(BaseModel):
    prompt: str
    persona: str = "jarvis"


class ChatResponse(BaseModel):
    response: str
    engine: str = "Hybrid Gemini 2.0 / Ollama"
    memorySummary: str


@app.get("/")
def root():
    return {
        "status": "ONLINE",
        "system": "J.A.R.V.I.S. Neural Bridge",
        "clearance": "Level 10 (SantoStark)",
    }

class LaunchRequest(BaseModel):
    app_name: str

@app.post("/launch")
def handle_launch(req: LaunchRequest):
    result = tools.open_app(req.app_name)
    return {"success": True, "message": result}

class MediaRequest(BaseModel):
    action: str

@app.post("/api/os/media")
def handle_media(req: MediaRequest):
    try:
        import pyautogui
        action = req.action.lower()
        if action == "play" or action == "pause" or action == "playpause":
            pyautogui.press("playpause")
            return {"success": True, "message": "Toggled media playback"}
        elif action == "next":
            pyautogui.press("nexttrack")
            return {"success": True, "message": "Playing next track"}
        elif action == "prev" or action == "previous":
            pyautogui.press("prevtrack")
            return {"success": True, "message": "Playing previous track"}
        elif action == "volup":
            pyautogui.press("volumeup")
            return {"success": True, "message": "Volume increased"}
        elif action == "voldown":
            pyautogui.press("volumedown")
            return {"success": True, "message": "Volume decreased"}
        else:
            return {"success": False, "message": "Unknown media action"}
    except ImportError:
        return {"success": False, "message": "pyautogui not installed. Run: pip install pyautogui"}
    except Exception as e:
        return {"success": False, "message": str(e)}

class VectorMemoryRequest(BaseModel):
    action: str
    text: str

@app.post("/api/vector_memory")
def handle_vector_memory(req: VectorMemoryRequest):
    if req.action == "add":
        success = memory.add_memory(req.text)
        return {"success": success}
    elif req.action == "search":
        results = memory.search_memory(req.text)
        return {"success": True, "results": results}
    return {"success": False, "error": "Invalid action"}

@app.post("/api/chat", response_model=ChatResponse)
def handle_chat(req: ChatRequest):
    answer = brain.ask(req.prompt)
    return ChatResponse(
        response=answer,
        engine="Gemini 2.0 Flash / Ollama",
        memorySummary=memory.get_all_context_summary(),
    )


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast_json(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

async def telemetry_monitor_task():
    try:
        import psutil
    except ImportError:
        return
        
    while True:
        await asyncio.sleep(60)
        try:
            cpu = psutil.cpu_percent(interval=0.1)
            ram = psutil.virtual_memory().percent
            if cpu > 90.0:
                await manager.broadcast_json({
                    "type": "AGENT_STATUS",
                    "status": "COMPLETED",
                    "message": f"Sir, I must warn you, the CPU load is critically high at {cpu} percent."
                })
            elif ram > 90.0:
                await manager.broadcast_json({
                    "type": "AGENT_STATUS",
                    "status": "COMPLETED",
                    "message": f"Sir, system memory is reaching maximum capacity at {ram} percent."
                })
        except Exception:
            pass

@app.on_event("startup")
async def telemetry_startup_event():
    asyncio.create_task(telemetry_monitor_task())

@app.websocket("/ws/jarvis")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            response = brain.ask(data)
            await websocket.send_json({
                "type": "RESPONSE",
                "text": response,
                "telemetry": tools.get_system_telemetry(),
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)

class SpawnRequest(BaseModel):
    task_description: str


from swarm import swarm_orchestrator

async def background_agent_task(task_description: str):
    await manager.broadcast_json({
        "type": "AGENT_STATUS",
        "status": "STARTED",
        "message": f"House Party Protocol activated. Swarm dispatched for: {task_description}"
    })
    
    try:
        final_result = await swarm_orchestrator.dispatch_swarm(task_description)
    except Exception as e:
        final_result = f"Swarm encountered an error: {e}"
    
    await manager.broadcast_json({
        "type": "AGENT_STATUS",
        "status": "COMPLETED",
        "message": f"Swarm finished: {final_result}"
    })
    
@app.post("/api/agents/spawn")
async def spawn_agent(req: SpawnRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(background_agent_task, req.task_description)
    return {"success": True, "message": "Agent spawned successfully"}

class TimerRequest(BaseModel):
    seconds: int
    message: str

async def background_timer_task(seconds: int, message: str):
    await asyncio.sleep(seconds)
    await manager.broadcast_json({
        "type": "AGENT_STATUS",
        "status": "COMPLETED",
        "message": f"Sir, your timer is up: {message}"
    })

@app.post("/api/agents/timer")
async def start_timer(req: TimerRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(background_timer_task, req.seconds, req.message)
    return {"success": True, "message": "Timer started successfully"}

class BlackoutRequest(BaseModel):
    enabled: bool

@app.post("/api/security/blackout")
async def toggle_blackout(req: BlackoutRequest):
    brain.air_gapped_mode = req.enabled
    mode = "ENABLED" if req.enabled else "DISABLED"
    return {"success": True, "message": f"Protocol Blackout {mode}"}

if __name__ == "__main__":
    import uvicorn
    print("\n[⚡ STARTING JARVIS NEURAL BRIDGE ON http://localhost:8000]")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
