/**
 * Tunable layout values — change here after iPad review.
 */
export const LAYOUT = {
  taggingPadFlex: 0.72,
  playLogFlex: 0.28,

  minTapTarget: 52,
  compactTapTarget: 40,
  compactSectionPadding: 6,
  saveBarHeight: 72,

  /** Right sidebar — only last N plays shown */
  playLogVisibleCount: 2,

  padding: {
    screen: 16,
    section: 10,
    gap: 8,
  },

  colors: {
    navy: "#1e3a5f",
    navyLight: "#93c5fd",
    saveGreen: "#16a34a",
    saveGreenDisabled: "#86efac",
    panelBg: "#f8fafc",
    sectionBg: "#fff",
    sectionBorder: "#e2e8f0",
    placeholderBg: "#f1f5f9",
    placeholderText: "#94a3b8",
    textPrimary: "#0f172a",
    textMuted: "#64748b",
  },
} as const;
