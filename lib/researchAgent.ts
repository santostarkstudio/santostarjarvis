import { spatialWorkspace } from "./spatialWorkspace";

export interface ResearchDossier {
  topic: string;
  executiveSummary: string;
  keyFindings: string[];
  metrics: { label: string; value: string; change?: string }[];
  strategicInsights: string[];
  sources: string[];
  timestamp: string;
}

export class StarkResearchAgent {
  private isBusy = false;

  public async compileDossier(
    topic: string
  ): Promise<{ success: boolean; dossier?: ResearchDossier; message: string }> {
    if (this.isBusy) {
      return {
        success: false,
        message: "Autonomous research agent is currently compiling a previous dossier.",
      };
    }

    this.isBusy = true;

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.dossier) {
          const d: ResearchDossier = data.dossier;

          // Format clean markdown/text content for spatial document card
          const formattedContent = `═══════════════════════════════════════════
STARK INTELLIGENCE DOSSIER // ${d.topic.toUpperCase()}
COMPILED AT: ${d.timestamp}
═══════════════════════════════════════════

EXECUTIVE SUMMARY:
${d.executiveSummary}

KEY FINDINGS & DATA:
${d.keyFindings.map((f, i) => `[${i + 1}] ${f}`).join("\n")}

METRICS & TELEMETRY:
${d.metrics.map((m) => `• ${m.label}: ${m.value} ${m.change ? `(${m.change})` : ""}`).join("\n")}

STRATEGIC INSIGHTS:
${d.strategicInsights.map((s, i) => `→ ${s}`).join("\n")}

VERIFIED SOURCES:
${d.sources.join(" | ")}
═══════════════════════════════════════════`;

          // Deploy holographic intelligence card to workspace
          spatialWorkspace.addCard({
            title: `DOSSIER // ${d.topic.toUpperCase().slice(0, 22)}`,
            subtitle: `INTEL BRIEFING // ${d.timestamp}`,
            category: "document",
            textContent: formattedContent,
            statusTag: "VERIFIED_INTEL",
            telemetryValues: d.metrics.map((m) => ({ label: m.label, value: m.value })),
          });

          return {
            success: true,
            dossier: d,
            message: `SantoStark, autonomous research dossier on '${d.topic}' has been compiled and deployed to your spatial workspace.`,
          };
        }
      }

      return {
        success: false,
        message: `Failed to compile research intelligence for '${topic}'.`,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Research agent error: ${e.message || "Network fault"}`,
      };
    } finally {
      this.isBusy = false;
    }
  }
}

export const starkResearchAgent = new StarkResearchAgent();
