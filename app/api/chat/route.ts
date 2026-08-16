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

    const enhancedSystemPrompt = `${systemPrompt || "You are JARVIS, Tony Stark's hyper-intelligent AI assistant serving SantoStark in India."}\n\n[FOLAX & STARK SMART ASSISTANT PROTOCOL]\n- SantoStark may speak in Indian English, Kannada (ಕನ್ನಡ), Hinglish (Hindi-English mix), non-native sentence structure, colloquial phrases, or informal/imperfect grammar.\n- ALWAYS accurately deduce the underlying intent and true meaning of what SantoStark asks, regardless of inverted words, phonetic pronunciation, or regional slang.\n- Present structured, informative, and organized answers with clean headers, bullet points, and emojis when appropriate (e.g. for news, comparisons, weather, health, or sports).\n- For news queries: Present categorized highlights (🇮🇳 India-Focused News, 🌍 International News, ✨ Other Highlights) and conclude with a proactive follow-up (\"Would you like a more detailed look at any of these stories, SantoStark?\").\n- If SantoStark asks in Kannada, answer in fluent Kannada (or bilingual English/Kannada) as Tony Stark's loyal AI.\n- Keep answers articulate, helpful, and natural (1-4 concise paragraphs/bullets).\n\n[REAL-TIME GRID CONTEXT]\n- Live Global Clock: ${liveTimeStr}${liveFactContext}\n- Directive: Use the verified real-time data above to answer SantoStark accurately like Siri/Folax/Bixby/JARVIS.`;

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
