import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        text: "var(--text)",
        muted: "var(--text-muted)",
        line: "var(--border)",
        signal: "var(--signal)",
        "signal-text": "var(--signal-text)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "16px",
        xl: "20px",
      },
      fontSize: {
        display: ["30px", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        h1: ["22px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        h2: ["18px", { lineHeight: "1.25" }],
        body: ["15px", { lineHeight: "1.45" }],
        small: ["13px", { lineHeight: "1.4" }],
        label: ["11px", { lineHeight: "1.3", letterSpacing: "0.04em" }],
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
