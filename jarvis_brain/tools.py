import os
import platform
import subprocess
import time
import webbrowser
from typing import Any, Dict, List, Optional

try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None

try:
    import pyautogui
except ImportError:
    pyautogui = None

from memory import memory


class JarvisTools:
    """
    Comprehensive Tool & Service Integration Suite for Jarvis:
    - Live DuckDuckGo web scraping (News, Weather, Media, Global Knowledge)
    - Persistent Memory Management
    - Safe Operating System Automation & Screen Capture
    """

    # ——— 1. LIVE WEB SEARCH & SCRAPING (KEYLESS) ———

    @staticmethod
    def search_web(query: str, max_results: int = 5) -> str:
        """Search DuckDuckGo for live internet info, facts, news, and definitions."""
        if not DDGS:
            return "DuckDuckGo search module is not installed."
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                if not results:
                    return f"No search results found for: {query}"
                formatted = []
                for i, r in enumerate(results, 1):
                    formatted.append(f"{i}. {r.get('title')}\n   Snippet: {r.get('body')}\n   Link: {r.get('href')}")
                return "\n\n".join(formatted)
        except Exception as e:
            return f"Web search encountered an anomaly: {e}"

    @staticmethod
    def get_live_news(topic: str = "India top news", max_results: int = 5) -> str:
        """Fetch real-time breaking news without API keys."""
        if not DDGS:
            return "Search module offline."
        try:
            with DDGS() as ddgs:
                news_items = list(ddgs.news(keywords=topic, max_results=max_results))
                if not news_items:
                    return f"No recent news articles found for: {topic}"
                formatted = []
                for i, n in enumerate(news_items, 1):
                    formatted.append(
                        f"[{i}] {n.get('title')}\n    Source: {n.get('source')} ({n.get('date')})\n    Summary: {n.get('body')}"
                    )
                return "\n\n".join(formatted)
        except Exception as e:
            return f"News feed fetch failed: {e}"

    @staticmethod
    def get_weather(location: str = "New Delhi") -> str:
        """Get live weather forecast using keyless live search."""
        query = f"current weather in {location} temperature humidity forecast"
        return JarvisTools.search_web(query, max_results=3)

    # ——— 2. LOCAL MEMORY & DATABASE TOOLS ———

    @staticmethod
    def save_note(note_text: str, category: str = "general") -> str:
        return memory.add_note(note_text, category)

    @staticmethod
    def list_notes(category: Optional[str] = None) -> str:
        notes = memory.get_notes(category)
        if not notes:
            return "No notes stored in memory database."
        lines = [f"• [{n['timestamp']}] ({n['category']}) {n['content']}" for n in notes]
        return "\n".join(lines)

    @staticmethod
    def set_reminder(task: str, time_target: str) -> str:
        return memory.add_reminder(task, time_target)

    @staticmethod
    def list_reminders() -> str:
        rems = memory.get_reminders(pending_only=True)
        if not rems:
            return "No active reminders found."
        lines = [f"• [ID: {r['id']}] Target: {r['target_time']} — {r['text']}" for r in rems]
        return "\n".join(lines)

    @staticmethod
    def add_schedule(title: str, datetime_str: str, location: str = "HQ") -> str:
        return memory.add_schedule(title, datetime_str, location)

    @staticmethod
    def list_schedules() -> str:
        scheds = memory.get_schedules()
        if not scheds:
            return "Schedule log is currently empty."
        lines = [f"• {s['title']} at {s['datetime']} (Location: {s['location']})" for s in scheds]
        return "\n".join(lines)

    # ——— 3. COMPUTER AUTOMATION & OS HOOKS ———

    @staticmethod
    def open_app(app_name: str) -> str:
        """Safely launch local desktop applications."""
        target = app_name.lower().strip()
        system = platform.system().lower()

        try:
            if "chrome" in target:
                if system == "windows":
                    subprocess.Popen(["start", "chrome"], shell=True)
                elif system == "darwin":
                    subprocess.Popen(["open", "-a", "Google Chrome"])
                else:
                    subprocess.Popen(["google-chrome"])
                return "Google Chrome launched successfully."

            elif "notepad" in target:
                if system == "windows":
                    subprocess.Popen(["notepad.exe"])
                else:
                    subprocess.Popen(["gedit"])
                return "Notepad opened."

            elif "calc" in target or "calculator" in target:
                if system == "windows":
                    subprocess.Popen(["calc.exe"])
                return "Calculator initialized."

            elif "youtube" in target:
                webbrowser.open("https://www.youtube.com")
                return "YouTube opened in default browser."

            elif "spotify" in target:
                webbrowser.open("https://open.spotify.com")
                return "Spotify web player launched."

            elif "code" in target or "vscode" in target:
                subprocess.Popen(["code"], shell=True)
                return "Visual Studio Code opened."

            elif "terminal" in target or "cmd" in target or "powershell" in target:
                if system == "windows":
                    subprocess.Popen(["start", "powershell"], shell=True)
                return "PowerShell terminal deployed."

            else:
                # Attempt generic OS start
                if system == "windows":
                    subprocess.Popen(["start", target], shell=True)
                return f"Execution command dispatched for: {app_name}"
        except Exception as e:
            return f"Failed to launch application '{app_name}': {e}"

    @staticmethod
    def take_screenshot(filename_prefix: str = "jarvis_screen") -> str:
        """Capture desktop screenshot safely."""
        if not pyautogui:
            return "PyAutoGUI is not available for screen capture."
        try:
            screenshots_dir = os.path.join(os.path.dirname(__file__), "captures")
            os.makedirs(screenshots_dir, exist_ok=True)
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filepath = os.path.join(screenshots_dir, f"{filename_prefix}_{timestamp}.png")
            screenshot = pyautogui.screenshot()
            screenshot.save(filepath)
            return f"Screenshot captured and stored securely at: {filepath}"
        except Exception as e:
            return f"Screen capture failed: {e}"

    @staticmethod
    def get_system_telemetry() -> str:
        """Fetch live system time, date, platform, and operational telemetry."""
        now = time.strftime("%A, %B %d, %Y - %I:%M:%S %p")
        sys_info = f"OS: {platform.system()} {platform.release()} ({platform.machine()})"
        py_ver = f"Python: {platform.python_version()}"
        return f"Current System Time: {now}\nTelemetry: {sys_info} | {py_ver}\nSecurity: Level 10 Root (SantoStark)"

    @staticmethod
    def open_url(url: str) -> str:
        """Open any external web link in browser."""
        if not url.startswith("http"):
            url = f"https://{url}"
        webbrowser.open(url)
        return f"Navigation initiated for: {url}"


tools = JarvisTools()
