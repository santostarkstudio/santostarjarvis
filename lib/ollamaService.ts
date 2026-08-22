export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

export interface OllamaStatus {
  isAvailable: boolean;
  activeModel: string;
  availableModels: string[];
  latencyMs: number;
}

export class OllamaService {
  private baseUrl: string = "http://127.0.0.1:11434";
  private isAvailable: boolean = false;
  private availableModels: string[] = [];
  private selectedModel: string = "llama3.2";
  private lastProbeTime: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.baseUrl = localStorage.getItem("ultron_ollama_url") || "http://127.0.0.1:11434";
      this.selectedModel = localStorage.getItem("ultron_ollama_model") || "llama3.2";
      void this.probeOllama();
    }
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, "");
    if (typeof window !== "undefined") {
      localStorage.setItem("ultron_ollama_url", this.baseUrl);
    }
    void this.probeOllama();
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setSelectedModel(model: string): void {
    this.selectedModel = model;
    if (typeof window !== "undefined") {
      localStorage.setItem("ultron_ollama_model", model);
    }
  }

  public getSelectedModel(): string {
    return this.selectedModel;
  }

  /**
   * Probe local Ollama instance for models & latency
   */
  public async probeOllama(): Promise<OllamaStatus> {
    const t0 = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });

      if (res.ok) {
        const data = await res.json();
        const models: string[] = (data.models || []).map((m: any) => m.name || m.model);
        this.isAvailable = true;
        this.availableModels = models;
        this.lastProbeTime = performance.now();

        // Auto-select first available model if current is not in list
        if (models.length > 0 && !models.includes(this.selectedModel)) {
          this.selectedModel = models[0];
        }

        const latency = Math.round(performance.now() - t0);
        return {
          isAvailable: true,
          activeModel: this.selectedModel || "local",
          availableModels: models,
          latencyMs: latency,
        };
      }
    } catch {
      // Fallback probe to localhost
      if (this.baseUrl !== "http://localhost:11434") {
        try {
          const res2 = await fetch("http://localhost:11434/api/tags", {
            method: "GET",
            signal: AbortSignal.timeout(1500),
          });
          if (res2.ok) {
            const data = await res2.json();
            const models = (data.models || []).map((m: any) => m.name || m.model);
            this.baseUrl = "http://localhost:11434";
            this.isAvailable = true;
            this.availableModels = models;
            if (models.length > 0 && !models.includes(this.selectedModel)) {
              this.selectedModel = models[0];
            }
            return {
              isAvailable: true,
              activeModel: this.selectedModel,
              availableModels: models,
              latencyMs: Math.round(performance.now() - t0),
            };
          }
        } catch {}
      }
    }

    this.isAvailable = false;
    return {
      isAvailable: false,
      activeModel: "none",
      availableModels: [],
      latencyMs: 0,
    };
  }

  public getStatus(): boolean {
    return this.isAvailable;
  }

  public getModels(): string[] {
    return this.availableModels;
  }

  /**
   * Execute Local Offline Inference via Ollama
   */
  public async generate(
    prompt: string,
    systemPrompt: string,
    onToken?: (token: string, fullText: string) => void
  ): Promise<string | null> {
    try {
      const modelToUse = this.selectedModel || (this.availableModels.length > 0 ? this.availableModels[0] : "llama3.2");
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelToUse,
          prompt: prompt,
          system: systemPrompt,
          stream: Boolean(onToken),
          options: {
            temperature: 0.7,
            num_predict: 250,
          },
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) return null;

      if (!onToken) {
        const data = await res.json();
        return (data.response || "").trim();
      }

      // Stream handling
      const reader = res.body?.getReader();
      if (!reader) return null;

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.trim().length > 0);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              fullText += parsed.response;
              onToken(parsed.response, fullText);
            }
          } catch {}
        }
      }

      return fullText.trim();
    } catch (e) {
      console.warn("[Ollama Local Inference Error]", e);
      return null;
    }
  }
}

export const ollamaService = new OllamaService();
