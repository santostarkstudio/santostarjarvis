/**
 * STARK LEVEL 10 SECURITY & CRYPTOGRAPHIC CLEARANCE ENGINE
 * Web Crypto SHA-256 Hashing, Salt Generation, and Biometric Profile Vault.
 */

export type SecurityMode = "ANY" | "HIGH_2FA" | "PIN_ONLY";
export type ClearanceLevel = "LEVEL_10_ROOT" | "AUTHORIZED_GUEST" | "LOCKED";

export interface SecurityAuditLog {
  id: string;
  timestamp: number;
  event: string;
  method: "VOICE" | "PALM" | "PIN" | "CLAP" | "SYSTEM";
  status: "GRANTED" | "DENIED" | "ENROLLED";
  details?: string;
}

export interface StarkSecurityProfile {
  pinHash: string; // Salted SHA-256 hash
  pinSalt: string;
  voiceVector: number[] | null; // Normalized 64-element acoustic spectral vector
  voicePassphrase: string;
  palmVector: number[] | null; // Invariant 15-element geometric ratio vector
  clapSensitivity: number; // 0.5 to 2.0 (default 1.0)
  securityMode: SecurityMode;
  isLocked: boolean;
  clearanceLevel: ClearanceLevel;
  auditLogs: SecurityAuditLog[];
}

const STORAGE_KEY = "stark_security_vault_v1";

// Default Master Passcode: "STARK-01"
const DEFAULT_PIN = "STARK-01";

/**
 * Web Crypto SHA-256 Hashing Function
 */
export async function sha256Hash(text: string, salt: string = ""): Promise<string> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    // Fallback simple hash for non-crypto environments
    let hash = 0;
    const str = text + salt;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, "0");
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text + salt);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a cryptographic random salt
 */
export function generateSalt(length: number = 16): string {
  if (typeof window !== "undefined" && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).substring(2, 18);
}

class StarkSecurityEngine {
  private profile: StarkSecurityProfile;
  private listeners: Array<(profile: StarkSecurityProfile) => void> = [];

  constructor() {
    this.profile = this.loadInitialProfile();
    this.initDefaultPinIfNeeded();
  }

  private loadInitialProfile(): StarkSecurityProfile {
    if (typeof window === "undefined") {
      return this.createDefaultProfile();
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("[StarkSecurity] Failed to load profile from storage:", e);
    }

    return this.createDefaultProfile();
  }

  private createDefaultProfile(): StarkSecurityProfile {
    return {
      pinHash: "",
      pinSalt: generateSalt(),
      voiceVector: null,
      voicePassphrase: "STARK CLEARANCE LEVEL TEN",
      palmVector: null,
      clapSensitivity: 1.0,
      securityMode: "ANY",
      isLocked: false,
      clearanceLevel: "LEVEL_10_ROOT",
      auditLogs: [
        {
          id: "log_init",
          timestamp: Date.now(),
          event: "SECURITY VAULT INITIALIZED",
          method: "SYSTEM",
          status: "GRANTED",
          details: "Level 10 Root Protocol Active",
        },
      ],
    };
  }

  private async initDefaultPinIfNeeded() {
    if (!this.profile.pinHash) {
      this.profile.pinHash = await sha256Hash(DEFAULT_PIN, this.profile.pinSalt);
      this.saveProfile();
    }
  }

  private saveProfile() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      } catch (e) {
        console.error("[StarkSecurity] Error saving profile:", e);
      }
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn({ ...this.profile }));
  }

  public subscribe(callback: (profile: StarkSecurityProfile) => void): () => void {
    this.listeners.push(callback);
    callback({ ...this.profile });
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  public getProfile(): StarkSecurityProfile {
    return { ...this.profile };
  }

  /**
   * Verify Master PIN with SHA-256
   */
  public async verifyPin(enteredPin: string): Promise<boolean> {
    const cleanPin = enteredPin.trim().toUpperCase();
    const hash = await sha256Hash(cleanPin, this.profile.pinSalt);
    const isMatch = hash === this.profile.pinHash;

    this.addAuditLog(
      isMatch ? "PIN AUTHORIZATION SUCCESSFUL" : "INVALID PIN ATTEMPT",
      "PIN",
      isMatch ? "GRANTED" : "DENIED",
      isMatch ? "SHA-256 Match Verified" : "Cryptographic Hash Mismatch"
    );

    if (isMatch) {
      this.unlockSystem("PIN");
    }
    return isMatch;
  }

  /**
   * Update Master PIN
   */
  public async setMasterPin(newPin: string): Promise<string> {
    const cleanPin = newPin.trim().toUpperCase();
    const newSalt = generateSalt();
    const newHash = await sha256Hash(cleanPin, newSalt);

    this.profile.pinSalt = newSalt;
    this.profile.pinHash = newHash;
    this.saveProfile();

    this.addAuditLog(
      "MASTER PIN UPDATED",
      "PIN",
      "ENROLLED",
      `New Salted SHA-256: ${newHash.substring(0, 16)}...`
    );

    return newHash;
  }

  /**
   * Save Enrolled Voice Biometrics
   */
  public saveVoiceprint(vector: number[], passphrase?: string) {
    this.profile.voiceVector = vector;
    if (passphrase) {
      this.profile.voicePassphrase = passphrase.toUpperCase();
    }
    this.saveProfile();

    this.addAuditLog(
      "VOICEPRINT SIGNATURE ENROLLED",
      "VOICE",
      "ENROLLED",
      `64-Formant Vector Saved (Acoustic Match Active)`
    );
  }

  /**
   * Save Enrolled Optical Palm Handprint
   */
  public savePalmprint(vector: number[]) {
    this.profile.palmVector = vector;
    this.saveProfile();

    this.addAuditLog(
      "OPTICAL PALM SIGNATURE ENROLLED",
      "PALM",
      "ENROLLED",
      `15-Landmark Invariant Ratio Vector Saved`
    );
  }

  /**
   * Adjust Double-Clap Sensitivity
   */
  public setClapSensitivity(sensitivity: number) {
    this.profile.clapSensitivity = Math.max(0.4, Math.min(2.5, sensitivity));
    this.saveProfile();
  }

  /**
   * Set Security Mode (ANY, HIGH_2FA, PIN_ONLY)
   */
  public setSecurityMode(mode: SecurityMode) {
    this.profile.securityMode = mode;
    this.saveProfile();
    this.addAuditLog(
      `SECURITY MODE CHANGED TO ${mode}`,
      "SYSTEM",
      "GRANTED"
    );
  }

  /**
   * Lock System Down
   */
  public lockSystem() {
    this.profile.isLocked = true;
    this.profile.clearanceLevel = "LOCKED";
    this.saveProfile();
    this.addAuditLog("SYSTEM LOCKED DOWN", "SYSTEM", "GRANTED", "Manual / Inactivity Lock");
  }

  /**
   * Unlock System with Level 10 Clearance
   */
  public unlockSystem(method: "VOICE" | "PALM" | "PIN" | "CLAP" | "SYSTEM", details?: string) {
    this.profile.isLocked = false;
    this.profile.clearanceLevel = "LEVEL_10_ROOT";
    this.saveProfile();
    this.addAuditLog(
      "LEVEL 10 CLEARANCE GRANTED",
      method,
      "GRANTED",
      details || `Unlocked via ${method}`
    );
  }

  /**
   * Append Security Audit Log
   */
  private addAuditLog(
    event: string,
    method: "VOICE" | "PALM" | "PIN" | "CLAP" | "SYSTEM",
    status: "GRANTED" | "DENIED" | "ENROLLED",
    details?: string
  ) {
    const newLog: SecurityAuditLog = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      event,
      method,
      status,
      details,
    };

    this.profile.auditLogs = [newLog, ...this.profile.auditLogs.slice(0, 30)];
  }
}

export const starkSecurity = new StarkSecurityEngine();
