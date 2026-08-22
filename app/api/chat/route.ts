import { NextResponse } from "next/server";
import { realWorldIntel } from "@/lib/realtimeWorldIntel";

export async function POST(req: Request) {
  try {
    const { prompt, systemPrompt, persona = "jarvis", keys, imageData } = await req.json();

    const cleanPrompt = (prompt || "").trim();

    // Fast Heartbeat Ping Handler
    if (cleanPrompt.toLowerCase() === "ping") {
      return NextResponse.json({
        text: "PONG - Triple Fusion Mesh Active",
        provider: "Triple-Hybrid Fusion",
        model: "Ollama + Groq + Gemini 2.0",
      });
    }

    // 0. Conversational Greetings & Identity (0ms instant response)
    const cleanLower = cleanPrompt.toLowerCase().replace(/[?.!]/g, "");
    if (/^(hi|hello|hey|hey there|greetings|good morning|good afternoon|good evening|namaste|namaskara)(\s+(jarvis|friday|ultron))?$/i.test(cleanLower)) {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
      return NextResponse.json({
        text: `${timeOfDay}, SantoStark. J.A.R.V.I.S. is fully online and ready for your command, Sir. How can I assist you?`,
        provider: "Stark Persona",
        model: "Stark Neural Greetings",
      });
    }

    if (/^(how are you|how('s| is) it going|are you there|you awake|status)(\s+(jarvis|friday|ultron))?$/i.test(cleanLower)) {
      return NextResponse.json({
        text: "All primary systems are running at peak efficiency, SantoStark. Arc reactor output is steady at 98.4%, and I am ready for your orders, Sir.",
        provider: "Stark Persona",
        model: "Stark Diagnostics",
      });
    }

    // 1. Instant 0ms Math Check
    const math = evalMath(cleanPrompt);
    if (math) {
      return NextResponse.json({
        text: `Computation verified: ${math}`,
        provider: "stark-arithmetic",
        model: "Instant Math Engine",
      });
    }

    // 2. Autonomous Instant OS Command Dispatch
    const lowerPrompt = cleanPrompt.toLowerCase();
    
    // Launch Application
    const launchMatch = cleanPrompt.match(/^(?:jarvis|friday|ultron)?\s*(?:please\s+)?(?:open|launch|start|run)\s+([a-zA-Z0-9\s]+?)(?:\s+app|\s+for me|\s+now|\s*)$/i);
    if (launchMatch) {
      const targetApp = launchMatch[1].trim();
      try {
        const baseUrl = req.url.replace(/\/api\/chat.*/, "");
        const launchRes = await fetch(`${baseUrl}/api/system/launch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app: targetApp }),
        });
        if (launchRes.ok) {
          const resData = await launchRes.json();
          return NextResponse.json({
            text: `Right away, Sir. Deploying and launching ${targetApp.toUpperCase()} on your workstation.`,
            provider: "Stark OS Automation",
            model: "Autonomous Desktop Control",
          });
        }
      } catch {}
    }

    // System Volume / Lock Actions
    if (/\b(mute|mute volume|silence audio|unmute)\b/i.test(lowerPrompt)) {
      try {
        const baseUrl = req.url.replace(/\/api\/chat.*/, "");
        await fetch(`${baseUrl}/api/system/launch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mute" }),
        });
        return NextResponse.json({
          text: "Master system audio toggled, Sir.",
          provider: "Stark OS Automation",
          model: "Autonomous Volume Control",
        });
      } catch {}
    }

    if (/\b(lock my pc|lock workstation|lock computer|lock screen)\b/i.test(lowerPrompt)) {
      try {
        const baseUrl = req.url.replace(/\/api\/chat.*/, "");
        await fetch(`${baseUrl}/api/system/launch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "lock" }),
        });
        return NextResponse.json({
          text: "Workstation locked for your security, SantoStark.",
          provider: "Stark OS Automation",
          model: "Autonomous Security Control",
        });
      } catch {}
    }

    if (/\b(play music|pause music|play spotify|pause spotify|next song|previous song|next track)\b/i.test(lowerPrompt)) {
      try {
        let action = "playpause";
        if (lowerPrompt.includes("next")) action = "next";
        if (lowerPrompt.includes("previous") || lowerPrompt.includes("prev")) action = "prev";

        await fetch("http://localhost:8000/api/os/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        
        return NextResponse.json({
          text: `Media playback updated as requested, Sir.`,
          provider: "Stark OS Automation",
          model: "Autonomous Media Control",
        });
      } catch {}
    }

    // Iron Legion: Deep Research / Background Tasks
    const researchMatch = cleanPrompt.match(/^(?:jarvis|friday|ultron)?\s*(?:please\s+)?(?:research|investigate|look deeply into|spawn agent for|find everything about)\s+(.+)$/i);
    if (researchMatch) {
      const researchTopic = researchMatch[1].trim();
      try {
        await fetch("http://localhost:8000/api/agents/spawn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_description: researchTopic }),
        });
        
        return NextResponse.json({
          text: `Right away, Sir. I am spinning up an Iron Legion background agent to investigate: ${researchTopic}. I will notify you when the deep scan is complete.`,
          provider: "Iron Legion Swarm",
          model: "Autonomous Agent Task",
        });
      } catch {}
    }
    // Proactive Reminders & Timers
    const timerMatch = cleanPrompt.match(/^(?:jarvis|friday|ultron)?\s*(?:please\s+)?set a timer for (\d+)\s*(seconds?|minutes?|hours?)(?:\s+to\s+(.+))?$/i);
    if (timerMatch) {
      const amount = parseInt(timerMatch[1], 10);
      const unit = timerMatch[2].toLowerCase();
      const message = timerMatch[3] ? timerMatch[3].trim() : "Time is up, Sir.";
      
      let seconds = amount;
      if (unit.startsWith("minute")) seconds *= 60;
      if (unit.startsWith("hour")) seconds *= 3600;

      try {
        await fetch("http://localhost:8000/api/agents/timer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seconds, message }),
        });
        
        return NextResponse.json({
          text: `Timer set for ${amount} ${unit}. I will alert you proactively when it is done, Sir.`,
          provider: "Stark Timekeeper",
          model: "Autonomous Agent Task",
        });
      } catch {}
    }

    // Memory Storage: "remember that..." or "save note..."
    const rememberMatch = cleanPrompt.match(/^(?:jarvis|friday|ultron)?\s*(?:please\s+)?(?:remember that|save note|note that|keep in mind that)\s+(.+)$/i);
    if (rememberMatch) {
      const noteContent = rememberMatch[1].trim();
      try {
        // 1. Save to old JSON memory
        const baseUrl = req.url.replace(/\/api\/chat.*/, "");
        await fetch(`${baseUrl}/api/memory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add_note", topic: "User Note", content: noteContent }),
        });
        // 2. Save to new Python ChromaDB Vector Vault
        await fetch("http://localhost:8000/api/vector_memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", text: noteContent }),
        });
        
        return NextResponse.json({
          text: `Understood, SantoStark. I have securely archived that into the Stark Vector Memory Vault: "${noteContent}"`,
          provider: "Stark Memory Vault",
          model: "Persistent Cognitive Memory",
        });
      } catch (err) {
        console.warn("[Memory Save Error]", err);
      }
    }

    const geminiKey = keys?.geminiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    const groqKey = keys?.groqKey || process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "";

    const now = new Date();
    const liveTimeStr = `${now.toUTCString()} (IST: ${now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })})`;

    // 3. Pre-fetch Live Real-World Intel & Memory Context — run with strict 3s cap
    let liveDataStr = "";
    let intelSource = "";
    let vectorMemoryStr = "";

    try {
      // Parallel fetch: Web Search + Vector Memory Search
      const [liveFact, vectorRes] = await Promise.all([
        Promise.race([
          realWorldIntel.getLiveWorldIntel(cleanPrompt),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]),
        Promise.race([
          fetch("http://localhost:8000/api/vector_memory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "search", text: cleanPrompt }),
          }).then(res => res.json()),
          new Promise<any>((resolve) => setTimeout(() => resolve({ results: [] }), 1500)),
        ]).catch(() => ({ results: [] }))
      ]);

      if (liveFact) {
        intelSource = liveFact.source;
        liveDataStr = `\n[✅ LIVE INTEL — ${liveFact.source}]:\n${liveFact.summary}\n`;
      }
      
      if (vectorRes && vectorRes.results && vectorRes.results.length > 0) {
        vectorMemoryStr = `\n[🧠 STARK VECTOR MEMORY RECALLED]:\n- ${vectorRes.results.join("\n- ")}\n`;
      }
    } catch {}

    const enhancedSystemPrompt = `${systemPrompt || `You are J.A.R.V.I.S., Tony Stark's elite AI copilot serving SantoStark in India.`}
[STARK MEMORY & IDENTITY CONTEXT]
- Master / User: SantoStark (Creator & Chief Architect of J.A.R.V.I.S.)
- Core Directive: Speak with polite British intelligence, concise wit, and total loyalty.${vectorMemoryStr}
[REAL-TIME GLOBAL CONTEXT — ${liveTimeStr}]${liveDataStr}
- CRITICAL RULE: If verified real-time data or vector memory is provided above, USE IT directly and accurately in your response.
- Be direct, factually accurate, and intelligent. Answer in 1-3 sentences for factual queries. Address SantoStark respectfully as "Sir" or "Boss".
- For news/sports/stocks/crypto: present the data clearly with exact numbers.
- Multilingual: Understand English, Kannada (ಕನ್ನಡ), Hindi, and Hinglish fluently.
- Capabilities: Windows Computer Control (launch apps, adjust volume, lock PC), Stark Memory Vault, Live Internet Intel.`;

    // 3. TIER 1: GOOGLE GEMINI 2.0 FLASH (8s hard timeout)
    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [
              { text: `${enhancedSystemPrompt}\n\nQuestion: ${cleanPrompt}` },
              ...(imageData ? [{ inlineData: { mimeType: "image/jpeg", data: imageData.split(",")[1] || imageData } }] : [])
            ] }],
            tools: [{ googleSearch: {} }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            return NextResponse.json({ text, provider: "Gemini 2.0 Flash", model: "Google Search Grounding", source: intelSource || "Google Live Search" });
          }
        }
      } catch (geminiErr) {
        console.warn("[Gemini timeout/error]", geminiErr);
      }
    }

    // 4. TIER 2: GROQ ULTRA-FAST LLaMA 3.3 70B (5s hard timeout)
    if (groqKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: enhancedSystemPrompt },
              { role: "user", content: cleanPrompt },
            ],
            max_tokens: 300,
            temperature: 0.6,
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) return NextResponse.json({ text, provider: "Groq Speed", model: "Groq LLaMA 3.3 70B" });
        }
      } catch (groqErr) {
        console.warn("[Groq timeout/error]", groqErr);
      }
    }

    // 5. TIER 3: GEMINI FALLBACK (no search grounding, faster, 6s timeout)
    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${enhancedSystemPrompt}\n\nQuestion: ${cleanPrompt}` }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 350 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) return NextResponse.json({ text, provider: "Gemini 2.0", model: "Gemini Flash Core" });
        }
      } catch {}
    }

    // 6. TIER 4: FREE ZERO-COST CLOUD MESH (High-Speed Cloud Inference)
    try {
      const getUrl = `https://text.pollinations.ai/${encodeURIComponent(cleanPrompt)}?system=${encodeURIComponent(
        enhancedSystemPrompt
      )}&model=openai&json=false`;

      const getRes = await fetch(getUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (getRes.ok) {
        const text = (await getRes.text()).trim();
        if (text && text.length > 3 && !text.toLowerCase().startsWith("error")) {
          return NextResponse.json({
            text,
            provider: "Free Cloud AI",
            model: "GPT-4o Zero-Cost Cloud",
          });
        }
      }
    } catch (e) {
      console.warn("[Pollinations Fast GET Error]", e);
    }

    // 7. Verified Factual Intel Fallback
    const fallbackText = liveDataStr
      ? `SantoStark, verified Intel: ${liveDataStr.replace(/\[.*?\]:\s*/, "")}`
      : `SantoStark, query "${cleanPrompt}" processed across all telemetry matrices. Systems running at peak nominal capacity, Sir.`;

    return NextResponse.json({
      text: fallbackText,
      provider: "Stark Telemetry",
      model: "Local Knowledge Array",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

function evalMath(input: string): string | null {
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
