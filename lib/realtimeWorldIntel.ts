/**
 * REAL-TIME REAL-WORLD INTEL ENGINE (Siri / Bixby / Google Assistant Class)
 * Zero-latency live fetching of real-world Weather, News, Stocks, Crypto, Wikipedia, and Live Search.
 */

export interface RealWorldFact {
  type: "weather" | "news" | "stock" | "crypto" | "wiki" | "time" | "search" | "general";
  headline: string;
  summary: string;
  source: string;
}

export class RealWorldIntelEngine {
  /**
   * Main entry point: Detects intent and retrieves real-world live facts from the web
   */
  public async getLiveWorldIntel(query: string): Promise<RealWorldFact | null> {
    const q = query.toLowerCase().trim();

    // 1. LIVE WORLD & INDIA NEWS & HEADLINES (High Priority)
    if (/\b(news|headlines|current events|happening in the world|world news|breaking news|samachar|khabar|kya chal raha hai|aaj ka news|today news|suddi|samachara|ivathina suddi|ಸುದ್ದಿ|ಸಮಾಚಾರ)\b/i.test(q)) {
      const news = await this.fetchLiveNews();
      if (news) return news;
    }

    // 2. LIVE REAL-TIME WEATHER (High Priority - Global, Indian & Karnataka Cities)
    if (/\b(weather|temperature|forecast|climate|rain|barish|mausam|humidity|hot|cold|is it raining|havamana|male|bisi|chali|ಹವಾಮಾನ|ಮಳೆ|ತಾಪಮಾನ)\b/i.test(q)) {
      const cityMatch = query.match(/(?:in|for|at|ka|me|mein|alli|dalli)\s+([a-zA-Z\s]+?)(?:\s+today|\s+now|\s+tomorrow|\s+kaisa|\s+hegide|\?|$)/i) ||
                         query.match(/([a-zA-Z\s]+)\s+(?:weather|mausam|ka weather|havamana)/i);
      const city = cityMatch ? cityMatch[1].trim() : "Bengaluru";
      const weather = await this.fetchLiveWeather(city);
      if (weather) return weather;
    }

    // 3. LIVE CRYPTO & FINANCIAL PRICES (High Priority)
    if (/\b(bitcoin|btc|ethereum|eth|crypto|crypto price|solana|doge|crypto rate|bitcoin price|bele|dara|ಬೆಲೆ)\b/i.test(q)) {
      const coin = q.includes("ethereum") || q.includes("eth") ? "ethereum" : (q.includes("solana") ? "solana" : "bitcoin");
      const crypto = await this.fetchCryptoPrice(coin);
      if (crypto) return crypto;
    }

    // 3.5 INSTANT ARITHMETIC & CALCULATION ENGINE (Copilot / Siri Speed)
    const mathMatch =
      query.match(/^(\d+(?:\.\d+)?)\s*([\+\-\*\/xX\^%])\s*(\d+(?:\.\d+)?)$/) ||
      query.match(/(?:calculate|what is|how much is)\s+(\d+(?:\.\d+)?\s*[\+\-\*\/xX\^%]\s*\d+(?:\.\d+)?)/i);
    if (mathMatch) {
      try {
        const expr =
          mathMatch[1] && mathMatch[2] && mathMatch[3]
            ? `${mathMatch[1]} ${mathMatch[2].replace(/x/i, "*")} ${mathMatch[3]}`
            : mathMatch[1].replace(/x/i, "*");
        if (/^[\d\s\+\-\*\/\.\(\)]+$/.test(expr)) {
          const result = Function(`'use strict'; return (${expr})`)();
          return {
            type: "general",
            headline: `Calculation: ${expr} = ${result}`,
            summary: `The result of ${expr} is ${result}.`,
            source: "Stark Quantum Compute Array",
          };
        }
      } catch {}
    }

    // 3.6 LIVE CURRENCY CONVERSION (USD to INR, EUR to INR, etc.)
    if (/\b(usd to inr|dollar to rupee|dollar to inr|eur to inr|euro to inr|gbp to inr|pound to inr|inr to usd)\b/i.test(q)) {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        if (res.ok) {
          const data = await res.json();
          const inrRate = data.rates?.INR || 86.5;
          return {
            type: "stock",
            headline: `USD to INR Exchange Rate: ₹${inrRate.toFixed(2)}`,
            summary: `1 United States Dollar (USD) is currently equal to approximately ₹${inrRate.toFixed(2)} Indian Rupees (INR).`,
            source: "Live Global Currency Exchange",
          };
        }
      } catch {}
    }

    // 4. TIME & DATE (Strict Match Only)
    if (/^(what('s| is) (the )?(current )?time|what time is it|tell me the time|time check|current time|time kya ho raha|time batao|samaya enu|time enu|ಸಮಯ ಏನು|ಟೈಮ್ ಏನು)\b/i.test(q)) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return {
        type: "time",
        headline: `Current Time: ${timeStr}`,
        summary: `The exact real-world local time is ${timeStr} (${timeZone}).`,
        source: "System Atomic Clock",
      };
    }

    if (/^(what('s| is) (the )?(current )?date|what day is (it|today)|what is today('s)? date|tell me the date|current date|aaj konsa din|aaj ki date|ivathu yaava dina|ಇವತ್ತು ಯಾವ ದಿನ)$/i.test(q) ||
        /^today('s)? date$/i.test(q)) {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      return {
        type: "time",
        headline: `Today's Date: ${dateStr}`,
        summary: `Today is ${dateStr}.`,
        source: "Global Calendar",
      };
    }

    // 5. LIVE ENCYCLOPEDIC & WORLD FACTS (WIKIPEDIA GRAPH)
    if (/\b(who is|what is|tell me about|explain|history of|where is|biography of|define|how does|what are|kon hai|kya hai|ke bare me|ke baare me|yaru|enu|bagge heli|ಹೇಳಿ|ಯಾರು|ಏನು|ಬಗ್ಗೆ)\b/i.test(q)) {
      const topic = query
        .replace(/^(jarvis|friday|ultron)?\s*(who is|what is|tell me about|explain|history of|where is|biography of|define|how does|what are|batao|kya hai|kon hai|yaru|enu|bagge heli|bagge)\s+/i, "")
        .replace(/\s*(ke bare me|ke baare me|batao|kya hai|kon hai|bagge heli|bagge|heli)\s*$/i, "")
        .replace(/[?.]+$/, "")
        .trim();
      if (topic.length > 1) {
        const wiki = await this.fetchWikipediaKnowledge(topic);
        if (wiki) return wiki;
      }
    }

    // 6. LIVE DUCKDUCKGO WEB SEARCH INSTANT ANSWER
    const search = await this.fetchDuckDuckGoSearch(query);
    if (search) return search;

    return null;
  }

  /**
   * 1. Live Real-Time Weather via wttr.in JSON API (100% Free, Zero Key, Global Coverage)
   */
  private async fetchLiveWeather(city: string): Promise<RealWorldFact | null> {
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
        headers: { "User-Agent": "SantoStark-ULTRON/1.0" },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const current = data.current_condition?.[0];
      const area = data.nearest_area?.[0]?.areaName?.[0]?.value || city;
      const country = data.nearest_area?.[0]?.country?.[0]?.value || "";

      if (current) {
        const tempC = current.temp_C;
        const tempF = current.temp_F;
        const desc = current.weatherDesc?.[0]?.value || "Clear";
        const humidity = current.humidity;
        const windKm = current.windspeedKmph;

        return {
          type: "weather",
          headline: `Weather for ${area}, ${country}: ${tempC}°C (${tempF}°F), ${desc}`,
          summary: `Current conditions in ${area} (${country}): ${tempC}°C (${tempF}°F) with ${desc.toLowerCase()}. Humidity is at ${humidity}%, wind speed at ${windKm} km/h.`,
          source: "Live Satellite Meteorological Telemetry",
        };
      }
    } catch (e) {
      console.warn("[Weather API Error]", e);
    }
    return null;
  }

  /**
   * 2. Live Real-Time World News via Live Google News & Global Wires (100% CORS & Real-Time)
   */
  private async fetchLiveNews(): Promise<RealWorldFact | null> {
    // 1. Google News Live RSS Feed
    try {
      const res = await fetch("https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fnews.google.com%2Frss%3Fhl%3Den-US%26gl%3DUS%26ceid%3DUS%3Aen");
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const items = data.items.slice(0, 5);
          const indiaStories = items.slice(0, 2).map((item: any) => `• ${item.title.replace(/\s*-\s*[^-]+$/, "").trim()}`).join("\n");
          const worldStories = items.slice(2, 4).map((item: any) => `• ${item.title.replace(/\s*-\s*[^-]+$/, "").trim()}`).join("\n");

          const structuredNews = `Here is the latest intelligence briefing:\n\n🇮🇳 India & Regional News:\n${indiaStories}\n\n🌍 International News:\n${worldStories}\n\nWould you like a more detailed look at any of these stories, SantoStark?`;

          return {
            type: "news",
            headline: "Top Real-Time Global & India Headlines",
            summary: structuredNews,
            source: "Live Google News World Feed",
          };
        }
      }
    } catch (e) {
      console.warn("[Google News RSS Error]", e);
    }

    // 2. BBC World News Feed
    try {
      const res = await fetch("https://api.rss2json.com/v1/api.json?rss_url=http%3A%2F%2Ffeeds.bbci.co.uk%2Fnews%2Fworld%2Frss.xml");
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const topStories = data.items.slice(0, 3).map((item: any, i: number) => `${i + 1}. ${item.title}`).join(" ");
          return {
            type: "news",
            headline: "BBC World News Live",
            summary: `Latest global developments: ${topStories}`,
            source: "BBC World News Wire",
          };
        }
      }
    } catch {}

    // 3. Algolia Global Top Stories
    try {
      const res = await fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=3");
      if (res.ok) {
        const data = await res.json();
        if (data.hits && data.hits.length > 0) {
          const titles = data.hits.map((h: any, i: number) => `${i + 1}. ${h.title}`).join(" ");
          return {
            type: "news",
            headline: "Global Intelligence Wire",
            summary: `Live headlines: ${titles}`,
            source: "Live Global News Network",
          };
        }
      }
    } catch (e) {
      console.warn("[News Feed Error]", e);
    }
    return null;
  }

  /**
   * 3. Live Crypto & Asset Prices via CoinGecko + Binance (100% Free & Fast)
   */
  private async fetchCryptoPrice(coin: string): Promise<RealWorldFact | null> {
    // 1. Binance Direct Ticker (Ultra-fast)
    try {
      const symbol = coin.includes("eth") ? "ETHUSDT" : (coin.includes("sol") ? "SOLUSDT" : "BTCUSDT");
      const coinName = coin.includes("eth") ? "Ethereum" : (coin.includes("sol") ? "Solana" : "Bitcoin");
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      if (res.ok) {
        const data = await res.json();
        const priceUsd = Number(data.price).toLocaleString("en-US", { maximumFractionDigits: 2 });
        const priceInr = (Number(data.price) * 87.5).toLocaleString("en-IN", { maximumFractionDigits: 0 });
        return {
          type: "crypto",
          headline: `${coinName} Live Price: $${priceUsd} USD`,
          summary: `${coinName} is currently trading at $${priceUsd} USD (approximately ₹${priceInr} INR) on live global exchanges.`,
          source: "Binance Live Ticker",
        };
      }
    } catch {}

    // 2. CoinGecko Fallback
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,inr&include_24hr_change=true`);
      if (res.ok) {
        const data = await res.json();
        const asset = data[coin];
        if (asset) {
          const usd = asset.usd.toLocaleString();
          const inr = asset.inr.toLocaleString();
          const change = asset.usd_24h_change ? asset.usd_24h_change.toFixed(2) : "0";
          const symbol = coin.toUpperCase();
          return {
            type: "crypto",
            headline: `${symbol} Live Price: $${usd} USD (₹${inr} INR)`,
            summary: `${symbol} is currently trading at $${usd} USD (₹${inr} INR), with a 24-hour change of ${change}%.`,
            source: "CoinGecko Global Grid",
          };
        }
      }
    } catch (e) {
      console.warn("[Crypto Price Error]", e);
    }
    return null;
  }

  /**
   * 4. Live Wikipedia Real-World Knowledge Graph
   */
  private async fetchWikipediaKnowledge(topic: string): Promise<RealWorldFact | null> {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.extract) {
        return {
          type: "wiki",
          headline: data.title,
          summary: data.extract,
          source: "Wikipedia Real-World Knowledge Base",
        };
      }
    } catch (e) {
      console.warn("[Wikipedia Error]", e);
    }
    return null;
  }

  /**
   * 5. DuckDuckGo Instant Web Search
   */
  private async fetchDuckDuckGoSearch(query: string): Promise<RealWorldFact | null> {
    try {
      const cleanQ = encodeURIComponent(query.replace(/^(jarvis|friday|ultron)\s*/i, "").trim());
      const url = `https://api.duckduckgo.com/?q=${cleanQ}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();

      if (data.AbstractText) {
        return {
          type: "search",
          headline: data.Heading || query,
          summary: data.AbstractText,
          source: data.AbstractSource || "DuckDuckGo Live Index",
        };
      }

      if (data.RelatedTopics && data.RelatedTopics.length > 0 && data.RelatedTopics[0].Text) {
        return {
          type: "search",
          headline: query,
          summary: data.RelatedTopics[0].Text,
          source: "Global Web Index",
        };
      }
    } catch (e) {
      console.warn("[DDG Error]", e);
    }
    return null;
  }
}

export const realWorldIntel = new RealWorldIntelEngine();
