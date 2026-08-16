import { NextRequest, NextResponse } from "next/server";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EA6542D89C675688363F4DD8";
const EDGE_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

// In-memory zero-latency cache for frequently spoken phrases
const ttsCache = new Map<string, Buffer>();

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function cleanTextForSpeech(input: string): string {
  return input
    .replace(/[*_#`~[\]()<>]/g, " ") // remove markdown characters
    .replace(/[^\x00-\x7F]/g, "") // remove emojis
    .replace(/\s+/g, " ")
    .trim();
}

function synthesizeWithEdge(
  text: string,
  voice: string = "en-GB-RyanNeural",
  pitch: string = "+0Hz",
  rate: string = "+2%"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const connectionId = generateUUID().replace(/-/g, "");
    const requestId = generateUUID().replace(/-/g, "");
    const url = `${EDGE_URL}&ConnectionId=${connectionId}`;

    const ws = new WebSocket(url);
    const audioChunks: Buffer[] = [];
    let isCompleted = false;

    const timeout = setTimeout(() => {
      if (!isCompleted) {
        ws.close();
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks));
        } else {
          reject(new Error("Edge TTS synthesis timed out"));
        }
      }
    }, 7000);

    ws.onopen = () => {
      // 1. Send speech configuration
      const configMsg =
        `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: "false",
                  wordBoundaryEnabled: "false",
                },
                outputFormat: "audio-24khz-48kbitrate-mono-mp3",
              },
            },
          },
        });
      ws.send(configMsg);

      // 2. Escape XML and send SSML payload
      const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

      const ssmlMsg =
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` +
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-GB'>` +
        `<voice name='${voice}'>` +
        `<prosody pitch='${pitch}' rate='${rate}'>${escapedText}</prosody>` +
        `</voice></speak>`;

      ws.send(ssmlMsg);
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        if (event.data.includes("Path:turn.end")) {
          isCompleted = true;
          clearTimeout(timeout);
          ws.close();
          resolve(Buffer.concat(audioChunks));
        }
      } else if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        let arrayBuffer: ArrayBuffer;
        if (event.data instanceof Blob) {
          arrayBuffer = await event.data.arrayBuffer();
        } else {
          arrayBuffer = event.data;
        }

        const buf = Buffer.from(arrayBuffer);
        const headerEnd = buf.indexOf(Buffer.from("\r\n\r\n"));
        if (headerEnd !== -1) {
          const header = buf.subarray(0, headerEnd).toString("utf-8");
          if (header.includes("Path:audio")) {
            const audioData = buf.subarray(headerEnd + 4);
            if (audioData.length > 0) {
              audioChunks.push(audioData);
            }
          }
        }
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      if (audioChunks.length > 0) {
        resolve(Buffer.concat(audioChunks));
      } else {
        reject(err);
      }
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      if (!isCompleted && audioChunks.length > 0) {
        resolve(Buffer.concat(audioChunks));
      }
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawText = searchParams.get("text") || "Hello SantoStark. J.A.R.V.I.S. neural systems online.";
  const persona = searchParams.get("persona") || "jarvis";

  const text = cleanTextForSpeech(rawText);
  if (!text) {
    return new NextResponse("Empty text", { status: 400 });
  }

  // Check cache first for 0ms latency
  const cacheKey = `${persona}_${text}`;
  if (ttsCache.has(cacheKey)) {
    const cachedAudio = ttsCache.get(cacheKey)!;
    return new NextResponse(cachedAudio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  let voice = "en-GB-RyanNeural"; // Authentic British Paul Bettany style
  let pitch = "+0Hz";
  let rate = "+2%";

  if (persona === "friday") {
    voice = "en-IE-EmilyNeural"; // Authentic Irish FRIDAY style
    pitch = "+10Hz";
    rate = "+5%";
  } else if (persona === "ultron") {
    voice = "en-US-GuyNeural"; // Deep American Ultron
    pitch = "-22Hz";
    rate = "-4%";
  }

  try {
    const audioBuffer = await synthesizeWithEdge(text, voice, pitch, rate);

    // Cache if under 2MB
    if (audioBuffer.length < 2 * 1024 * 1024) {
      if (ttsCache.size > 200) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, audioBuffer);
    }

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    console.error("[TTS API] Edge synthesis failed:", err);
    return new NextResponse("Synthesis failed", { status: 500 });
  }
}
