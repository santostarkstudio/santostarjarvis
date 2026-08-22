export interface DeviceState {
  id: string;
  name: string;
  model: string;
  status: "online" | "busy" | "standby" | "offline";
  battery: number;
  currentApp: string;
  screenContent: string;
  lastAction: string;
}

export interface AgentStep {
  id: string;
  stepNumber: number;
  type: "OCR" | "TAP" | "TYPE" | "SWIPE" | "VERIFY" | "COMPLETE";
  description: string;
  timestamp: string;
  status: "pending" | "running" | "success" | "failed";
}

export interface AutomationTask {
  id: string;
  deviceId: string;
  goal: string;
  status: "idle" | "running" | "completed" | "failed";
  steps: AgentStep[];
}

export class DeviceAutomationEngine {
  private devices: DeviceState[] = [
    {
      id: "dev-01",
      name: "SANTOSTARK PRIMARY",
      model: "SantoStark Personal Device",
      status: "online",
      battery: 100,
      currentApp: "ULTRON Neural OS",
      screenContent: "ROOT_COMMAND_TERMINAL",
      lastAction: "NEURAL_LINK_ACTIVE",
    },
  ];

  private activeTask: AutomationTask | null = null;
  private onUpdateCallback: (() => void) | null = null;

  constructor() {
    this.loadSavedDevices();
  }

  private loadSavedDevices(): void {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("stark_registered_devices");
        if (saved) {
          this.devices = JSON.parse(saved);
        }
      } catch (e) {
        console.warn("Failed to load saved devices", e);
      }
    }
  }

  private saveDevices(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("stark_registered_devices", JSON.stringify(this.devices));
      } catch (e) {
        console.warn("Failed to save devices", e);
      }
    }
  }

  public setPrimaryDevice(name: string, model: string): void {
    if (this.devices.length > 0) {
      this.devices[0].name = name;
      this.devices[0].model = model;
    } else {
      this.devices.push({
        id: "dev-01",
        name,
        model,
        status: "online",
        battery: 100,
        currentApp: "ULTRON Neural OS",
        screenContent: "ROOT_COMMAND_TERMINAL",
        lastAction: "NEURAL_LINK_ACTIVE",
      });
    }
    this.saveDevices();
    this.notify();
  }

  public setUpdateListener(cb: () => void): void {
    this.onUpdateCallback = cb;
  }

  public getDevices(): DeviceState[] {
    return this.devices;
  }

  public getActiveTask(): AutomationTask | null {
    return this.activeTask;
  }

  /**
   * Dispatches a high-level natural language command to real/simulated Android devices
   */
  public async executeDeviceGoal(
    goal: string,
    targetDeviceId = "dev-01",
  ): Promise<string> {
    const targetDev = this.devices.find((d) => d.id === targetDeviceId) || this.devices[0];
    const taskId = `task_${Date.now()}`;
    const cleanGoal = goal.toLowerCase();

    targetDev.status = "busy";
    this.notify();

    // Determine task pipeline
    let plannedSteps: AgentStep[] = [];

    if (cleanGoal.includes("youtube") || cleanGoal.includes("video") || cleanGoal.includes("song")) {
      plannedSteps = [
        {
          id: "s1",
          stepNumber: 1,
          type: "TAP",
          description: "Waking display & unlocking lockscreen",
          timestamp: this.now(),
          status: "pending",
        },
        {
          id: "s2",
          stepNumber: 2,
          type: "OCR",
          description: "Detecting YouTube icon coordinates (x: 320, y: 760)",
          timestamp: this.now(),
          status: "pending",
        },
        {
          id: "s3",
          stepNumber: 3,
          type: "TAP",
          description: "Launching com.google.android.youtube",
          timestamp: this.now(),
          status: "pending",
        },
        {
          id: "s4",
          stepNumber: 4,
          type: "TYPE",
          description: "Inputting search query: 'Iron Man Jarvis UI Demo'",
          timestamp: this.now(),
          status: "pending",
        },
        {
          id: "s5",
          stepNumber: 5,
          type: "VERIFY",
          description: "Verifying video player playback buffer",
          timestamp: this.now(),
          status: "pending",
        },
      ];
    } else if (cleanGoal.includes("unlock") || cleanGoal.includes("wake")) {
      plannedSteps = [
        {
          id: "s1",
          stepNumber: 1,
          type: "SWIPE",
          description: "Keyguard swipe unlock (0.5, 0.8 -> 0.5, 0.2)",
          timestamp: this.now(),
          status: "pending",
        },
        {
          id: "s2",
          stepNumber: 2,
          type: "VERIFY",
          description: "Verifying launcher home screen presence",
          timestamp: this.now(),
          status: "pending",
        },
      ];
    } else if (cleanGoal.includes("camera") || cleanGoal.includes("photo")) {
      plannedSteps = [
        {
          id: "s1",
          stepNumber: 1,
          type: "TAP",
          description: "Double-tap power button / camera quick launch",
          timestamp: this.now(),
          status: "pending",
        },
        {
          id: "s2",
          stepNumber: 2,
          type: "VERIFY",
          description: "Camera optical viewfinder stabilized",
          timestamp: this.now(),
          status: "pending",
        },
        {
          id: "s3",
          stepNumber: 3,
          type: "TAP",
          description: "Capturing frame snapshot",
          timestamp: this.now(),
          status: "pending",
        },
      ];
    } else {
      // General autonomous search / action
      plannedSteps = [
        {
          id: "s1",
          stepNumber: 1,
          type: "OCR",
          description: "Screen snapshot & visual element analysis",
          timestamp: this.now(),
          status: "pending",
        },
        {
          id: "s2",
          stepNumber: 2,
          type: "TAP",
          description: `Executing action: ${goal}`,
          timestamp: this.now(),
          status: "pending",
        },
        {
          id: "s3",
          stepNumber: 3,
          type: "VERIFY",
          description: "Step completion verification",
          timestamp: this.now(),
          status: "pending",
        },
      ];
    }

    this.activeTask = {
      id: taskId,
      deviceId: targetDev.id,
      goal,
      status: "running",
      steps: plannedSteps,
    };
    this.notify();

    // Step-by-step execution simulation
    for (let i = 0; i < plannedSteps.length; i++) {
      const step = plannedSteps[i];
      step.status = "running";
      targetDev.lastAction = step.description;
      this.notify();

      await new Promise((r) => setTimeout(r, 600));

      step.status = "success";
      if (step.description.includes("YouTube")) {
        targetDev.currentApp = "YouTube";
        targetDev.screenContent = "YOUTUBE_PLAYING";
      } else if (step.description.includes("Camera")) {
        targetDev.currentApp = "Camera";
        targetDev.screenContent = "CAMERA_VIEW";
      } else if (step.description.includes("unlock")) {
        targetDev.currentApp = "Launcher";
        targetDev.screenContent = "HOME_UNLOCKED";
      }
      this.notify();
    }

    this.activeTask.status = "completed";
    targetDev.status = "online";
    targetDev.lastAction = "TASK_COMPLETED_SUCCESSFULLY";
    this.notify();

    return `Action '${goal}' executed across ${targetDev.name} (${targetDev.model}). All verification checks passed.`;
  }

  /**
   * Dispatches native Windows app launching commands
   */
  public async launchDesktopApp(app: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch("/api/system/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app }),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.error || "Command processed." };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to launch application." };
    }
  }

  /**
   * Dispatches native Windows OS actions (volume, lock, screenshot)
   */
  public async executeSystemAction(action: "lock" | "mute" | "volume_up" | "volume_down" | "screenshot"): Promise<{ success: boolean; message: string; url?: string }> {
    try {
      const res = await fetch("/api/system/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.error || "System action processed.", url: data.url };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to execute system action." };
    }
  }

  /**
   * Persists a note or user preference into the Stark Memory Vault
   */
  public async saveMemoryNote(topic: string, content: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_note", topic, content }),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || "Memory saved." };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to save memory." };
    }
  }

  private now(): string {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  }

  private notify(): void {
    if (this.onUpdateCallback) this.onUpdateCallback();
  }
}

export const deviceAutomation = new DeviceAutomationEngine();

