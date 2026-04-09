/**
 * Spendly Design Tokens
 * Extracted from globals.css — use these to stay consistent across all phases.
 * These are the canonical design values for the Spendly dashboard.
 */

export const colors = {
  background: "#f5f3ee",
  foreground: "#1a1a1a",
  card: "#ffffff",
  cardForeground: "#1a1a1a",
  primary: "#2d4a3e",         // deep forest green
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
  destructive: "oklch(0.577 0.245 27.325)",
} as const

export const fonts = {
  sans: "DM Sans",         // body text, UI labels
  serif: "Playfair Display", // headings (h1, CardTitle)
  mono: "JetBrains Mono",  // labels, tags (font-mono class)
} as const

export const radius = {
  sm: "calc(0.625rem - 4px)",  // ~6px
  md: "calc(0.625rem - 2px)",  // ~8px
  lg: "0.625rem",              // 10px — default
  xl: "calc(0.625rem + 4px)",  // ~14px
  "2xl": "1rem",               // 16px — rounded-2xl
  "3xl": "1.5rem",             // 24px — rounded-3xl (cards, modals, sidebar)
  full: "9999px",              // rounded-full (buttons, badges, avatar)
} as const

export const spacing = {
  // Cards use px-6 py-5 by default
  cardPaddingX: "1.5rem",
  cardPaddingY: "1.25rem",
  // Sidebar width
  sidebarWidth: "16rem",       // w-64
  // Max content width
  maxContent: "80rem",         // max-w-7xl
} as const

export const shadows = {
  card: "shadow-sm",           // subtle elevation for cards
  sidebar: "shadow-sm",
} as const

export const urgencyColors = {
  critical: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  warning:  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  safe:     { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
} as const

/**
 * Component patterns
 * 
 * Card:       rounded-3xl border border-border/70 bg-card shadow-sm
 * Button:     rounded-full
 * Sidebar:    sticky top-6 h-[calc(100vh-3rem)] w-64 rounded-3xl border border-border/70 bg-card
 * Page header: rounded-3xl border border-border/70 bg-card px-6 py-5 shadow-sm
 * Label tag:  text-xs font-mono text-muted-foreground uppercase tracking-wide
 * Heading:    font-serif text-3xl (h1), font-serif text-2xl (h2), font-serif text-xl (h3)
 */
