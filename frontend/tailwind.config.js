/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAF9F6",
        surface: "#FFFFFF",
        ink: "#1C1C1E",
        "ink-soft": "#55565B",
        border: "#E7E4DC",
        pulse: "#16A34A",
        "pulse-soft": "#E7F6EC",
        coral: "#E4572E",
        "coral-soft": "#FBEAE4",
        amber: "#D97706",
        "amber-soft": "#FDF1E0",
        slate: "#2A4B7C",
        "slate-soft": "#E9EEF5",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      keyframes: {
        "pulse-beat": {
          "0%": { boxShadow: "0 0 0 0 rgba(22,163,74,0.45)" },
          "70%": { boxShadow: "0 0 0 7px rgba(22,163,74,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(22,163,74,0)" },
        },
      },
      animation: {
        "pulse-beat": "pulse-beat 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};