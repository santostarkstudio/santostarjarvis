#!/usr/bin/env python3
"""
================================================================================
                            J.A.R.V.I.S. AI ASSISTANT
            Hybrid Core: Google Gemini 2.0 Flash + Local Ollama Fallback
                    Built for SantoStark // Level 10 Clearance
================================================================================
"""

import os
import sys
import time
from brain import brain
from voice import voice
from tools import tools
from memory import memory

BANNER = """
\033[96m
   ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗
   ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝
   ██║███████║██████╔╝██║   ██║██║███████╗
   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║
█████║██║  ██║██║  ██║ ╚████╔╝ ██║███████║
╚════╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝
\033[0m
\033[93m[HYBRID INTELLIGENCE ENGINE ONLINE]\033[0m
• Primary Cloud Brain: \033[92mGoogle Gemini 2.0 Flash (GenAI SDK)\033[0m
• Offline Fallback:    \033[92mLocal Ollama (Llama 3.1 8B / Qwen 2.5)\033[0m
• Web Search:          \033[92mDuckDuckGo Live Search (Unrestricted & Keyless)\033[0m
• Storage Layer:       \033[92mPersistent JSON (jarvis_memory.json)\033[0m
• Computer Automation: \033[92mPyAutoGUI + OS Subprocess Controls\033[0m
• Audio Delivery:      \033[92mSpeechRecognition (STT) + pyttsx3 (Offline TTS)\033[0m
================================================================================
"""


def process_query(query: str) -> None:
    """Processes user voice/text query through Jarvis Brain and responds."""
    if not query.strip():
        return

    # Check for dynamic key setting command
    if query.lower().startswith("set key ") or query.lower().startswith("api_key "):
        new_key = query.split(maxsplit=2)[-1].strip()
        brain.set_api_key(new_key)
        feedback = "Google AI Studio API key updated and synchronized with Gemini 2.0 Flash."
        print(f"\033[92m[JARVIS]:\033[0m {feedback}")
        voice.speak(feedback)
        return

    print(f"\n\033[94m[USER // SANTOSTARK]:\033[0m {query}")

    # Exit check
    if query.lower() in ["exit", "quit", "shutdown", "goodbye", "sleep jarvis"]:
        farewell = "Powering down primary neural systems. Have a productive day, SantoStark."
        print(f"\033[92m[JARVIS]:\033[0m {farewell}")
        voice.speak(farewell)
        time.sleep(2)
        sys.exit(0)

    # Process through Hybrid Brain
    print("\033[90m[Synthesizing response through neural pipeline...]\033[0m")
    start_time = time.time()
    response = brain.ask(query)
    elapsed = time.time() - start_time

    print(f"\n\033[92m[JARVIS // {elapsed:.2f}s]:\033[0m {response}\n")
    voice.speak(response)


def main():
    print(BANNER)

    # Check if Google AI Studio key is configured
    if not brain.gemini_api_key:
        print("\033[93m[🔑 GOOGLE AI STUDIO ONBOARDING]\033[0m")
        print("To enable Gemini 2.0 Flash, get your free key at: \033[96mhttps://aistudio.google.com/\033[0m")
        key_input = input("\033[93mPaste Google AI Studio API Key (or press [ENTER] to skip): \033[0m").strip()
        if key_input:
            brain.set_api_key(key_input)
        else:
            print("\033[90m[Proceeding with Local Ollama / Offline Heuristics Mode]\033[0m\n")

    boot_msg = "Systems synchronized and root access granted to SantoStark. How may I assist you today, Sir?"
    print(f"\033[92m[JARVIS]:\033[0m {boot_msg}")
    voice.speak(boot_msg)

    print("\n\033[93m[COMMAND INTERACTION MODES]:\033[0m")
    print(" 1. Press \033[92m[ENTER]\033[0m with empty text to activate \033[96mVoice Microphone Listening\033[0m.")
    print(" 2. Or type your prompt directly into the prompt line below.")
    print(" 3. Type \033[96m'set key <API_KEY>'\033[0m to update your Google AI Studio key anytime.")
    print(" 4. Type \033[91m'exit'\033[0m to power down.\n")

    while True:
        try:
            user_input = input("\033[93mSantoStark ❯ \033[0m").strip()

            # If user pressed Enter with empty input -> engage voice microphone
            if not user_input:
                voice_text = voice.listen_once()
                if voice_text:
                    process_query(voice_text)
                else:
                    print("\033[90m[No speech detected or timeout. Ready for text input.]\033[0m")
            else:
                process_query(user_input)

        except KeyboardInterrupt:
            print("\n\033[92m[JARVIS]:\033[0m Standing down. System offline.")
            break
        except Exception as e:
            print(f"\033[91m[ERROR]:\033[0m {e}")


if __name__ == "__main__":
    main()
