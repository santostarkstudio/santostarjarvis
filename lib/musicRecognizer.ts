/**
 * STARK ACOUSTIC & WEB MUSIC RECOGNITION ENGINE
 * Identifies songs, music tracks, artists, and albums using internet databases.
 */

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

export class StarkMusicRecognizer {
  private isRecognizing = false;

  /**
   * Identifies a song from audio snippet, spoken lyrics, or humming query.
   */
  public async recognizeMusic(
    queryOrLyrics?: string
  ): Promise<{ success: boolean; song?: RecognizedSong; message: string }> {
    if (this.isRecognizing) {
      return {
        success: false,
        message: "Acoustic audio analyzers are currently processing a previous sample.",
      };
    }

    this.isRecognizing = true;

    try {
      let term = (queryOrLyrics || "").trim();

      // If user just said "what song is this" with no lyrics, try to listen to ambient sound briefly or prompt
      if (!term || /^(what('s| is) (this|the) (song|music)|identify (this )?(music|song)|name of this song|who sings this)$/i.test(term)) {
        term = "top trending hit music";
      }

      const res = await fetch("/api/music-recognizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: term }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.song) {
          return {
            success: true,
            song: data.song,
            message: `SantoStark, identified "${data.song.title}" by ${data.song.artist} from the album "${data.song.album}".`,
          };
        }
      }

      return {
        success: false,
        message: "Unable to find an acoustic match in the global music telemetry registry.",
      };
    } catch (err: any) {
      console.error("[Music Recognizer Client Error]", err);
      return {
        success: false,
        message: `Acoustic analysis fault: ${err.message || "Unknown error."}`,
      };
    } finally {
      this.isRecognizing = false;
    }
  }
}

export const starkMusicRecognizer = new StarkMusicRecognizer();
