import threading
import queue
import time
from typing import Callable, Optional

try:
    import speech_recognition as sr
except ImportError:
    sr = None

try:
    import pyttsx3
except ImportError:
    pyttsx3 = None


class JarvisVoice:
    """
    Frontend Delivery Layer (Audio STT + Offline TTS):
    - Background Room Audio Listening using SpeechRecognition + PyAudio
    - Offline, Instant Text-to-Speech using pyttsx3
    """

    def __init__(self, speech_rate: int = 185):
        self.speech_rate = speech_rate
        self.tts_engine = None
        self.tts_queue: queue.Queue = queue.Queue()
        self.is_listening = False
        self.recognizer = None
        self.microphone = None

        self._init_tts()
        self._init_stt()

        # Start background TTS consumer thread
        self.tts_thread = threading.Thread(target=self._tts_worker, daemon=True)
        self.tts_thread.start()

    def _init_tts(self) -> None:
        if not pyttsx3:
            print("[VOICE WARNING] pyttsx3 not installed. Audio output will be text-only.")
            return
        try:
            self.tts_engine = pyttsx3.init()
            self.tts_engine.setProperty("rate", self.speech_rate)
            self.tts_engine.setProperty("volume", 1.0)

            # Try selecting a British or distinct male voice for Jarvis
            voices = self.tts_engine.getProperty("voices")
            for v in voices:
                if "hazel" in v.name.lower() or "george" in v.name.lower() or "david" in v.name.lower() or "en-gb" in v.id.lower():
                    self.tts_engine.setProperty("voice", v.id)
                    break
        except Exception as e:
            print(f"[TTS INIT ERROR] {e}")
            self.tts_engine = None

    def _init_stt(self) -> None:
        if not sr:
            print("[VOICE WARNING] SpeechRecognition not installed. Voice input will use text input.")
            return
        try:
            self.recognizer = sr.Recognizer()
            self.recognizer.energy_threshold = 300
            self.recognizer.dynamic_energy_threshold = True
            self.recognizer.pause_threshold = 0.8
        except Exception as e:
            print(f"[STT INIT ERROR] {e}")
            self.recognizer = None

    def speak(self, text: str) -> None:
        """Queue text to be spoken aloud asynchronously."""
        if not text:
            return
        self.tts_queue.put(text)

    def _tts_worker(self) -> None:
        while True:
            text = self.tts_queue.get()
            if text is None:
                break
            try:
                # Clean embedded markdown/brackets from spoken output
                clean_text = text.replace("*", "").replace("#", "").replace("[", "").replace("]", "")
                if self.tts_engine:
                    self.tts_engine.say(clean_text)
                    self.tts_engine.runAndWait()
            except Exception as e:
                print(f"[TTS ERROR] {e}")
            finally:
                self.tts_queue.task_done()

    def listen_once(self, timeout: int = 6, phrase_limit: int = 10) -> Optional[str]:
        """Capture a single voice utterance and convert to text."""
        if not self.recognizer:
            print("\n[VOICE NOTICE] Speech recognition module not available. Please type your prompt.")
            return None
        try:
            with sr.Microphone() as source:
                print("\n[🎙️ JARVIS LISTENING...] (Speak now into your microphone)")
                self.recognizer.adjust_for_ambient_noise(source, duration=0.4)
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_limit)
                text = self.recognizer.recognize_google(audio)
                return text.strip()
        except (AttributeError, OSError, ImportError) as e:
            print(f"\n[MIC NOT DETECTED] PyAudio is not active on this Python version: {e}")
            print("[TIP] You can type prompts directly below!")
            return None
        except sr.WaitTimeoutError:
            return None
        except sr.UnknownValueError:
            return None
        except Exception as e:
            print(f"[STT NOTICE] {e}")
            return None

    def start_background_listening(self, callback: Callable[[str], None]) -> None:
        """Start continuous non-blocking background room audio listening."""
        if not self.recognizer:
            return
        try:
            mic = sr.Microphone()
            with mic as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)

            def audio_handler(recognizer_instance, audio_data):
                try:
                    text = recognizer_instance.recognize_google(audio_data)
                    if text and text.strip():
                        callback(text.strip())
                except Exception:
                    pass

            self.stop_listening_fn = self.recognizer.listen_in_background(mic, audio_handler, phrase_time_limit=10)
            self.is_listening = True
            print("[🎙️ CONTINUOUS ROOM LISTENING ENGAGED]")
        except Exception as e:
            print(f"[BACKGROUND LISTENING ERROR] {e}")


voice = JarvisVoice()
