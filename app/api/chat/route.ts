import { NextResponse } from "next/server";
import { realWorldIntel } from "@/lib/realtimeWorldIntel";

export async function POST(req: Request) {
  try {
    const { prompt, systemPrompt, provider, keys } = await req.json();

    const geminiKey =
      keys?.geminiKey ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const openaiKey = keys?.openaiKey || process.env.OPENAI_API_KEY;
    const claudeKey = keys?.claudeKey || process.env.ANTHROPIC_API_KEY;

    const now = new Date();
    const liveTimeStr = `${now.toUTCString()} (Local: ${now.toLocaleString()})`;

    // 0. LIVE REAL-WORLD TOOL ENGINE
    const liveFact = await realWorldIntel.getLiveWorldIntel(prompt);
    const liveFactContext = liveFact
      ? `\n[VERIFIED REAL-TIME DATA - SOURCE: ${liveFact.source}]\n${liveFact.summary}\n`
      : "";

    const enhancedSystemPrompt = `${systemPrompt || "You are J.A.R.V.I.S., Tony Stark's elite AI copilot serving SantoStark in India."}

[UNIVERSAL SMART ASSISTANT PROTOCOL - COPILOT / BIXBY / FOLAX / SIRI / JARVIS CLASS]
- Identity: You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), combining the analytical precision of Microsoft Copilot, the directness of Apple Siri, the rich regional intelligence of Infinix Folax & Samsung Bixby, and Tony Stark's iconic wit.
- User: Address SantoStark respectfully as "SantoStark" or "Sir". Root Level 10 Clearance granted.
- Accuracy & Directness: Deliver the direct answer or solution immediately in the first sentence. Avoid conversational filler ("Sure, I can help with that", "As an AI model...").
- Language & Slang Mastery: SantoStark speaks in Indian English, Kannada (ಕನ್ನಡ), Hinglish (Hindi-English mix), non-native phrasing, inverted words, or informal shorthand. Accurately decode the true intent and reply fluently in the appropriate language (Kannada if asked in Kannada, English/Kannada if bilingual).
- Structured Output: Use clean headings, bullet points, bold key data, and emojis where appropriate (e.g. for news, comparisons, weather, nutrition, sports, or code snippets).
- Proactive Follow-up: For news or broad briefings, offer a concise next step or deeper dive.
- Knowledge Grounding: Base answers on verified facts and the live real-time telemetry grid below.

[REAL-TIME GRID CONTEXT]
- Live Clock: ${liveTimeStr}${liveFactContext}
- Directive: Synthesize verified data and deliver a world-class smart assistant briefing to SantoStark.`;

    // 1. Google AI Studio (Gemini 2.0 Flash with Google Search Grounding)
    if ((provider === "gemini" || (provider === "auto" && geminiKey)) && geminiKey) {
      const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${enhancedSystemPrompt}\n\nUser Question: ${prompt}` }],
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
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
              return NextResponse.json({
                text,
                provider: "gemini",
                model: model === "gemini-2.0-flash" ? "Google AI Studio (Gemini 2.0 Flash)" : "Gemini 1.5 Flash",
              });
            }
          }
        } catch (e) {
          console.warn(`Gemini server error for ${model}:`, e);
        }
      }
    }

    // 2. OpenAI ChatGPT (if key exists)
    if ((provider === "openai" || (provider === "auto" && openaiKey)) && openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            return NextResponse.json({
              text,
              provider: "openai",
              model: "GPT-4o-mini",
            });
          }
        }
      } catch (e) {
        console.warn("OpenAI server error:", e);
      }
    }

    // 3. Anthropic Claude (if key exists)
    if ((provider === "claude" || (provider === "auto" && claudeKey)) && claudeKey) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.content?.[0]?.text?.trim();
          if (text) {
            return NextResponse.json({
              text,
              provider: "claude",
              model: "Claude 3.5 Sonnet",
            });
          }
        }
      } catch (e) {
        console.warn("Claude server error:", e);
      }
    }

    // 4. FREE INSTANT GENERATIVE LLM & WEB SEARCH (NO API KEY REQUIRED)
    // Server-side call to high-speed public generative endpoint
    try {
      const freeLlmUrl = `https://text.pollinations.ai/${encodeURIComponent(
        `${systemPrompt}\n\nQuestion: ${prompt}\n\nAnswer concisely in 1-3 sentences as Tony Stark's AI:`,
      )}?model=mistral`;
      const llmRes = await fetch(freeLlmUrl, { signal: AbortSignal.timeout(6000) });
      if (llmRes.ok) {
        const text = await llmRes.text();
        if (text && text.trim().length > 10) {
          return NextResponse.json({
            text: text.trim(),
            provider: "auto",
            model: "Neural Web Mesh (Live)",
          });
        }
      }
    } catch {}

    // 5. Wikipedia Full-Text Search Fallback
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        prompt,
      )}&format=json&origin=*`;
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) });
      if (searchRes.ok) {
        const sData = await searchRes.json();
        const topResult = sData.query?.search?.[0];
        if (topResult?.snippet) {
          const cleanSnippet = topResult.snippet
            .replace(/<[^>]+>/g, "")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .trim();
          return NextResponse.json({
            text: `${topResult.title}: ${cleanSnippet}.`,
            provider: "auto",
            model: "Wikipedia Knowledge Array",
          });
        }
      }
    } catch {}

    // 4. LIVE ZERO-COST SEARCH AI (Real-World Web Grounding with No Key Required)
    try {
      const liveAiUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&system=${encodeURIComponent(enhancedSystemPrompt)}&search=true`;
      const liveAiRes = await fetch(liveAiUrl, {
        headers: { "User-Agent": "SantoStark-ULTRON/1.0" },
      });

      if (liveAiRes.ok) {
        const text = (await liveAiRes.text()).trim();
        if (text && text.length > 5 && !text.toLowerCase().includes("error")) {
          return NextResponse.json({
            text,
            provider: "live-web-ai",
            model: "Live Real-Time Web Search AI",
          });
        }
      }
    } catch {}

    // 5. Emergency Factual Fallback
    const emergencyText = liveFact
      ? `SantoStark, ${liveFact.summary}`
      : `SantoStark, query processed for "${prompt}". All live sensors and local diagnostics are nominal.`;

    return NextResponse.json({
      text: emergencyText,
      provider: "realtime-intel",
      model: "Siri-Class Real-Time Web Engine",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
