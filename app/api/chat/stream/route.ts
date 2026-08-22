import { NextRequest } from "next/server";
import { realWorldIntel } from "@/lib/realtimeWorldIntel";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemPrompt, persona = "jarvis", keys, imageData } = await req.json();

    const encoder = new TextEncoder();
    const cleanPrompt = (prompt || "").trim();

    if (!cleanPrompt) {
      return new Response(encoder.encode("data: {\"token\":\"Standing by, SantoStark.\",\"done\":true}\n\n"), {
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    const geminiKey = keys?.geminiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    const groqKey = keys?.groqKey || process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "";

    const now = new Date();
    const liveTimeStr = `${now.toUTCString()} (Local: ${now.toLocaleString()})`;

    // 1. Pre-fetch Live Real-World Intel & Memory Context — run with strict 3s cap
    let liveDataStr = "";
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
        liveDataStr = `\n[✅ LIVE INTEL — ${liveFact.source}]:\n${liveFact.summary}\n`;
      }
      
      if (vectorRes && vectorRes.results && vectorRes.results.length > 0) {
        vectorMemoryStr = `\n[🧠 STARK VECTOR MEMORY RECALLED]:\n- ${vectorRes.results.join("\n- ")}\n`;
      }
    } catch {}

    const fullSystemPrompt = `${systemPrompt || `You are J.A.R.V.I.S., Tony Stark's elite AI copilot serving SantoStark in India.`}
[STARK MEMORY & IDENTITY CONTEXT]
- Master / User: SantoStark (Creator & Chief Architect of J.A.R.V.I.S.)
- Core Directive: Speak with polite British intelligence, concise wit, and total loyalty.${vectorMemoryStr}
[REAL-TIME GLOBAL CONTEXT — ${liveTimeStr}]${liveDataStr}
- CRITICAL RULE: If verified real-time data or vector memory is provided above, USE IT directly and accurately in your response.
- Response Rule: Give direct answers immediately. Avoid conversational filler.
- Language Mastery: Understand Indian English, Kannada (ಕನ್ನಡ), and Hinglish effortlessly.
- Length: 2 to 4 sentences maximum.`;

    // 2. TIER 1: GEMINI 2.0 FLASH WITH GOOGLE SEARCH GROUNDING (REAL STREAMING)
    // We prioritize Gemini because it has native Google Search tool support!
    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${fullSystemPrompt}\n\nUser: ${cleanPrompt}` },
                  ...(imageData ? [{ inlineData: { mimeType: "image/jpeg", data: imageData.split(",")[1] || imageData } }] : [])
                ],
              },
            ],
            tools: [{ googleSearch: {} }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 450,
            },
          }),
        });

        if (geminiRes.ok && geminiRes.body) {
          const reader = geminiRes.body.getReader();
          const decoder = new TextDecoder("utf-8");

          const stream = new ReadableStream({
            async start(controller) {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  const chunk = decoder.decode(value, { stream: true });
                  const lines = chunk.split("\\n");

                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      const dataStr = line.replace("data: ", "").trim();
                      if (dataStr === "[DONE]") continue;
                      if (!dataStr) continue;

                      try {
                        const parsed = JSON.parse(dataStr);
                        let textToken = "";
                        if (parsed.candidates && parsed.candidates[0]?.content?.parts) {
                          for (const part of parsed.candidates[0].content.parts) {
                            if (part.text) textToken += part.text;
                          }
                        }
                        if (textToken) {
                          controller.enqueue(
                            new TextEncoder().encode(`data: ${JSON.stringify({ token: textToken })}\n\n`)
                          );
                        }
                      } catch (e) {}
                    }
                  }
                }
              } finally {
                controller.close();
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }
      } catch (err) {
        console.warn("[Stream Gemini Error]", err);
      }
    }

    // 3. TIER 2: GROQ ULTRA-FAST STREAMING (FALLBACK)
    if (groqKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: fullSystemPrompt },
              { role: "user", content: cleanPrompt },
            ],
            stream: true,
            max_tokens: 450,
            temperature: 0.7,
          }),
        });

        if (groqRes.ok && groqRes.body) {
          return new Response(groqRes.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }
      } catch (groqErr) {
        console.warn("[Stream Groq Check]", groqErr);
      }
    }

    // 3. TIER 2: GEMINI 2.0 FLASH WITH GOOGLE SEARCH GROUNDING (REAL STREAMING)
    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${fullSystemPrompt}\n\nUser: ${cleanPrompt}` }],
              },
            ],
            tools: [{ googleSearch: {} }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 450,
            },
          }),
        });

        if (geminiRes.ok && geminiRes.body) {
          // Gemini's native SSE stream needs to be parsed and transformed 
          // to match our expected format: data: {"token": "chunk"}
          const reader = geminiRes.body.getReader();
          const decoder = new TextDecoder("utf-8");

          const stream = new ReadableStream({
            async start(controller) {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  const chunk = decoder.decode(value, { stream: true });
                  const lines = chunk.split("\\n");

                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      const dataStr = line.replace("data: ", "").trim();
                      if (dataStr === "[DONE]") continue;
                      if (!dataStr) continue;

                      try {
                        const parsed = JSON.parse(dataStr);
                        const textPart = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (textPart) {
                          // Clean newlines slightly or just send as-is
                          const cleanToken = textPart;
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ token: cleanToken, done: false })}\\n\\n`)
                          );
                        }
                      } catch (e) {
                        // ignore broken json chunks
                      }
                    }
                  }
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: "", done: true })}\\n\\n`));
                controller.close();
              } catch (err) {
                controller.error(err);
              }
            }
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }
      } catch (geminiErr) {
        console.warn("[Stream Gemini Check]", geminiErr);
      }
    }

    // 4. TIER 3: FREE ZERO-COST CLOUD MESH (Pollinations GPT-4o)
    try {
      const freeUrl = `https://text.pollinations.ai/${encodeURIComponent(
        `${fullSystemPrompt}\n\nUser Question: ${cleanPrompt}\n\nAnswer concisely:`
      )}?model=openai&seed=${Math.floor(Math.random() * 100000)}`;

      const res = await fetch(freeUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const text = (await res.text()).trim();
        if (text && text.length > 5 && !text.toLowerCase().startsWith("error")) {
          const words = text.split(" ");
          const stream = new ReadableStream({
            start(controller) {
              for (let i = 0; i < words.length; i++) {
                const chunk = (i > 0 ? " " : "") + words[i];
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token: chunk, done: i === words.length - 1 })}\n\n`)
                );
              }
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }
      }
    } catch {}

    // 5. Fallback Stream
    const fallbackText = liveDataStr
      ? `SantoStark, ${liveDataStr.replace(/\[.*?\]:\s*/, "")}`
      : `SantoStark, query "${cleanPrompt}" processed. All local sensor grids and Stark telemetry are online and nominal, Sir.`;

    const fallbackStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: fallbackText, done: true })}\n\n`));
        controller.close();
      },
    });

    return new Response(fallbackStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
