export type ThemeId = "amber" | "arc" | "ultron" | "matrix" | "quantum";

export interface ThemeColors {
  id: ThemeId;
  name: string;
  codename: string;
  // 3D Three.js numeric hex colors
  bright: number;
  mid: number;
  dim: number;
  faint: number;
  hot: number;
  // CSS hex / rgba strings
  primaryHex: string;
  secondaryHex: string;
  glowRgba: string;
  bgTintRgba: string;
  // Shader chromatic aberration tint vector [R, G, B]
  chromaticTint: [number, number, number];
  bloomStrength: number;
}

export const THEMES: Record<ThemeId, ThemeColors> = {
  amber: {
    id: "amber",
    name: "Mark VII",
    codename: "JARVIS GOLD",
    bright: 0xffaa30,
    mid: 0xdd7700,
    dim: 0x884400,
    faint: 0x553300,
    hot: 0xffcc66,
    primaryHex: "#ffaa30",
    secondaryHex: "#ff6600",
    glowRgba: "rgba(255, 170, 48, 0.4)",
    bgTintRgba: "rgba(25, 12, 0, 0.75)",
    chromaticTint: [1.15, 0.85, 0.55],
    bloomStrength: 1.8,
  },
  arc: {
    id: "arc",
    name: "Arc Reactor",
    codename: "STARK CYAN",
    bright: 0x00e5ff,
    mid: 0x0088ff,
    dim: 0x0044aa,
    faint: 0x002255,
    hot: 0x88ffff,
    primaryHex: "#00e5ff",
    secondaryHex: "#0077ff",
    glowRgba: "rgba(0, 229, 255, 0.4)",
    bgTintRgba: "rgba(0, 16, 28, 0.75)",
    chromaticTint: [0.6, 0.95, 1.25],
    bloomStrength: 2.0,
  },
  ultron: {
    id: "ultron",
    name: "Ultron Prime",
    codename: "CRIMSON PROTOCOL",
    bright: 0xff2244,
    mid: 0xcc1122,
    dim: 0x770011,
    faint: 0x440008,
    hot: 0xff7788,
    primaryHex: "#ff2244",
    secondaryHex: "#cc0022",
    glowRgba: "rgba(255, 34, 68, 0.4)",
    bgTintRgba: "rgba(28, 0, 6, 0.75)",
    chromaticTint: [1.3, 0.6, 0.7],
    bloomStrength: 2.2,
  },
  matrix: {
    id: "matrix",
    name: "Cyber Matrix",
    codename: "NEON GRID",
    bright: 0x00ff66,
    mid: 0x00aa33,
    dim: 0x005518,
    faint: 0x002a0a,
    hot: 0x88ffaa,
    primaryHex: "#00ff66",
    secondaryHex: "#00cc44",
    glowRgba: "rgba(0, 255, 102, 0.4)",
    bgTintRgba: "rgba(0, 24, 8, 0.75)",
    chromaticTint: [0.65, 1.25, 0.75],
    bloomStrength: 1.9,
  },
  quantum: {
    id: "quantum",
    name: "Quantum",
    codename: "AMETHYST VOID",
    bright: 0xc44dff,
    mid: 0x8811dd,
    dim: 0x440077,
    faint: 0x240040,
    hot: 0xe6a6ff,
    primaryHex: "#c44dff",
    secondaryHex: "#9900ff",
    glowRgba: "rgba(196, 77, 255, 0.4)",
    bgTintRgba: "rgba(20, 0, 28, 0.75)",
    chromaticTint: [1.1, 0.7, 1.3],
    bloomStrength: 2.1,
  },
};

export function applyThemeCss(themeId: ThemeId): void {
  const t = THEMES[themeId] || THEMES.amber;
  const root = document.documentElement;
  root.style.setProperty("--theme-primary", t.primaryHex);
  root.style.setProperty("--theme-secondary", t.secondaryHex);
  root.style.setProperty("--theme-glow", t.glowRgba);
  root.style.setProperty("--theme-bg", t.bgTintRgba);
  root.style.setProperty(
    "--theme-primary-rgb",
    hexToRgbString(t.primaryHex),
  );
}

function hexToRgbString(hex: string): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}
