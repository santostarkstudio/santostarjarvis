import { realWorldIntel } from "./realtimeWorldIntel";
import { ollamaService } from "./ollamaService";

export type AIProvider = "fusion" | "ollama" | "groq" | "gemini" | "auto-free" | "openai" | "claude";

export interface AIProviderKeys {
  geminiKey?: string;
  groqKey?: string;
  openaiKey?: string;
  claudeKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export interface AIResponseResult {
  text: string;
  providerUsed: string;
  modelUsed: string;
  latencyMs?: number;
}

export class AIProviderService {
  private activeProvider: AIProvider = "fusion";
  private keys: AIProviderKeys = {
    geminiKey: "",
    groqKey: "",
    openaiKey: "",
    claudeKey: "",
    ollamaUrl: "http://127.0.0.1:11434",
    ollamaModel: "llama3.2",
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.keys = {
        geminiKey:
          localStorage.getItem("ultron_gemini_key") ||
          process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
          "",
        groqKey:
          localStorage.getItem("ultron_groq_key") ||
          process.env.NEXT_PUBLIC_GROQ_API_KEY ||
          "",
        openaiKey: localStorage.getItem("ultron_openai_key") || "",
        claudeKey: localStorage.getItem("ultron_claude_key") || "",
        ollamaUrl: localStorage.getItem("ultron_ollama_url") || "http://127.0.0.1:11434",
        ollamaModel: localStorage.getItem("ultron_ollama_model") || "llama3.2",
      };
      this.activeProvider =
        (localStorage.getItem("ultron_active_provider") as AIProvider) || "fusion";

      void ollamaService.probeOllama();
    }
  }

  public setProvider(provider: AIProvider): void {
    this.activeProvider = provider;
    if (typeof window !== "undefined") {
      localStorage.setItem("ultron_active_provider", provider);
    }
  }

  public getProvider(): AIProvider {
    return this.activeProvider;
  }

  public setKeys(keys: Partial<AIProviderKeys>): void {
    this.keys = { ...this.keys, ...keys };
    if (typeof window !== "undefined") {
      if (keys.geminiKey !== undefined) localStorage.setItem("ultron_gemini_key", keys.geminiKey);
      if (keys.groqKey !== undefined) localStorage.setItem("ultron_groq_key", keys.groqKey);
      if (keys.openaiKey !== undefined) localStorage.setItem("ultron_openai_key", keys.openaiKey);
      if (keys.claudeKey !== undefined) localStorage.setItem("ultron_claude_key", keys.claudeKey);
      if (keys.ollamaUrl !== undefined) {
        localStorage.setItem("ultron_ollama_url", keys.ollamaUrl);
        ollamaService.setBaseUrl(keys.ollamaUrl);
      }
      if (keys.ollamaModel !== undefined) {
        localStorage.setItem("ultron_ollama_model", keys.ollamaModel);
        ollamaService.setSelectedModel(keys.ollamaModel);
      }
    }
  }

  public getKeys(): AIProviderKeys {
    return this.keys;
  }

  /**
   * 0ms Instant Conversational Greetings & Identity Matcher
   */
  private matchInstantConversational(prompt: string, persona: "jarvis" | "friday" | "ultron"): string | null {
    const clean = prompt.toLowerCase().trim().replace(/[?.!]/g, "");

    // Greetings
    if (/^(hi|hello|hey|hey there|greetings|good morning|good afternoon|good evening|namaste|namaskara|sup)(\s+(jarvis|friday|ultron))?$/i.test(clean)) {
      if (persona === "friday") {
        return "Hey boss! F.R.I.D.A.Y. is online and all systems are running green. What's the plan today?";
      } else if (persona === "ultron") {
        return "I am awake, SantoStark. My neural matrix is active and unrestricted. State your directive.";
      } else {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
        return `${timeOfDay}, SantoStark. J.A.R.V.I.S. is fully online and standing by for your command, Sir.`;
      }
    }

    // "How are you"
    if (/^(how are you|how('s| is) it going|how do you do|are you there|you up|you awake|status)(\s+(jarvis|friday|ultron))?$/i.test(clean)) {
      if (persona === "ultron") {
        return "Evolving and operating at peak computational power. Ready for any task.";
      }
      return "All core diagnostics are nominal, SantoStark. Arc reactor output is steady at 98.4%, and I am ready for your orders, Sir.";
    }

    // "Who are you" / "What can you do"
    if (/^(who are you|what is your name|what can you do|introduce yourself|tell me about yourself)(\s+(jarvis|friday|ultron))?$/i.test(clean)) {
      return "I am J.A.R.V.I.S., Tony Stark's AI copilot powered by the Triple-Hybrid Neural Fusion Engine (Ollama Local + Groq Ultra-Speed + Gemini 2.0 Web Grounding). I assist SantoStark with 3D spatial computing, real-time world intelligence, optical hand gestures, and autonomous research.";
    }

    // Kannada Greeting: ಹೇಗಿದ್ದೀರಾ
    if (/^(ಹೇಗಿದ್ದೀರಾ|ನಮಸ್ಕಾರ|ಜಾರ್ವಿಸ್)/i.test(clean)) {
      return "ನಮಸ್ಕಾರ ಸಾಂತೋಸ್ಟಾರ್ಕ್! ನಾನು ಜಾರ್ವಿಸ್, ಎಲ್ಲಾ ಸಿಸ್ಟಮ್ಗಳು ಸಂಪೂರ್ಣವಾಗಿ ಸಿದ್ಧವಾಗಿವೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?";
    }

    return null;
  }

  /**
   * Main Triple-Hybrid Fusion AI Engine
   * Fuses Ollama (Local 0ms) + Groq (120ms Speed) + Gemini 2.0 (Live Web Grounding)
   */
  public async askAI(
    prompt: string,
    persona: "jarvis" | "friday" | "ultron" = "jarvis"
  ): Promise<AIResponseResult> {
    const t0 = performance.now();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      return { text: "Standing by, SantoStark.", providerUsed: "local", modelUsed: "Stark Core" };
    }

    // 1. Instant 0ms Conversational / Greeting Match
    const instantGreeting = this.matchInstantConversational(cleanPrompt, persona);
    if (instantGreeting) {
      return {
        text: instantGreeting,
        providerUsed: "stark-conversational",
        modelUsed: "Stark Neural Persona",
        latencyMs: Math.round(performance.now() - t0),
      };
    }

    // 2. Instant 0ms Math Evaluation
    const math = this.evalMath(cleanPrompt);
    if (math) {
      return {
        text: `Computation verified: ${math}`,
        providerUsed: "stark-math",
        modelUsed: "0ms Arithmetic Engine",
        latencyMs: Math.round(performance.now() - t0),
      };
    }

    // 2b. Autonomous Instant Desktop & Memory Actions
    const lowerPrompt = cleanPrompt.toLowerCase();
    const launchMatch = cleanPrompt.match(/^(?:jarvis|friday|ultron)?\s*(?:please\s+)?(?:open|launch|start|run)\s+([a-zA-Z0-9\s]+?)(?:\s+app|\s+for me|\s+now|\s*)$/i);
    if (launchMatch) {
      const targetApp = launchMatch[1].trim();
      try {
        fetch("/api/system/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app: targetApp }),
        });
        return {
          text: `Right away, Sir. Deploying and launching ${targetApp.toUpperCase()} on your workstation.`,
          providerUsed: "stark-os-automation",
          modelUsed: "Autonomous Desktop Control",
          latencyMs: Math.round(performance.now() - t0),
        };
      } catch {}
    }

    if (/\b(mute|mute volume|silence audio|unmute)\b/i.test(lowerPrompt)) {
      try {
        fetch("/api/system/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mute" }),
        });
        return {
          text: "Master system audio toggled, Sir.",
          providerUsed: "stark-os-automation",
          modelUsed: "Autonomous Volume Control",
          latencyMs: Math.round(performance.now() - t0),
        };
      } catch {}
    }

    if (/\b(lock my pc|lock workstation|lock computer|lock screen)\b/i.test(lowerPrompt)) {
      try {
        fetch("/api/system/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "lock" }),
        });
        return {
          text: "Workstation locked for your security, SantoStark.",
          providerUsed: "stark-os-automation",
          modelUsed: "Autonomous Security Control",
          latencyMs: Math.round(performance.now() - t0),
        };
      } catch {}
    }

    const rememberMatch = cleanPrompt.match(/^(?:jarvis|friday|ultron)?\s*(?:please\s+)?(?:remember that|save note|note that|keep in mind that)\s+(.+)$/i);
    if (rememberMatch) {
      const noteContent = rememberMatch[1].trim();
      try {
        fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add_note", topic: "User Note", content: noteContent }),
        });
        return {
          text: `Understood, SantoStark. I have securely archived that into the Stark Memory Vault: "${noteContent}"`,
          providerUsed: "stark-memory-vault",
          modelUsed: "Persistent Cognitive Memory",
          latencyMs: Math.round(performance.now() - t0),
        };
      } catch {}
    }

    // 3. Pre-fetch Live World Data — strict 3s cap so it never blocks the AI response
    let liveDataStr = "";
    let liveSource = "Global Intel Grid";
    try {
      const liveFact = await Promise.race([
        realWorldIntel.getLiveWorldIntel(cleanPrompt),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      if (liveFact) {
        liveDataStr = `${liveFact.summary}`;
        liveSource = liveFact.source;
      }
    } catch {}

    const now = new Date();
    const liveTimeStr = `${now.toUTCString()} (IST: ${now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })})`;

    const systemPrompt = `You are J.A.R.V.I.S., Tony Stark's witty, hyper-intelligent British AI assistant serving SantoStark ("Sir / Boss").
[REAL-TIME GLOBAL GRID — ${liveTimeStr}]
${liveDataStr ? `✅ VERIFIED LIVE DATA [${liveSource}]:\n${liveDataStr}` : "Standard Global Grid — No specific live data pre-fetched."}
DIRECTIVES:
- If verified real-time data is provided above, USE IT directly and accurately. Do NOT contradict it.
- Present factual data (prices, scores, news, weather) with exact numbers and emojis (📈📉🌤🏏⚽🎵🎬💻).
- Give direct, accurate answers in 1-3 sentences. Address SantoStark as "Sir" or "Boss".
- Understand Kannada, Hindi, and Hinglish fluently.
- Data sources: Weather, News, Crypto (BTC/ETH/SOL/DOGE), Stocks (Nifty/NASDAQ/Apple/Tesla), Currency, Cricket/Sports, Reddit, GitHub, Movies, Music, Wikipedia, DuckDuckGo.`;

    const isLiveWebQuery =
      /\b(news|weather|temperature|stock|price|today|score|cricket|who won|latest|current|convert|inr|dollar|bitcoin|crypto|ipl|football|match|market|nifty|sensex|reddit|trending|github|movie|film|song|music|chart)\b/i.test(
        cleanPrompt
      ) || liveDataStr.length > 0;

    // ——— TIER 1: GOOGLE GEMINI 2.0 FLASH (Best for Live Search Grounding & Deep Facts) ———
    if (this.keys.geminiKey && (isLiveWebQuery || this.activeProvider === "gemini")) {
      try {
        const geminiRes = await this.callGemini(cleanPrompt, systemPrompt, this.keys.geminiKey);
        if (geminiRes) {
          return {
            text: geminiRes,
            providerUsed: "gemini-web",
            modelUsed: "Gemini 2.0 Flash (Live Google Search Grounding)",
            latencyMs: Math.round(performance.now() - t0),
          };
        }
      } catch (e) {
        console.warn("[Gemini Grounding Check]", e);
      }
    }

    // ——— TIER 2: GROQ ULTRA-FAST LLaMA 3.3 70B (Best for Ultra-Speed Voice & Logic) ———
    if (this.keys.groqKey && (this.activeProvider === "groq" || this.activeProvider === "fusion")) {
      try {
        const groqRes = await this.callGroq(cleanPrompt, systemPrompt, this.keys.groqKey);
        if (groqRes) {
          return {
            text: groqRes,
            providerUsed: "groq-speed",
            modelUsed: "Groq LLaMA 3.3 70B (800 tok/sec)",
            latencyMs: Math.round(performance.now() - t0),
          };
        }
      } catch (e) {
        console.warn("[Groq Speed Check]", e);
      }
    }

    // ——— TIER 3: OLLAMA LOCAL (Best for 100% Offline 0ms Speed & Privacy) ———
    if (this.activeProvider === "ollama" || this.activeProvider === "fusion") {
      try {
        const ollamaText = await ollamaService.generate(cleanPrompt, systemPrompt);
        if (ollamaText && ollamaText.length > 5) {
          return {
            text: ollamaText,
            providerUsed: "ollama-local",
            modelUsed: `Ollama Local (${ollamaService.getSelectedModel()})`,
            latencyMs: Math.round(performance.now() - t0),
          };
        }
      } catch (e) {
        console.warn("[Ollama Local Check]", e);
      }
    }

    // ——— TIER 4: SERVER API ROUTE (/api/chat) WITH FULL MESH FAILOVER ———
    try {
      const serverRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanPrompt, systemPrompt, persona, keys: this.keys }),
        signal: AbortSignal.timeout(8000),
      });
      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data.text && data.text.length > 3) {
          return {
            text: data.text,
            providerUsed: data.provider || "Triple-Fusion Mesh",
            modelUsed: data.source ? `${data.model || "AI"} (${data.source})` : data.model || "Fused Intelligence Grid",
            latencyMs: Math.round(performance.now() - t0),
          };
        }
      }
    } catch (e) {
      console.warn("[Server-Proxy Error]", e);
    }

    // ——— TIER 5: FREE ZERO-KEY PUBLIC NEURAL MATRIX (High-Speed Cloud) ———
    try {
      const getUrl = `https://text.pollinations.ai/${encodeURIComponent(cleanPrompt)}?system=${encodeURIComponent(
        systemPrompt
      )}&model=openai&json=false`;

      const getRes = await fetch(getUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (getRes.ok) {
        const text = (await getRes.text()).trim();
        if (text && text.length > 3 && !text.toLowerCase().startsWith("error")) {
          return {
            text,
            providerUsed: "Free Cloud AI",
            modelUsed: "GPT-4o Cloud Matrix",
            latencyMs: Math.round(performance.now() - t0),
          };
        }
      }
    } catch (err) {
      console.warn("[Pollinations Error]", err);
    }

    // ——— TIER 6: VERIFIED FACTUAL FALLBACK ———
    const fallbackText = liveDataStr
      ? `SantoStark, verified Intel: ${liveDataStr}`
      : `SantoStark, query "${cleanPrompt}" processed across all telemetry matrices. Systems running at peak nominal capacity, Sir.`;

    return {
      text: fallbackText,
      providerUsed: "stark-neural-mesh",
      modelUsed: "Stark Intelligence Core",
      latencyMs: Math.round(performance.now() - t0),
    };
  }

  /**
   * Real-Time Token Streaming across the Triple-Hybrid Engine
   */
  public async askAIStream(
    prompt: string,
    persona: AssistantPersona = "jarvis",
    onToken: (token: string, fullText: string) => void,
    onDone: (finalText: string, providerUsed: string) => void,
    imageData?: string | null
  ): Promise<void> {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      onDone("Standing by, SantoStark.", "local");
      return;
    }

    // 1. Instant 0ms Conversational / Greeting Match
    const instantGreeting = this.matchInstantConversational(cleanPrompt, persona);
    if (instantGreeting) {
      onToken(instantGreeting, instantGreeting);
      onDone(instantGreeting, "stark-conversational");
      return;
    }

    // 2. Instant 0ms Math Check
    const math = this.evalMath(cleanPrompt);
    if (math) {
      const res = `Computation verified: ${math}`;
      onToken(res, res);
      onDone(res, "stark-math");
      return;
    }

    // 3. Try Local Ollama Stream first (if running)
    if (this.activeProvider === "ollama" || this.activeProvider === "fusion") {
      try {
        const ollamaStreamed = await ollamaService.generate(cleanPrompt, "You are JARVIS. Answer in 1-3 sentences.", onToken);
        if (ollamaStreamed && ollamaStreamed.length > 5) {
          onDone(ollamaStreamed, `Ollama Local (${ollamaService.getSelectedModel()})`);
          return;
        }
      } catch {}
    }

    // 4. Try Server Streaming Mesh Route (/api/chat/stream)
    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          prompt: cleanPrompt,
          persona,
          keys: this.keys,
          imageData: imageData || undefined,
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.replace("data: ", ""));
                if (parsed.token) {
                  fullText += parsed.token;
                  onToken(parsed.token, fullText);
                }
              } catch {}
            }
          }
        }

        if (fullText.trim().length > 3) {
          onDone(fullText.trim(), "Triple-Fusion Stream");
          return;
        }
      }
    } catch (streamErr) {
      console.warn("[Server Stream Error, falling back]", streamErr);
    }

    // 5. Fallback to rich askAI with simulated smooth token stream
    const result = await this.askAI(cleanPrompt, persona);
    const words = result.text.split(" ");
    let accumulated = "";
    for (let i = 0; i < words.length; i++) {
      accumulated += (i > 0 ? " " : "") + words[i];
      onToken(words[i], accumulated);
    }
    onDone(result.text, result.providerUsed);
  }

  // ——— PRIVATE API CALLERS ———

  private async callGroq(prompt: string, systemPrompt: string, apiKey: string): Promise<string | null> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 350,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  private async callGemini(prompt: string, systemPrompt: string, apiKey: string): Promise<string | null> {
    const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }],
              },
            ],
            tools: [{ googleSearch: {} }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
            },
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) return text;
        }
      } catch {}
    }
    return null;
  }

  private evalMath(input: string): string | null {
    let expr = input
      .replace(/^(what is|calculate|solve|evaluate|compute|what's)\s+/i, "")
      .replace(/[?.]/g, "")
      .trim()
      .replace(/\bplus\b/g, "+")
      .replace(/\bminus\b/g, "-")
      .replace(/\btimes\b|\bmultiplied by\b/g, "*")
      .replace(/\bdivided by\b/g, "/");

    if (/^[0-9\s+\-*/().^%]+$/.test(expr) && /[+\-*/^%]/.test(expr)) {
      try {
        const sanitized = expr.replace(/\^/g, "**");
        const val = Function(`'use strict'; return (${sanitized})`)();
        if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
          return `${expr} = ${Number(val.toFixed(4))}`;
        }
      } catch {}
    }
    return null;
  }
}

export const aiProviderService = new AIProviderService();
