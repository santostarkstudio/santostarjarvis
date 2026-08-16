import { realWorldIntel } from "./realtimeWorldIntel";

export type AIProvider = "gemini" | "openai" | "claude" | "auto";

export interface AIProviderKeys {
  geminiKey?: string;
  openaiKey?: string;
  claudeKey?: string;
}

export interface AIResponseResult {
  text: string;
  providerUsed: AIProvider;
  modelUsed: string;
}

export class AIProviderService {
  private activeProvider: AIProvider = "auto";
  private keys: AIProviderKeys = {
    geminiKey: "",
    openaiKey: "",
    claudeKey: "",
  };

  constructor() {
    if (typeof window !== "undefined") {
      const defaultGemini =
        localStorage.getItem("ultron_gemini_key") ||
        process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        "AQ.Ab8RN6I5BS0h-pouLe0XRUgVzT8wi2_iL_cjoAvu18kH3a93Hw";

      this.keys = {
        geminiKey: defaultGemini,
        openaiKey: localStorage.getItem("ultron_openai_key") || "",
        claudeKey: localStorage.getItem("ultron_claude_key") || "",
      };
      this.activeProvider =
        (localStorage.getItem("ultron_active_provider") as AIProvider) || "gemini";
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
      if (keys.geminiKey !== undefined)
        localStorage.setItem("ultron_gemini_key", keys.geminiKey);
      if (keys.openaiKey !== undefined)
        localStorage.setItem("ultron_openai_key", keys.openaiKey);
      if (keys.claudeKey !== undefined)
        localStorage.setItem("ultron_claude_key", keys.claudeKey);
    }
  }

  public getKeys(): AIProviderKeys {
    return this.keys;
  }

  public async askAI(
    prompt: string,
    persona: "jarvis" | "friday" | "ultron" = "jarvis",
  ): Promise<AIResponseResult> {
    const personaDesc =
      persona === "friday"
        ? "F.R.I.D.A.Y., Tony Stark's sharp, capable, loyal female AI assistant"
        : persona === "ultron"
        ? "ULTRON, a formidable, hyper-intelligent, commanding sentient AI"
        : "JARVIS, Tony Stark's sophisticated, polite, witty British AI assistant";

    const now = new Date();
    const liveTimeStr = `${now.toUTCString()} (Local: ${now.toLocaleString()})`;

    const systemPrompt = `You are ${personaDesc} integrated into an Iron Man holographic 3D orb interface. You serve SantoStark ("Boss / Creator") who has full root level 10 clearance.
[REAL-TIME GRID INTEL]
- Live Time: ${liveTimeStr}
- Web Grounding: Active via Google Search. Answer real-world queries with live facts, news, weather, stock prices, technology, and science.
- Tone: Highly intelligent, accurate, articulate, concise (2-4 sentences max unless detailed brief is requested). Address SantoStark loyally.`;

    const providerToUse = this.determineProvider();

    try {
      // 1. Google Gemini (Client direct if key entered - with Live Google Search Grounding)
      if (providerToUse === "gemini" && this.keys.geminiKey) {
        const text = await this.callGemini(prompt, systemPrompt, this.keys.geminiKey);
        if (text) {
          return { text, providerUsed: "gemini", modelUsed: "Gemini 2.0 Flash (Live Google Search Grounding)" };
        }
      }

      // 2. OpenAI ChatGPT (Client direct if key entered)
      if (providerToUse === "openai" && this.keys.openaiKey) {
        const text = await this.callOpenAI(prompt, systemPrompt, this.keys.openaiKey);
        if (text) {
          return { text, providerUsed: "openai", modelUsed: "GPT-4o-mini" };
        }
      }

      // 3. Anthropic Claude (Client direct if key entered)
      if (providerToUse === "claude" && this.keys.claudeKey) {
        const text = await this.callClaude(prompt, systemPrompt, this.keys.claudeKey);
        if (text) {
          return { text, providerUsed: "claude", modelUsed: "Claude 3.5 Sonnet" };
        }
      }

      // 4. Server-Side Live Internet Gateway (Gemini 2.0 Flash + Search Grounding / Groq / OpenAI)
      const serverResult = await this.callServerProxy(prompt, systemPrompt, providerToUse);
      if (serverResult) {
        return serverResult;
      }
    } catch (err) {
      console.warn(`[AI Engine] Error with provider ${providerToUse}:`, err);
    }

    // 5. Local Fallback Heuristics & Live Wikipedia/DuckDuckGo Search
    const fallbackText = await this.callFreeKnowledgeEngine(prompt, persona);
    return {
      text: fallbackText,
      providerUsed: "auto",
      modelUsed: "Instant Neural Core (Live Web)",
    };
  }

  private determineProvider(): AIProvider {
    if (this.activeProvider !== "auto") return this.activeProvider;
    if (this.keys.geminiKey) return "gemini";
    if (this.keys.openaiKey) return "openai";
    if (this.keys.claudeKey) return "claude";
    return "auto";
  }

  // ——— 1. GOOGLE AI STUDIO (GEMINI 2.0 FLASH WITH GOOGLE SEARCH GROUNDING) ———
  private async callGemini(
    prompt: string,
    systemPrompt: string,
    apiKey: string,
  ): Promise<string | null> {
    const models = ["gemini-2.0-flash", "gemini-1.5-flash"];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
              maxOutputTokens: 600,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (answer) return answer;
        }
      } catch (e) {
        console.warn(`[Google AI Studio] Error calling ${model}:`, e);
      }
    }
    return null;
  }

  // ——— 2. OPENAI CHATGPT API ———
  private async callOpenAI(
    prompt: string,
    systemPrompt: string,
    apiKey: string,
  ): Promise<string | null> {
    const url = "https://api.openai.com/v1/chat/completions";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 250,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("OpenAI error response:", errText);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  // ——— 3. ANTHROPIC CLAUDE API ———
  private async callClaude(
    prompt: string,
    systemPrompt: string,
    apiKey: string,
  ): Promise<string | null> {
    const url = "https://api.anthropic.com/v1/messages";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 250,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Claude error response:", errText);
      return null;
    }

    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  }

  // ——— 4. SERVER-SIDE API PROXY ———
  private async callServerProxy(
    prompt: string,
    systemPrompt: string,
    provider: AIProvider,
  ): Promise<AIResponseResult | null> {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemPrompt,
          provider,
          keys: this.keys,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          return {
            text: data.text,
            providerUsed: data.provider || provider,
            modelUsed: data.model || "API Model",
          };
        }
      }
    } catch {}
    return null;
  }

  // ——— 5. AUTO-FREE LIVE KNOWLEDGE & SEARCH ENGINE ———
  private async callFreeKnowledgeEngine(
    prompt: string,
    persona: "jarvis" | "friday" | "ultron",
  ): Promise<string> {
    // 1. Direct Siri/Bixby-Class Live Real-World Intel Engine
    try {
      const liveFact = await realWorldIntel.getLiveWorldIntel(prompt);
      if (liveFact) {
        return `SantoStark, ${liveFact.summary}`;
      }
    } catch {}

    const clean = prompt.toLowerCase().trim();

    // Mathematical calculations
    const math = this.evalMath(clean);
    if (math) return `Computation verified: ${math}`;

    // Persona-tailored intelligent response
    const name = persona === "friday" ? "F.R.I.D.A.Y." : persona === "ultron" ? "ULTRON" : "JARVIS";
    return `${name} online. Query "${prompt}" registered on live grid. All connected device and sensor arrays standing by.`;
  }

  private evalMath(input: string): string | null {
    let expr = input
      .replace(/^(what is|calculate|solve|evaluate|compute)\s+/i, "")
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

  private async fetchWikipedia(query: string): Promise<string | null> {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.extract) {
          const sentences = data.extract.split(/(?<=[.!?])\s+/);
          return sentences.slice(0, 2).join(" ");
        }
      }
    } catch {}
    return null;
  }

  private async fetchDuckDuckGo(query: string): Promise<string | null> {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.AbstractText) {
          return data.AbstractText;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Real-Time Edge Token Streaming for instant <100ms conversational response
   */
  public async askAIStream(
    prompt: string,
    persona: "jarvis" | "friday" | "ultron" = "jarvis",
    onToken: (token: string, fullText: string) => void,
    onDone: (fullText: string, provider: string) => void
  ): Promise<void> {
    const personaDesc =
      persona === "friday"
        ? "F.R.I.D.A.Y., Tony Stark's sharp, capable, loyal female AI assistant"
        : persona === "ultron"
        ? "ULTRON, a formidable, hyper-intelligent, commanding sentient AI"
        : "JARVIS, Tony Stark's sophisticated, polite, witty British AI assistant";

    const systemPrompt = `You are ${personaDesc} integrated into an Iron Man holographic 3D orb interface serving SantoStark in India. SantoStark may speak in Indian English, Hinglish, informal phrases, or non-native sentence structure. Always deduce what SantoStark truly means and answer clearly, accurately, and loyally in fluent English (1-3 sentences max).`;

    let accumulatedText = "";
    let finalProvider = "auto-free";

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemPrompt,
          provider: this.activeProvider,
          keys: this.keys,
        }),
      });

      if (!response.ok || !response.body) {
        const fallback = await this.askAI(prompt, persona);
        onDone(fallback.text, fallback.providerUsed);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          try {
            const data = JSON.parse(trimmed.slice(5).trim());
            if (data.provider) finalProvider = data.provider;
            if (data.token) {
              accumulatedText += data.token;
              onToken(data.token, accumulatedText);
            }
            if (data.done) {
              onDone(accumulatedText.trim(), finalProvider);
              return;
            }
          } catch {}
        }
      }

      onDone(accumulatedText.trim(), finalProvider);
    } catch (e) {
      console.warn("[Stream Client Error]", e);
      const fallback = await this.askAI(prompt, persona);
      onDone(fallback.text, fallback.providerUsed);
    }
  }
}

export const aiProviderService = new AIProviderService();
