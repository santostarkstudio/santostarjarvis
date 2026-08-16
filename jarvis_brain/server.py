"""
FastAPI & WebSocket Bridge:
Connects the Python Jarvis Brain with the Next.js 3D WebGL Holographic Frontend in real-time.
"""

import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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


@app.post("/api/chat", response_model=ChatResponse)
def handle_chat(req: ChatRequest):
    answer = brain.ask(req.prompt)
    return ChatResponse(
        response=answer,
        engine="Gemini 2.0 Flash / Ollama",
        memorySummary=memory.get_all_context_summary(),
    )


@app.websocket("/ws/jarvis")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
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
        pass


if __name__ == "__main__":
    import uvicorn
    print("\n[⚡ STARTING JARVIS NEURAL BRIDGE ON http://localhost:8000]")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
