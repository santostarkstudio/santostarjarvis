/**
 * Supabase Cloud Security Vault & Real-Time Sync Client for ULTRON:
 * Provides enterprise cloud persistence for biometrics, conversation memory,
 * and multi-screen WebSocket synchronization with seamless offline fallback.
 */

import { StarkSecurityProfile } from "./starkSecurity";

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface ConversationRecord {
  persona: string;
  userQuery: string;
  aiResponse: string;
  providerUsed: string;
}

class SupabaseVaultClient {
  private config: SupabaseConfig = {
    supabaseUrl: "",
    supabaseAnonKey: "",
  };
  private isConnected = false;

  private sanitizeUrl(url: string): string {
    return url.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  }

  constructor() {
    if (typeof window !== "undefined") {
      this.config = {
        supabaseUrl: this.sanitizeUrl(
          localStorage.getItem("ultron_supabase_url") ||
            process.env.NEXT_PUBLIC_SUPABASE_URL ||
            "",
        ),
        supabaseAnonKey: (
          localStorage.getItem("ultron_supabase_key") ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          ""
        ).trim(),
      };
      this.checkConnection();
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.config.supabaseUrl && this.config.supabaseAnonKey);
  }

  public setConfig(url: string, key: string): void {
    this.config = {
      supabaseUrl: this.sanitizeUrl(url),
      supabaseAnonKey: key.trim(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("ultron_supabase_url", this.config.supabaseUrl);
      localStorage.setItem("ultron_supabase_key", this.config.supabaseAnonKey);
      this.checkConnection();
    }
  }

  public getConfig(): SupabaseConfig {
    return this.config;
  }

  public async checkConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      this.isConnected = false;
      return false;
    }

    try {
      const endpoint = `${this.config.supabaseUrl}/rest/v1/stark_biometric_vault?select=stark_id&limit=1`;
      const res = await fetch(endpoint, {
        headers: {
          apikey: this.config.supabaseAnonKey,
          Authorization: `Bearer ${this.config.supabaseAnonKey}`,
        },
      });
      this.isConnected = res.ok;
      return res.ok;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Syncs biometric profile up to cloud vault (Upsert)
   */
  public async syncBiometricsToCloud(profile: StarkSecurityProfile): Promise<{ success: boolean; message?: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: "Supabase URL or Key is missing" };
    }

    try {
      const endpoint = `${this.config.supabaseUrl}/rest/v1/stark_biometric_vault?on_conflict=stark_id`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.config.supabaseAnonKey,
          Authorization: `Bearer ${this.config.supabaseAnonKey}`,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          stark_id: "SantoStark",
          clearance_level: profile.clearanceLevel === "LEVEL_10_ROOT" ? 10 : (profile.clearanceLevel === "AUTHORIZED_GUEST" ? 5 : 1),
          pin_hash: profile.pinHash || "LEVEL10_SHA256_ENCRYPTED",
          palm_vector: profile.palmVector || null,
          voice_vector: profile.voiceVector || null,
          clap_sensitivity: profile.clapSensitivity || 1.0,
          is_locked: Boolean(profile.isLocked),
          last_sync: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[Supabase Vault] Upsert failed:", res.status, errorText);
        this.isConnected = false;
        return { success: false, message: `HTTP ${res.status}: ${errorText}` };
      }

      this.isConnected = true;
      return { success: true };
    } catch (e: any) {
      console.warn("[Supabase Vault] Sync error:", e);
      this.isConnected = false;
      return { success: false, message: e?.message || "Network Error" };
    }
  }

  /**
   * Saves conversation history to PostgreSQL memory
   */
  public async saveConversationRecord(rec: ConversationRecord): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const endpoint = `${this.config.supabaseUrl}/rest/v1/stark_conversation_memory`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.config.supabaseAnonKey,
          Authorization: `Bearer ${this.config.supabaseAnonKey}`,
        },
        body: JSON.stringify({
          stark_id: "SantoStark",
          role: "assistant",
          content: `User: "${rec.userQuery}" | Response: "${rec.aiResponse}"`,
          provider: rec.providerUsed || "gemini",
          persona: rec.persona || "jarvis",
          timestamp: new Date().toISOString(),
        }),
      });

      return res.ok;
    } catch (e) {
      console.warn("[Supabase Vault] Memory error:", e);
      return false;
    }
  }
}

export const supabaseVault = new SupabaseVaultClient();
