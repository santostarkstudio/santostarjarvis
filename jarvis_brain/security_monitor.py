import os
import time
import threading
try:
    import cv2
except ImportError:
    cv2 = None
try:
    import pyautogui
except ImportError:
    pyautogui = None

class SecurityMonitor:
    def __init__(self, authorized_face_encodings=None):
        self.active = False
        self.authorized_face_encodings = authorized_face_encodings or []
        self.monitor_thread = None

    def start(self):
        if not cv2:
            print("[WARNING] OpenCV not installed. Security Monitor cannot start.")
            return
        if self.active:
            return
        
        self.active = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        print("[SECURITY] Facial recognition monitoring activated.")

    def stop(self):
        self.active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2)
        print("[SECURITY] Facial recognition monitoring deactivated.")

    def _monitor_loop(self):
        cap = cv2.VideoCapture(0)
        
        # We will use simple motion detection or face cascade as a fallback 
        # if advanced dlib face_recognition is not installed.
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        unauthorized_frames = 0

        while self.active:
            ret, frame = cap.read()
            if not ret:
                time.sleep(1)
                continue
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)

            # Basic logic: if we see a face and we haven't implemented deep face_recognition yet,
            # we just log it. If it was advanced, we'd compare encodings.
            
            if len(faces) > 0:
                # We detected faces. If the system is locked down, this is unauthorized.
                unauthorized_frames += 1
                
                if unauthorized_frames > 30: # About 1 second of unknown face
                    print("\n[CRITICAL ALERT] Unauthorized presence detected in camera FOV!")
                    self._trigger_lockdown()
                    unauthorized_frames = 0
            else:
                unauthorized_frames = max(0, unauthorized_frames - 1)
                
            # Rate limit the loop
            time.sleep(0.1)
            
        cap.release()
        
    def _trigger_lockdown(self):
        if pyautogui:
            # Simple lockdown: minimize all windows
            print("[SECURITY] Executing desktop lockdown via PyAutoGUI.")
            pyautogui.hotkey('win', 'd')
            # You could also lock the screen with:
            # os.system('rundll32.exe user32.dll,LockWorkStation')
            # But minimizing is safer for the demo.
        else:
            print("[SECURITY] Cannot trigger lockdown: PyAutoGUI unavailable.")

monitor = SecurityMonitor()

if __name__ == "__main__":
    monitor.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        monitor.stop()
