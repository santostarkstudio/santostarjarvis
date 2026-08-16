import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, systemPrompt, provider, keys } = await req.json();

    const geminiKey = keys?.geminiKey || process.env.GEMINI_API_KEY;
    const openaiKey = keys?.openaiKey || process.env.OPENAI_API_KEY;
    const claudeKey = keys?.claudeKey || process.env.ANTHROPIC_API_KEY;

    const now = new Date();
    const liveTimeStr = `${now.toUTCString()} (Local: ${now.toLocaleString()})`;
    const enhancedSystemPrompt = `${systemPrompt || "You are JARVIS, Tony Stark's hyper-intelligent AI assistant serving SantoStark."}\n\n[REAL-TIME GRID CONTEXT]\n- Live Global Clock: ${liveTimeStr}\n- Live Web Access: Active via Google Search Grounding. Provide real-world, accurate, up-to-the-minute answers.`;

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

    return NextResponse.json({
      text: `Processing query: "${prompt}". Connected to live telemetry and device automation racks.`,
      provider: "auto",
      model: "Local Core",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
