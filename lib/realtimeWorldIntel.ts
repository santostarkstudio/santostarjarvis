/**
 * ════════════════════════════════════════════════════════════════════════════════
 * SANTOSTARK J.A.R.V.I.S. — REAL-TIME GLOBAL INTERNET KNOWLEDGE ENGINE (TAVILY)
 * ════════════════════════════════════════════════════════════════════════════════
 * Uses the Tavily Search API for optimized, AI-ready search results.
 * ════════════════════════════════════════════════════════════════════════════════
 */

export interface RealWorldFact {
  type: "search";
  headline: string;
  summary: string;
  source: string;
}

export class RealWorldIntelEngine {
  /**
   * Main entry point — retrieves real-time global facts for any query using Tavily.
   */
  public async getLiveWorldIntel(query: string): Promise<RealWorldFact | null> {
    const q = query.toLowerCase().trim();

    // Check if query might need real-time data
    const needsSearch = /\b(who|what|where|when|why|how|news|weather|price|stock|crypto|score|match|latest|current|today)\b/i.test(q);

    if (!needsSearch) {
      return null;
    }

    try {
      const apiKey = process.env.TAVILY_API_KEY || process.env.NEXT_PUBLIC_TAVILY_API_KEY;
      
      if (!apiKey) {
        console.warn("[Tavily] Missing API Key. Fallback to offline mode.");
        return null; // Return null to fallback to LLM's internal knowledge
      }

      // We only request a basic search to keep it under 1-2 seconds
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: q,
          search_depth: "basic",
          include_answer: true,
          include_images: false,
          include_raw_content: false,
          max_results: 3,
        }),
        signal: AbortSignal.timeout(4000), // Max 4s wait
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[Tavily] API Error:", errorText);
        return null;
      }

      const data = await res.json();
      
      if (data.answer) {
        return {
          type: "search",
          headline: `Tavily Search: ${query}`,
          summary: data.answer,
          source: "Tavily AI Search Engine",
        };
      } else if (data.results && data.results.length > 0) {
        // Fallback to concatenating the top 3 result snippets
        const summary = data.results.map((r: any) => `- ${r.content}`).join("\n");
        return {
          type: "search",
          headline: `Tavily Search: ${query}`,
          summary: summary,
          source: "Tavily AI Search Engine",
        };
      }

    } catch (e) {
      console.warn("[Tavily] Fetch/Timeout Error:", e);
    }

    return null;
  }
}

export const realWorldIntel = new RealWorldIntelEngine();
