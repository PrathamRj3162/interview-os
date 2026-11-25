/** Mirror of the colour tokens in globals.css, used by the /design page and the contrast test. */
export const THEMES = {
  neon: {
    bg: "#0b0a12", surface: "#13121c", "surface-2": "#1b1a27", "surface-3": "#242233", border: "#2a2838",
    text: "#eceaf4", muted: "#9a97ad", primary: "#ffd43b", "primary-fg": "#14110a", accent: "#a78bfa",
    "glow-pink": "#ff4fd8", "glow-cyan": "#3ddcff", success: "#34d399", warning: "#fb923c", danger: "#f87171", info: "#60a5fa",
  },
  contrast: {
    bg: "#000000", surface: "#0a0a0a", "surface-2": "#141414", "surface-3": "#1f1f1f", border: "#5a5a5a",
    text: "#ffffff", muted: "#d4d4d4", primary: "#ffe066", "primary-fg": "#000000", accent: "#c4b5fd",
    "glow-pink": "#ff4fd8", "glow-cyan": "#3ddcff", success: "#6ee7b7", warning: "#fdba74", danger: "#fca5a5", info: "#93c5fd",
  },
} as const;
export type ThemeId = keyof typeof THEMES;
export const THEME_LABELS: Record<ThemeId, string> = { neon: "Neon (default)", contrast: "High contrast" };

/** Text/background pairs the UI actually uses. Every pair must meet WCAG AA (4.5:1). */
export const TEXT_PAIRS: [fg: string, bg: string][] = [
  ["text", "bg"], ["text", "surface"], ["text", "surface-2"], ["muted", "bg"], ["muted", "surface"], ["muted", "surface-2"],
  ["accent", "bg"], ["accent", "surface"], ["primary-fg", "primary"],
  ["success", "surface"], ["warning", "surface"], ["danger", "surface"], ["info", "surface"],
];

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const SPACING = [4, 8, 12, 16, 24, 32, 48, 64];
export const RADII = { sm: 6, md: 10, lg: 14, xl: 20 };
export const MOTION = { fast: "120ms", base: "200ms", slow: "320ms", easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };
