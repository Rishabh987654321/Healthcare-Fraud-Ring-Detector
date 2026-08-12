/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "var(--bg)",
          muted: "var(--bg-muted)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
        },
        "text-primary": "var(--text-primary)",
        "text-muted": "var(--text-muted)",
        accent: {
          DEFAULT: "var(--accent)",
          muted: "var(--accent-muted)",
        },
        flag: {
          DEFAULT: "var(--flag)",
          bg: "var(--flag-bg)",
        },
        // Mapped shadcn UI tokens
        background: "var(--bg)",
        foreground: "var(--text-primary)",
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-primary)",
        },
        popover: {
          DEFAULT: "var(--surface-raised)",
          foreground: "var(--text-primary)",
        },
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "var(--bg-muted)",
          foreground: "var(--text-primary)",
        },
        muted: {
          DEFAULT: "var(--bg-muted)",
          foreground: "var(--text-muted)",
        },
        destructive: {
          DEFAULT: "var(--flag)",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
