/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        ink: "var(--color-ink)",
        "ink-soft": "var(--color-ink-soft)",
        border: "var(--color-border)",
        pulse: "var(--color-pulse)",
        "pulse-soft": "var(--color-pulse-soft)",
        coral: "var(--color-coral)",
        "coral-soft": "var(--color-coral-soft)",
        amber: "var(--color-amber)",
        "amber-soft": "var(--color-amber-soft)",
        slate: "var(--color-slate)",
        "slate-soft": "var(--color-slate-soft)",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      keyframes: {
        "pulse-beat": {
          "0%": { boxShadow: "0 0 0 0 rgba(250,174,43,0.45)" },
          "70%": { boxShadow: "0 0 0 7px rgba(250,174,43,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(250,174,43,0)" },
        },
      },
      animation: {
        "pulse-beat": "pulse-beat 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};