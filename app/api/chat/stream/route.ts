import { NextRequest } from "next/server";

export const runtime = "edge";

interface StreamMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemPrompt, provider = "auto", keys } = await req.json();

    const geminiKey = keys?.geminiKey || process.env.GEMINI_API_KEY;
    const openaiKey = keys?.openaiKey || process.env.OPENAI_API_KEY;
    const claudeKey = keys?.claudeKey || process.env.ANTHROPIC_API_KEY;
    const groqKey = keys?.groqKey || process.env.GROQ_API_KEY;

    const encoder = new TextEncoder();

    // 1. GROQ ULTRA-FAST STREAMING (800+ tokens/sec, 100% Free Tier)
    if ((provider === "groq" || (provider === "auto" && groqKey)) && groqKey) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          stream: true,
          max_tokens: 450,
          temperature: 0.7,
        }),
      });

      if (response.ok && response.body) {
        return new Response(createSSEStream(response.body, "groq"), {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }
    }

    // 2. GOOGLE GEMINI 2.0 / 1.5 FLASH STREAMING (Free Tier)
    if ((provider === "gemini" || (provider === "auto" && geminiKey)) && geminiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 450,
          },
        }),
      });

      if (response.ok && response.body) {
        return new Response(createGeminiSSEStream(response.body), {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }
    }

    // 3. OPENAI CHATGPT STREAMING (gpt-4o-mini)
    if ((provider === "openai" || (provider === "auto" && openaiKey)) && openaiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          stream: true,
          max_tokens: 350,
          temperature: 0.7,
        }),
      });

      if (response.ok && response.body) {
        return new Response(createSSEStream(response.body, "openai"), {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }
    }

    // 4. AUTO-FREE FALLBACK STREAM
    const fallbackText = `SantoStark, all local diagnostics are nominal. Arc Reactor output is at 98.4% efficiency. Connected device telemetry standing by.`;
    const readable = new ReadableStream({
      async start(controller) {
        const words = fallbackText.split(" ");
        for (const word of words) {
          const payload = `data: ${JSON.stringify({ token: word + " ", done: false })}\n\n`;
          controller.enqueue(encoder.encode(payload));
          await new Promise((r) => setTimeout(r, 25));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: "", done: true })}\n\n`));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("[Stream API Error]", err);
    return new Response(`data: ${JSON.stringify({ error: err.message, done: true })}\n\n`, {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}

/**
 * Standard OpenAI / Groq SSE parser & reformatter
 */
function createSSEStream(rawBody: ReadableStream<Uint8Array>, source: string): ReadableStream<Uint8Array> {
  const reader = rawBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: "", done: true, provider: source })}\n\n`));
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: "", done: true, provider: source })}\n\n`));
            controller.close();
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const token = parsed.choices?.[0]?.delta?.content || "";
            if (token) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token, done: false, provider: source })}\n\n`));
            }
          } catch {}
        }
      }
    },
  });
}

/**
 * Gemini SSE parser & reformatter
 */
function createGeminiSSEStream(rawBody: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = rawBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: "", done: true, provider: "gemini" })}\n\n`));
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();

          try {
            const parsed = JSON.parse(dataStr);
            const token = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (token) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token, done: false, provider: "gemini" })}\n\n`));
            }
          } catch {}
        }
      }
    },
  });
}
