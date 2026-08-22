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

try:
    from thefuzz import process
except ImportError:
    process = None

from memory import memory
import glob

# Global app registry for fuzzy matching
_installed_apps_registry = {}
_apps_scanned = False

def scan_windows_apps():
    """Scans common Windows directories for application shortcuts (.lnk)."""
    global _installed_apps_registry, _apps_scanned
    _installed_apps_registry.clear()
    
    paths_to_scan = [
        os.path.join(os.environ.get('APPDATA', ''), r"Microsoft\Windows\Start Menu\Programs"),
        r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs",
        os.path.join(os.environ.get('USERPROFILE', ''), r"Desktop")
    ]
    
    for base_path in paths_to_scan:
        if not os.path.exists(base_path):
            continue
            
        search_pattern = os.path.join(base_path, "**", "*.lnk")
        for file_path in glob.iglob(search_pattern, recursive=True):
            app_name = os.path.splitext(os.path.basename(file_path))[0].lower()
            app_name = app_name.replace(" (x86)", "").replace(" (x64)", "")
            if app_name not in _installed_apps_registry:
                _installed_apps_registry[app_name] = file_path
                
    _apps_scanned = True
    print(f"[JarvisTools] Scanned and found {len(_installed_apps_registry)} installed apps.")



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
        """Search DuckDuckGo for live internet info using native urllib."""
        try:
            import urllib.request
            import urllib.parse
            import re
            
            url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            html = urllib.request.urlopen(req).read().decode('utf-8')
            
            snippets = re.findall(r'<a class="result__snippet[^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
            
            if not snippets:
                return "No results found or could not parse the search page."
                
            results = []
            for i, snippet in enumerate(snippets[:max_results]):
                clean_text = re.sub(r'<[^>]+>', '', snippet).strip()
                results.append(f"Result {i+1}: {clean_text}")
                
            return "\\n".join(results)
        except Exception as e:
            return f"Web search failed: {e}"

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
        """Safely launch local desktop applications using advanced fuzzy matching."""
        target = app_name.lower().strip()
        system = platform.system().lower()

        # Specific hardcoded fallbacks for web apps
        if "youtube" in target:
            webbrowser.open("https://www.youtube.com")
            return "YouTube opened in default browser."
        elif "spotify" in target and system != "windows":
            webbrowser.open("https://open.spotify.com")
            return "Spotify web player launched."

        # Advanced Windows Shortcut Resolution
        if system == "windows":
            global _apps_scanned, _installed_apps_registry
            if not _apps_scanned:
                scan_windows_apps()
                
            if not _installed_apps_registry:
                return "Failed to scan Windows applications list."
                
            if process:
                # Use fuzzy matching if thefuzz is installed
                choices = list(_installed_apps_registry.keys())
                best_match, score = process.extractOne(target, choices)
                
                if score >= 60:
                    app_path = _installed_apps_registry[best_match]
                    try:
                        os.startfile(app_path)
                        return f"Launched {best_match} via system shortcuts (Confidence: {score}%)."
                    except Exception as e:
                        return f"Failed to launch {best_match}: {e}"
            else:
                # Fallback to simple substring matching if thefuzz is missing
                for name, path in _installed_apps_registry.items():
                    if target in name or name in target:
                        try:
                            os.startfile(path)
                            return f"Launched {name} via basic system shortcuts."
                        except Exception as e:
                            return f"Failed to launch {name}: {e}"
                            
            # Ultimate Fallback for Windows
            try:
                subprocess.Popen(["start", target], shell=True)
                return f"Execution command dispatched for: {app_name} via shell fallback."
            except Exception as e:
                return f"Failed to launch application '{app_name}': {e}"
        else:
            # Non-Windows systems (Linux/Mac)
            try:
                if system == "darwin":
                    subprocess.Popen(["open", "-a", app_name])
                else:
                    subprocess.Popen([app_name])
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
        
        hw_stats = ""
        try:
            import psutil
            cpu_usage = psutil.cpu_percent(interval=0.1)
            ram = psutil.virtual_memory()
            hw_stats = f"CPU Load: {cpu_usage}% | RAM Usage: {ram.percent}% ({ram.used // (1024**3)}GB / {ram.total // (1024**3)}GB)"
        except ImportError:
            pass
            
        return f"Current System Time: {now}\nTelemetry: {sys_info} | {py_ver}\nHardware: {hw_stats}\nSecurity: Level 10 Root (SantoStark)"

    @staticmethod
    def open_url(url: str) -> str:
        """Open any external web link in browser."""
        if not url.startswith("http"):
            url = f"https://{url}"
        webbrowser.open(url)
        return f"Navigation initiated for: {url}"


    @staticmethod
    def start_security_monitor() -> str:
        """Start the facial recognition security monitor."""
        try:
            from security_monitor import monitor
            monitor.start()
            return "Security monitor activated. Camera feed is now being analyzed."
        except Exception as e:
            return f"Failed to start security monitor: {e}"
            
    @staticmethod
    def stop_security_monitor() -> str:
        """Stop the facial recognition security monitor."""
        try:
            from security_monitor import monitor
            monitor.stop()
            return "Security monitor deactivated."
        except Exception as e:
            return f"Failed to stop security monitor: {e}"

    @staticmethod
    def analyze_screen(query: str = "Describe what is on my screen right now.") -> str:
        """Takes a screenshot and sends it to Gemini for vision analysis."""
        try:
            from vision import glass
            return glass.analyze_screen(query)
        except Exception as e:
            return f"Project Glass encountered an error: {e}"

    @staticmethod
    def add_graph_relation(entity1: str, relation: str, entity2: str) -> str:
        """Adds a node connection to the Neural Knowledge Graph."""
        try:
            from knowledge_graph import neural_graph
            return neural_graph.add_relationship(entity1, relation, entity2)
        except Exception as e:
            return f"Failed to add graph relation: {e}"

    @staticmethod
    def query_graph(entity: str) -> str:
        """Finds all relationships for a given entity in the Neural Graph."""
        try:
            from knowledge_graph import neural_graph
            return neural_graph.query_entity(entity)
        except Exception as e:
            return f"Failed to query graph: {e}"

    @staticmethod
    def display_hud_alert(message: str) -> str:
        """Displays a glowing holographic alert on the actual Windows desktop HUD."""
        try:
            from hud import hud_controller
            return hud_controller.show_alert(message)
        except Exception as e:
            return f"Failed to project HUD: {e}"



    @staticmethod
    def simulate_key(key_sequence: str) -> str:
        """Simulates keyboard strokes (e.g. 'playpause', 'volumeup', 'enter', 'a,b,c')."""
        try:
            import pyautogui
            keys = [k.strip() for k in key_sequence.split(",")]
            for k in keys:
                pyautogui.press(k)
            return f"Simulated keystrokes: {key_sequence}"
        except ImportError:
            return "Failed to simulate key: pyautogui not installed."
        except Exception as e:
            return f"Key simulation failed: {e}"

    @staticmethod
    def type_text(text: str) -> str:
        """Simulates typing text on the keyboard."""
        try:
            import pyautogui
            pyautogui.write(text, interval=0.01)
            return f"Typed text: {text}"
        except Exception as e:
            return f"Typing failed: {e}"

tools = JarvisTools()
