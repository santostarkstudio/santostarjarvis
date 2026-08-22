import tkinter as tk
import threading
import time

class JarvisHUD:
    def __init__(self):
        self.root = None
        self.label = None
        self.active = False
        self.hud_thread = None

    def _run_hud(self):
        self.root = tk.Tk()
        # Remove window borders
        self.root.overrideredirect(True)
        # Make the background color transparent
        self.root.attributes("-transparentcolor", "black")
        self.root.attributes("-topmost", True)
        
        # Position at the top right of the screen
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        self.root.geometry(f"600x200+{screen_width - 650}+50")
        
        self.root.configure(bg='black')
        
        self.label = tk.Label(
            self.root, 
            text="[J.A.R.V.I.S. HUD ONLINE]", 
            font=("Consolas", 16, "bold"), 
            fg="#00ffff", # Cyan Iron Man style
            bg="black",
            justify="left",
            wraplength=580
        )
        self.label.pack(expand=True, fill="both", padx=10, pady=10)
        
        self.active = True
        self.root.mainloop()

    def start_hud(self) -> str:
        if self.active:
            return "HUD is already active."
            
        self.hud_thread = threading.Thread(target=self._run_hud, daemon=True)
        self.hud_thread.start()
        
        # Wait a moment for root to initialize
        time.sleep(0.5)
        return "J.A.R.V.I.S. Desktop HUD activated."

    def stop_hud(self) -> str:
        if not self.active or not self.root:
            return "HUD is not active."
        
        self.active = False
        self.root.quit()
        return "J.A.R.V.I.S. Desktop HUD deactivated."

    def show_alert(self, message: str) -> str:
        if not self.active or not self.label:
            # Auto-start if not running
            self.start_hud()
            time.sleep(1)
            
        if self.label:
            self.label.config(text=f"[INCOMING TRANSMISSION]\n\n{message}")
            # Reset after 10 seconds automatically via thread
            def reset_text():
                time.sleep(10)
                if self.active and self.label:
                    self.label.config(text="[J.A.R.V.I.S. HUD ONLINE]")
            threading.Thread(target=reset_text, daemon=True).start()
            return f"Alert sent to HUD: {message}"
            
        return "Failed to send alert to HUD."

hud_controller = JarvisHUD()
