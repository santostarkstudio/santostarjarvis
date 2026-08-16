import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export interface RecognizedSong {
  title: string;
  artist: string;
  album: string;
  releaseDate?: string;
  genre?: string;
  artwork?: string;
  previewUrl?: string;
  youtubeQuery: string;
  summary: string;
}

export async function POST(req: NextRequest) {
  try {
    const { query, lyrics, audioBase64 } = await req.json();

    const searchTerm = (query || lyrics || "").trim();

    // 1. First search iTunes Search API (100% Free, Global, High-Res Artworks & Previews)
    if (searchTerm) {
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=5`;
        const res = await fetch(itunesUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const top = data.results[0];
            const result: RecognizedSong = {
              title: top.trackName,
              artist: top.artistName,
              album: top.collectionName || "Single",
              releaseDate: top.releaseDate ? new Date(top.releaseDate).getFullYear().toString() : "Recent",
              genre: top.primaryGenreName || "Music",
              artwork: top.artworkUrl100 ? top.artworkUrl100.replace("100x100bb", "600x600bb") : undefined,
              previewUrl: top.previewUrl,
              youtubeQuery: `${top.trackName} ${top.artistName}`,
              summary: `Identified track "${top.trackName}" by ${top.artistName} from the album "${top.collectionName || 'Single'}" (${top.primaryGenreName || 'Music'}).`,
            };

            return NextResponse.json({ success: true, song: result });
          }
        }
      } catch (e) {
        console.warn("[iTunes Search Warning]", e);
      }

      // 2. Deezer API Fallback (Free global music catalog)
      try {
        const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(searchTerm)}&limit=5`;
        const res = await fetch(deezerUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const top = data.data[0];
            const result: RecognizedSong = {
              title: top.title,
              artist: top.artist?.name || "Unknown Artist",
              album: top.album?.title || "Single",
              artwork: top.album?.cover_big || top.album?.cover_medium,
              previewUrl: top.preview,
              youtubeQuery: `${top.title} ${top.artist?.name}`,
              summary: `Identified track "${top.title}" by ${top.artist?.name || 'Unknown Artist'}.`,
            };

            return NextResponse.json({ success: true, song: result });
          }
        }
      } catch (e) {
        console.warn("[Deezer Search Warning]", e);
      }
    }

    // 3. AI Lyric & Music Identification Search via Gemini / Web Search
    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    if (geminiKey && searchTerm) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Identify the song/music from this query or lyric snippet: "${searchTerm}".\n\nReturn a JSON object with: { "title": "...", "artist": "...", "album": "...", "genre": "...", "year": "..." }`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const parsed = JSON.parse(geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
          if (parsed.title) {
            const result: RecognizedSong = {
              title: parsed.title,
              artist: parsed.artist || "Unknown Artist",
              album: parsed.album || "Single",
              releaseDate: parsed.year,
              genre: parsed.genre || "Music",
              youtubeQuery: `${parsed.title} ${parsed.artist || ""}`,
              summary: `Identified song "${parsed.title}" by ${parsed.artist || 'Unknown Artist'}${parsed.album ? ` from "${parsed.album}"` : ''}.`,
            };

            return NextResponse.json({ success: true, song: result });
          }
        }
      } catch (e) {
        console.warn("[Gemini Music Analysis Warning]", e);
      }
    }

    return NextResponse.json({
      success: false,
      error: "Unable to find a matching track in the global music registry.",
    });
  } catch (err: any) {
    console.error("[Music Recognizer Error]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
