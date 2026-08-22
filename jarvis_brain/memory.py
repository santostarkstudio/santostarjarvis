import json
import os
import time
import uuid
from typing import Any, Dict, List, Optional

try:
    import chromadb
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False
    print("[WARNING] chromadb is not installed. Long-Term Vector Memory is disabled.")

MEMORY_FILE_PATH = os.path.join(os.path.dirname(__file__), "jarvis_memory.json")
CHROMA_DB_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")

class JarvisMemory:
    """
    Persistent JSON Storage Layer + ChromaDB Vector Vault for Jarvis.
    """

    def __init__(self, filepath: str = MEMORY_FILE_PATH):
        self.filepath = filepath
        self._ensure_file()
        
        self.chroma_client = None
        self.collection = None
        if CHROMA_AVAILABLE:
            try:
                self.chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
                self.collection = self.chroma_client.get_or_create_collection(name="stark_vault")
                print("[INFO] ChromaDB Vector Vault initialized successfully.")
            except Exception as e:
                print(f"[ERROR] Failed to initialize ChromaDB: {e}")

    def _ensure_file(self) -> None:
        if not os.path.exists(self.filepath):
            default_data = {
                "owner": "SantoStark",
                "clearance_level": 10,
                "notes": [],
                "reminders": [],
                "schedules": [],
                "user_preferences": {
                    "preferred_persona": "jarvis",
                    "voice_speed_wpm": 180,
                    "search_region": "in-en",
                },
                "key_value_store": {},
            }
            self._save(default_data)

    def _load(self) -> Dict[str, Any]:
        try:
            with open(self.filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {
                "owner": "SantoStark",
                "clearance_level": 10,
                "notes": [],
                "reminders": [],
                "schedules": [],
                "user_preferences": {},
                "key_value_store": {},
            }

    def _save(self, data: Dict[str, Any]) -> None:
        try:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[MEMORY ERROR] Could not save database: {e}")

    # ——— NOTES ———
    def add_note(self, content: str, category: str = "general") -> str:
        data = self._load()
        note_id = f"note_{int(time.time())}"
        note = {
            "id": note_id,
            "content": content,
            "category": category,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        data.setdefault("notes", []).append(note)
        self._save(data)
        return f"Note recorded: '{content}' (Category: {category})"

    def get_notes(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        data = self._load()
        notes = data.get("notes", [])
        if category:
            return [n for n in notes if n.get("category") == category]
        return notes

    # ——— REMINDERS & SCHEDULES ———
    def add_reminder(self, text: str, target_time_str: str) -> str:
        data = self._load()
        reminder = {
            "id": f"rem_{int(time.time())}",
            "text": text,
            "target_time": target_time_str,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "completed": False,
        }
        data.setdefault("reminders", []).append(reminder)
        self._save(data)
        return f"Reminder established for {target_time_str}: '{text}'"

    def get_reminders(self, pending_only: bool = True) -> List[Dict[str, Any]]:
        data = self._load()
        rems = data.get("reminders", [])
        if pending_only:
            return [r for r in rems if not r.get("completed")]
        return rems

    def add_schedule(self, event_title: str, date_time: str, location: str = "HQ") -> str:
        data = self._load()
        sched = {
            "id": f"sched_{int(time.time())}",
            "title": event_title,
            "datetime": date_time,
            "location": location,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        data.setdefault("schedules", []).append(sched)
        self._save(data)
        return f"Schedule entry logged: '{event_title}' at {date_time} (Location: {location})"

    def get_schedules(self) -> List[Dict[str, Any]]:
        data = self._load()
        return data.get("schedules", [])

    # ——— GENERIC KEY-VALUE MEMORY ———
    def set_fact(self, key: str, value: Any) -> str:
        data = self._load()
        data.setdefault("key_value_store", {})[key] = value
        self._save(data)
        return f"Stored '{key}': {value}"

    def get_fact(self, key: str, default: Any = None) -> Any:
        data = self._load()
        return data.get("key_value_store", {}).get(key, default)

    def get_all_context_summary(self) -> str:
        data = self._load()
        notes_count = len(data.get("notes", []))
        rems_count = len([r for r in data.get("reminders", []) if not r.get("completed")])
        scheds_count = len(data.get("schedules", []))
        return (
            f"User: {data.get('owner', 'SantoStark')} (Clearance: Level {data.get('clearance_level', 10)})\n"
            f"Active Notes: {notes_count} | Pending Reminders: {rems_count} | Scheduled Events: {scheds_count}"
        )

    # ——— VECTOR MEMORY (CHROMADB) ———
    def add_memory(self, text: str) -> bool:
        if not self.collection:
            return False
        try:
            mem_id = str(uuid.uuid4())
            self.collection.add(
                documents=[text],
                metadatas=[{"timestamp": time.time()}],
                ids=[mem_id]
            )
            return True
        except Exception as e:
            print(f"[VectorDB Error] {e}")
            return False

    def search_memory(self, query: str, n_results: int = 3) -> List[str]:
        if not self.collection:
            return []
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            if results and results.get("documents") and len(results["documents"]) > 0:
                return results["documents"][0]
            return []
        except Exception as e:
            print(f"[VectorDB Error] {e}")
            return []


memory = JarvisMemory()
