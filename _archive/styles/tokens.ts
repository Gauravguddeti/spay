export const designTokens = {
  colors: {
    background: "#f5f3ee",
    foreground: "#1a1a1a",
    card: "#ffffff",
    cardForeground: "#1a1a1a",
    popover: "#ffffff",
    popoverForeground: "#1a1a1a",
    primary: "#2d4a3e",
    primaryForeground: "#ffffff",
    secondary: "#e8ebe6",
    secondaryForeground: "#1a1a1a",
    muted: "#e8ebe6",
    mutedForeground: "#6b7280",
    accent: "#c5d4c0",
    accentForeground: "#1a1a1a",
    border: "#d1d5db",
    input: "#d1d5db",
    ring: "#2d4a3e",
  },
  typography: {
    sans: '"DM Sans", "Geist Fallback", sans-serif',
    serif: '"Playfair Display", "Georgia", serif',
    mono: '"JetBrains Mono", "Geist Mono", monospace',
  },
  radius: {
    base: "0.625rem",
    sm: "calc(0.625rem - 4px)",
    md: "calc(0.625rem - 2px)",
    lg: "0.625rem",
    xl: "calc(0.625rem + 4px)",
    authCard: "1.5rem",
    pill: "9999px",
  },
  spacing: {
    pageX: "1.5rem",
    sectionGap: "1.5rem",
    cardPadding: "1.5rem",
    formGap: "1rem",
  },
  shadows: {
    card: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    subtle: "0 1px 1px 0 rgb(0 0 0 / 0.04)",
  },
} as const

export type DesignTokens = typeof designTokens