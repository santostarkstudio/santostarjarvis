import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MEMORY_FILE = path.join(process.cwd(), "jarvis_brain", "jarvis_memory.json");

interface MemoryStore {
  profile: Record<string, string>;
  notes: Array<{ id: string; topic: string; content: string; date: string }>;
}

function getMemory(): MemoryStore {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn("[MemoryRoute] Read error:", e);
  }
  return {
    profile: {
      user_name: "SantoStark",
      user_role: "Master Creator / Boss",
      primary_project: "U.L.T.R.O.N. / J.A.R.V.I.S.",
    },
    notes: [
      {
        id: "m-1",
        topic: "Creator Profile",
        content: "SantoStark is the chief creator and developer of JARVIS.",
        date: new Date().toISOString(),
      },
    ],
  };
}

function saveMemory(store: MemoryStore) {
  try {
    const dir = path.dirname(MEMORY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    console.error("[MemoryRoute] Save error:", e);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "all";
  const store = getMemory();

  if (action === "summary") {
    const notesStr = store.notes.slice(-5).map((n) => `• [${n.topic}]: ${n.content}`).join("\n");
    const summary = `SantoStark Profile:\n• Creator: ${store.profile.user_name || "SantoStark"}\n• Project: ${store.profile.primary_project || "JARVIS"}\n\nRecent Memories:\n${notesStr}`;
    return NextResponse.json({ summary });
  }

  return NextResponse.json(store);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, topic, content, key, value } = body;
    const store = getMemory();

    if (action === "set_profile" && key && value) {
      store.profile[key] = value;
      saveMemory(store);
      return NextResponse.json({ success: true, message: `Profile '${key}' updated to '${value}'` });
    }

    if (action === "add_note" || (topic && content)) {
      const newNote = {
        id: `note-${Date.now()}`,
        topic: topic || "General Note",
        content: content || "",
        date: new Date().toISOString(),
      };
      store.notes.push(newNote);
      saveMemory(store);
      return NextResponse.json({ success: true, note: newNote, message: `Memory saved: ${newNote.topic}` });
    }

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update memory" }, { status: 500 });
  }
}
