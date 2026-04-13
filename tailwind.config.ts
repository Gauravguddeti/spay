import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#5a9078",
          hover: "#6ba389",
          muted: "rgba(90,144,120,0.15)",
          dark: "#2d4a3e",
        },
        surface: {
          base: "#0e0e0e",
          raised: "#141414",
          overlay: "#1a1a1a",
          sunken: "#0a0a0a",
          brand: "#2d4a3e",
        },
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        accent: "0 0 24px rgba(90,144,120,0.15)",
        card: "0 4px 12px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
}

export default config
