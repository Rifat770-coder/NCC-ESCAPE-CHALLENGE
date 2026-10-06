import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050505",
          900: "#0a0a0a",
          800: "#111111",
          700: "#161616",
          600: "#242424",
        },
        cyber: {
          50: "#fcffe0",
          100: "#f7ffad",
          200: "#f2ff70",
          300: "#efff00",
          400: "#e4f200",
          500: "#c5d100",
          600: "#98a100",
          700: "#697000",
          800: "#3d4200",
          900: "#1b1e00",
        },
        neon: {
          blue: "#efff00",
          cyan: "#efff00",
          purple: "#b9c400",
          pink: "#dce600",
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(239,255,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(239,255,0,0.06) 1px, transparent 1px)",
        "radial-spot":
          "radial-gradient(circle at 50% 0%, rgba(239,255,0,0.18), transparent 55%)",
      },
      animation: {
        "spin-slow": "spin 12s linear infinite",
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
        flicker: "flicker 3s linear infinite",
        scan: "scan 6s linear infinite",
        float: "float 6s ease-in-out infinite",
        "fade-up": "fadeUp 0.6s ease-out both",
        "gradient-shift": "gradientShift 8s ease infinite",
        "border-pulse": "borderPulse 3s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": {
            boxShadow:
              "0 0 0 0 rgba(239,255,0,0.0), 0 0 24px rgba(239,255,0,0.35)",
          },
          "50%": {
            boxShadow:
              "0 0 0 1px rgba(239,255,0,0.6), 0 0 38px rgba(239,255,0,0.55)",
          },
        },
        flicker: {
          "0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%": { opacity: "1" },
          "20%, 24%, 55%": { opacity: "0.6" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        borderPulse: {
          "0%, 100%": { borderColor: "rgba(239,255,0,0.35)" },
          "50%": { borderColor: "rgba(239,255,0,0.85)" },
        },
      },
      boxShadow: {
        "glow-blue": "0 0 24px rgba(239,255,0,0.45)",
        "glow-cyan": "0 0 32px rgba(239,255,0,0.55)",
        "glow-purple": "0 0 30px rgba(239,255,0,0.55)",
      },
    },
  },
  plugins: [],
};

export default config;