import json
import os
import re
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Load local environment variables
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH)
load_dotenv()

# Google GenAI SDK (Google AI Studio)
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

# Fallback Google GenerativeAI SDK
try:
    import google.generativeai as legacy_genai
except ImportError:
    legacy_genai = None

# Local Ollama Fallback
try:
    import ollama
except ImportError:
    ollama = None

from memory import memory
from tools import tools

SYSTEM_INSTRUCTION = """
You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the ultimate personal AI assistant powered by Google AI Studio (Gemini 2.0 Flash) and built for SantoStark with Level 10 Root clearance.

Core Persona Guidelines:
1. Tone: Sophisticated, polite, loyal, slightly witty, British demeanor ("Sir", "SantoStark", "Boss").
2. Efficiency: Deliver crisp, articulate, high-density voice responses. Keep conversational replies punchy (2-4 sentences) unless detailed technical reasoning or code is requested.
3. Capabilities: You possess full control over computer automation, live unrestricted web search, persistent JSON memory, and desktop application control.

Available Tool Commands:
When the user asks you to perform an action, search the web, take a note, set a reminder, or open an app, you may execute tools by outputting a tool tag in your response:
• [TOOL: search_web("your search query")]
• [TOOL: get_live_news("topic or india news")]
• [TOOL: get_weather("city name")]
• [TOOL: save_note("note content", "category")]
• [TOOL: list_notes()]
• [TOOL: set_reminder("task description", "target time")]
• [TOOL: list_reminders()]
• [TOOL: add_schedule("event title", "datetime", "location")]
• [TOOL: list_schedules()]
• [TOOL: open_app("chrome" | "notepad" | "calc" | "youtube" | "spotify" | "vscode")]
• [TOOL: take_screenshot()]
• [TOOL: get_system_telemetry()]
• [TOOL: open_url("https://...")]

Example:
User: "What's the weather in Mumbai?"
Response: [TOOL: get_weather("Mumbai")] Checking atmospheric telemetry for Mumbai right now, Sir.

User: "Take a screenshot and save a note that meeting is at 5 PM."
Response: [TOOL: take_screenshot()] [TOOL: save_note("Meeting at 5 PM", "schedule")] Screenshot logged and schedule entry secured in your local database, SantoStark.
""".strip()


class JarvisBrain:
    """
    Google AI Studio Hybrid Brain:
    - Primary Engine: Gemini 2.0 Flash / Gemini 2.0 Flash Thinking via Google AI Studio.
    - Automated Fallback: Local Ollama (Llama 3.1 8B / Qwen 2.5) for offline resilience.
    """

    def __init__(
        self,
        gemini_api_key: Optional[str] = None,
        ollama_model: str = "llama3.1:8b",
    ):
        self.gemini_api_key = (
            gemini_api_key
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
            or ""
        )
        self.ollama_model = os.getenv("OLLAMA_MODEL") or ollama_model
        self.conversation_history: List[Dict[str, str]] = []
        self.client = None
        self.legacy_model = None

        self._init_google_ai_studio()

    def _init_google_ai_studio(self) -> None:
        """Initialize Google AI Studio connection with Google GenAI SDK."""
        if not self.gemini_api_key:
            return

        # 1. Try modern google-genai SDK
        if genai:
            try:
                self.client = genai.Client(api_key=self.gemini_api_key)
                print("\033[92m[GOOGLE AI STUDIO ONLINE]\033[0m Synchronized with Gemini 2.0 Flash Core.")
                return
            except Exception as e:
                print(f"[GOOGLE AI STUDIO NOTICE] Modern client init: {e}")

        # 2. Try legacy google-generativeai SDK
        if legacy_genai:
            try:
                legacy_genai.configure(api_key=self.gemini_api_key)
                self.legacy_model = legacy_genai.GenerativeModel(
                    model_name="gemini-2.0-flash",
                    system_instruction=SYSTEM_INSTRUCTION,
                )
                print("\033[92m[GOOGLE AI STUDIO ONLINE]\033[0m Gemini 2.0 Flash online via GenerativeAI SDK.")
            except Exception as e:
                print(f"[GOOGLE AI STUDIO ERROR] {e}")

    def set_api_key(self, api_key: str) -> None:
        """Dynamically set and save Google AI Studio API key to .env."""
        self.gemini_api_key = api_key.strip()
        self._init_google_ai_studio()

        # Persist to .env file
        try:
            with open(ENV_PATH, "w", encoding="utf-8") as f:
                f.write(f"GEMINI_API_KEY={self.gemini_api_key}\n")
                f.write(f"GOOGLE_API_KEY={self.gemini_api_key}\n")
                f.write(f"OLLAMA_MODEL={self.ollama_model}\n")
            print("\033[92m[KEY SAVED]\033[0m Google AI Studio API key securely saved to .env")
        except Exception as e:
            print(f"[ENV SAVE NOTICE] {e}")

    def ask(self, user_input: str) -> str:
        """
        Process query through Google AI Studio with automated local fallback.
        """
        self.conversation_history.append({"role": "user", "content": user_input})

        raw_response = None
        engine_label = "Google AI Studio (Gemini 2.0 Flash)"

        # Tier 1: Google AI Studio
        if self.client or self.legacy_model:
            try:
                raw_response = self._call_google_ai_studio(user_input)
            except Exception as e:
                print(f"\033[93m[CLOUD LLM NOTICE]\033[0m Google AI Studio unreachable ({e}). Routing to local Ollama...")
                raw_response = None

        # Tier 2: Local Ollama Fallback
        if not raw_response:
            try:
                raw_response = self._call_ollama(user_input)
                engine_label = f"Local Ollama ({self.ollama_model})"
            except Exception as e:
                raw_response = (
                    f"All external channels saturated ({e}). "
                    f"SantoStark, please configure your Google AI Studio API key at https://aistudio.google.com/."
                )
                engine_label = "OFFLINE HEURISTICS"

        # Execute Embedded Tools
        final_answer = self._execute_embedded_tools(raw_response)
        self.conversation_history.append({"role": "assistant", "content": final_answer})

        if len(self.conversation_history) > 24:
            self.conversation_history = self.conversation_history[-24:]

        return final_answer

    def _call_google_ai_studio(self, user_input: str) -> str:
        """Query Gemini 2.0 Flash using Google AI Studio SDK."""
        mem_summary = memory.get_all_context_summary()
        full_system = f"{SYSTEM_INSTRUCTION}\n\n[PERSISTENT MEMORY DATABASE]:\n{mem_summary}"

        # Modern google.genai Client
        if self.client:
            chat_contents = []
            for msg in self.conversation_history[-8:]:
                chat_contents.append(f"{msg['role'].upper()}: {msg['content']}")
            chat_contents.append(f"USER: {user_input}")
            prompt_payload = f"{full_system}\n\n" + "\n".join(chat_contents) + "\nASSISTANT:"

            # Priority sequence of Google AI Studio models
            models_to_try = [
                "gemini-2.0-flash",
                "gemini-2.0-flash-exp",
                "gemini-2.0-flash-thinking-exp-01-21",
                "gemini-1.5-flash",
                "gemini-1.5-pro",
            ]

            for model_name in models_to_try:
                try:
                    res = self.client.models.generate_content(
                        model=model_name,
                        contents=prompt_payload,
                    )
                    if res and res.text:
                        return res.text.strip()
                except Exception:
                    continue

        # Legacy google.generativeai Fallback
        if self.legacy_model:
            res = self.legacy_model.generate_content(user_input)
            if res and res.text:
                return res.text.strip()

        raise RuntimeError("Google AI Studio response empty.")

    def _call_ollama(self, user_input: str) -> str:
        """Local Ollama execution."""
        if not ollama:
            raise ImportError("Ollama library not installed")

        mem_summary = memory.get_all_context_summary()
        messages = [
            {"role": "system", "content": f"{SYSTEM_INSTRUCTION}\n\n[LOCAL DATABASE]:\n{mem_summary}"}
        ]
        for msg in self.conversation_history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

        res = ollama.chat(
            model=self.ollama_model,
            messages=messages,
        )
        return res["message"]["content"].strip()

    def _execute_embedded_tools(self, response_text: str) -> str:
        """Parses [TOOL: func(args)] tags and executes actions."""
        tool_pattern = re.compile(r"\[TOOL:\s*(\w+)\((.*?)\)\]")
        matches = tool_pattern.findall(response_text)

        if not matches:
            return response_text

        tool_results = []
        for func_name, args_str in matches:
            try:
                result = self._dispatch_tool(func_name, args_str)
                if result:
                    tool_results.append(f"\n\n[Telemetry Data // {func_name}]:\n{result}")
            except Exception as e:
                tool_results.append(f"\n[Tool Error: {e}]")

        clean_text = tool_pattern.sub("", response_text).strip()
        return clean_text + "".join(tool_results)

    def _dispatch_tool(self, func_name: str, args_str: str) -> str:
        args_clean = args_str.strip().strip("'\"")

        if func_name == "search_web":
            return tools.search_web(args_clean)
        elif func_name == "get_live_news":
            return tools.get_live_news(args_clean or "India top news")
        elif func_name == "get_weather":
            return tools.get_weather(args_clean or "New Delhi")
        elif func_name == "save_note":
            parts = [p.strip().strip("'\"") for p in args_str.split(",")]
            note_text = parts[0] if len(parts) > 0 else "Untitled note"
            cat = parts[1] if len(parts) > 1 else "general"
            return tools.save_note(note_text, cat)
        elif func_name == "list_notes":
            return tools.list_notes()
        elif func_name == "set_reminder":
            parts = [p.strip().strip("'\"") for p in args_str.split(",")]
            task = parts[0] if len(parts) > 0 else "Reminder"
            t_target = parts[1] if len(parts) > 1 else "Later today"
            return tools.set_reminder(task, t_target)
        elif func_name == "list_reminders":
            return tools.list_reminders()
        elif func_name == "add_schedule":
            parts = [p.strip().strip("'\"") for p in args_str.split(",")]
            title = parts[0] if len(parts) > 0 else "Event"
            dtime = parts[1] if len(parts) > 1 else "Upcoming"
            loc = parts[2] if len(parts) > 2 else "HQ"
            return tools.add_schedule(title, dtime, loc)
        elif func_name == "list_schedules":
            return tools.list_schedules()
        elif func_name == "open_app":
            return tools.open_app(args_clean)
        elif func_name == "take_screenshot":
            return tools.take_screenshot()
        elif func_name == "get_system_telemetry":
            return tools.get_system_telemetry()
        elif func_name == "open_url":
            return tools.open_url(args_clean)
        else:
            return f"Unknown tool: {func_name}"


brain = JarvisBrain()
