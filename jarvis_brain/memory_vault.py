"""
════════════════════════════════════════════════════════════════════════════════
SANTOSTARK J.A.R.V.I.S. — STARK PERSISTENT MEMORY VAULT v1.0
════════════════════════════════════════════════════════════════════════════════
Stores user preferences, project notes, personal directives, and long-term context
using a robust, zero-dependency local SQLite database.
════════════════════════════════════════════════════════════════════════════════
"""

import sqlite3
import os
import json
from datetime import datetime
from typing import List, Dict, Optional, Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stark_memory.sqlite")

class StarkMemoryVault:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            # 1. Key-Value User Preferences & Profile
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS profile_preferences (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # 2. Episodic & Long-term Memories / Notes
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memory_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic TEXT NOT NULL,
                    content TEXT NOT NULL,
                    importance INTEGER DEFAULT 1,
                    tags TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # 3. Conversation & Task History
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS session_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt TEXT NOT NULL,
                    response TEXT NOT NULL,
                    provider_used TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

            # Seed initial master context if empty
            cursor.execute("SELECT COUNT(*) as count FROM profile_preferences")
            if cursor.fetchone()["count"] == 0:
                self.set_preference("user_name", "SantoStark", "identity")
                self.set_preference("user_role", "Master Creator / Boss", "identity")
                self.set_preference("core_directives", "Serve SantoStark with absolute loyalty, high intelligence, and concise British wit.", "directive")
                self.set_preference("primary_project", "U.L.T.R.O.N. / J.A.R.V.I.S.", "projects")
                self.add_memory("Creator Profile", "SantoStark is the creator and chief architect of this autonomous AI system.", 5, "creator,identity")

    # --- Preference Management ---
    def set_preference(self, key: str, value: str, category: str = "general") -> bool:
        try:
            with self._get_conn() as conn:
                conn.cursor().execute("""
                    INSERT INTO profile_preferences (key, value, category, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(key) DO UPDATE SET
                        value=excluded.value,
                        category=excluded.category,
                        updated_at=CURRENT_TIMESTAMP
                """, (key, value, category))
                conn.commit()
                return True
        except Exception as e:
            print(f"[MemoryVault Error: set_pref] {e}")
            return False

    def get_preference(self, key: str) -> Optional[str]:
        try:
            with self._get_conn() as conn:
                row = conn.cursor().execute(
                    "SELECT value FROM profile_preferences WHERE key = ?", (key,)
                ).fetchone()
                return row["value"] if row else None
        except Exception:
            return None

    def get_all_preferences(self) -> Dict[str, str]:
        try:
            with self._get_conn() as conn:
                rows = conn.cursor().execute("SELECT key, value FROM profile_preferences").fetchall()
                return {row["key"]: row["value"] for row in rows}
        except Exception:
            return {}

    # --- Memory & Notes Management ---
    def add_memory(self, topic: str, content: str, importance: int = 1, tags: str = "") -> bool:
        try:
            with self._get_conn() as conn:
                conn.cursor().execute("""
                    INSERT INTO memory_entries (topic, content, importance, tags)
                    VALUES (?, ?, ?, ?)
                """, (topic, content, importance, tags))
                conn.commit()
                return True
        except Exception as e:
            print(f"[MemoryVault Error: add_memory] {e}")
            return False

    def search_memories(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        try:
            with self._get_conn() as conn:
                q = f"%{query}%"
                rows = conn.cursor().execute("""
                    SELECT id, topic, content, importance, tags, created_at
                    FROM memory_entries
                    WHERE topic LIKE ? OR content LIKE ? OR tags LIKE ?
                    ORDER BY importance DESC, id DESC
                    LIMIT ?
                """, (q, q, q, limit)).fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"[MemoryVault Error: search_memories] {e}")
            return []

    def get_recent_memories(self, limit: int = 8) -> List[Dict[str, Any]]:
        try:
            with self._get_conn() as conn:
                rows = conn.cursor().execute("""
                    SELECT id, topic, content, importance, tags, created_at
                    FROM memory_entries
                    ORDER BY id DESC
                    LIMIT ?
                """, (limit,)).fetchall()
                return [dict(row) for row in rows]
        except Exception:
            return []

    # --- Session History ---
    def log_session(self, prompt: str, response: str, provider: str = "") -> bool:
        try:
            with self._get_conn() as conn:
                conn.cursor().execute("""
                    INSERT INTO session_history (prompt, response, provider_used)
                    VALUES (?, ?, ?)
                """, (prompt, response, provider))
                conn.commit()
                return True
        except Exception:
            return False

    def get_summary_context(self) -> str:
        """Returns a consolidated text block of master memories to inject into AI system prompts."""
        prefs = self.get_all_preferences()
        memories = self.get_recent_memories(5)
        
        lines = ["[STARK MEMORY VAULT - PERSISTENT CONTEXT]"]
        if prefs:
            lines.append("Profile & Preferences:")
            for k, v in prefs.items():
                lines.append(f"  • {k}: {v}")
        if memories:
            lines.append("Active Memories & Notes:")
            for m in memories:
                lines.append(f"  • [{m['topic']}]: {m['content']}")
                
        return "\n".join(lines)

# Global Singleton Instance
memory_vault = StarkMemoryVault()

if __name__ == "__main__":
    print("Stark Memory Vault Initialized.")
    print(memory_vault.get_summary_context())
