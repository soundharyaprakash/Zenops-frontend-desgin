/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./services/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Jira/Atlassian Structural Tokens
        app: "var(--bg-app)",
        surface: "var(--surface)",
        raised: "var(--raised)",
        sunken: "var(--sunken)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        "text-default": "var(--text-default)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        foreground: "var(--text-default)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",

        // Jira Primary Action Token
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          light: "var(--info-bg)",
        },
        selected: "var(--selected-bg)",

        // Semantic Status & Lozenge Tokens
        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          bg: "var(--danger-bg)",
        },
        info: {
          DEFAULT: "var(--info)",
          bg: "var(--info-bg)",
        },
        discovery: {
          DEFAULT: "var(--discovery)",
          bg: "var(--discovery-bg)",
        },
        neutral: {
          DEFAULT: "var(--neutral)",
          bg: "var(--neutral-bg)",
        },

        // ZenOps Brand Colors
        brand: {
          blue: "#1F6BFF",
          cyan: "#19C8F0",
          mint: "#3EF2B5",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["Geist Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        lozenge: "3px",
        button: "3px",
        input: "3px",
        card: "8px",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        60: "15rem",
        64: "16rem",
        68: "17rem",
        72: "18rem",
      },
      boxShadow: {
        subtle: "0 1px 1px 0 rgba(0, 0, 0, 0.04)",
        card: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        raised: "0 4px 8px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)",
        dropdown: "0 10px 18px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -4px rgba(0, 0, 0, 0.08)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in-down": "fade-in-down 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};
