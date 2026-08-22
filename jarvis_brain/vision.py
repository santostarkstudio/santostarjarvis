import os
import time
import base64
try:
    import pyautogui
except ImportError:
    pyautogui = None

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

try:
    import google.generativeai as legacy_genai
except ImportError:
    legacy_genai = None

from dotenv import load_dotenv

load_dotenv()

class ProjectGlass:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
        self.client = None
        self.legacy_model = None
        
        if self.api_key:
            if genai:
                try:
                    self.client = genai.Client(api_key=self.api_key)
                except Exception:
                    pass
            if not self.client and legacy_genai:
                try:
                    legacy_genai.configure(api_key=self.api_key)
                    self.legacy_model = legacy_genai.GenerativeModel("gemini-2.0-flash")
                except Exception:
                    pass

    def analyze_screen(self, query: str = "Describe what is on my screen right now.") -> str:
        """Takes a screenshot and sends it to Gemini for vision analysis."""
        if not pyautogui:
            return "Screen capture unavailable. PyAutoGUI is not installed."
            
        if not self.client and not self.legacy_model:
            return "Vision analysis unavailable. Google AI Studio client not initialized."
            
        try:
            # 1. Take a screenshot
            screenshot_path = os.path.join(os.path.dirname(__file__), "captures", "temp_vision.png")
            os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
            
            pyautogui.screenshot(screenshot_path)
            
            # 2. Analyze with Gemini
            if self.client:
                # Modern client
                with open(screenshot_path, "rb") as f:
                    image_bytes = f.read()
                
                # Using the SDK's multimodal capabilities
                response = self.client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=[
                        query,
                        types.Part.from_bytes(data=image_bytes, mime_type='image/png')
                    ]
                )
                return response.text
                
            elif self.legacy_model:
                # Legacy client
                import PIL.Image
                img = PIL.Image.open(screenshot_path)
                response = self.legacy_model.generate_content([query, img])
                return response.text
                
        except Exception as e:
            return f"Project Glass encountered a visual processing error: {e}"

glass = ProjectGlass()
