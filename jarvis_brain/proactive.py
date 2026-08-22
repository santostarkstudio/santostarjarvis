import time
import threading
import datetime
try:
    import psutil
except ImportError:
    psutil = None

class ProactiveIntelligence:
    def __init__(self):
        self.active = False
        self.monitor_thread = None
        self.last_break_alert = time.time()
        self.startup_time = time.time()

    def _monitor_loop(self):
        while self.active:
            now = time.time()
            current_hour = datetime.datetime.now().hour
            
            # Feature 1: Work break reminder (every 2 hours)
            if now - self.last_break_alert > 7200: # 2 hours
                self._trigger_hud_alert(
                    "Sir, you have been working continuously for 2 hours. I highly recommend a 10-minute break to avoid fatigue."
                )
                self.last_break_alert = now
                
            # Feature 2: High CPU usage warning (if psutil available)
            if psutil:
                try:
                    cpu_usage = psutil.cpu_percent(interval=1)
                    if cpu_usage > 90.0:
                        self._trigger_hud_alert(
                            f"Warning: System CPU load is critically high at {cpu_usage}%. Recommend closing non-essential processes."
                        )
                        time.sleep(300) # Wait 5 minutes before warning again
                except Exception:
                    pass
                    
            # Check every 60 seconds
            time.sleep(60)

    def _trigger_hud_alert(self, message: str):
        try:
            from hud import hud_controller
            hud_controller.show_alert(f"[PROACTIVE AI]: {message}")
        except Exception as e:
            print(f"[PROACTIVE AI ERROR] Failed to send HUD alert: {e}")

    def start(self):
        if self.active:
            return
        self.active = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        print("[JARVIS] Proactive Intelligence (Friday Protocol) ONLINE.")

    def stop(self):
        self.active = False

friday_protocol = ProactiveIntelligence()
