import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#0a0a0c",
          900: "#101015",
          800: "#16161d",
          700: "#1d1d27",
          600: "#262633",
          500: "#3a3a4a",
          400: "#5a5a6e",
          300: "#8a8a9e",
          200: "#b0b0c4",
          100: "#d8d8e6",
          50: "#f0f0f6",
        },
        accent: {
          green: "#7dd3a8",
          gold: "#e6c46e",
          rose: "#e89aa8",
          violet: "#a89ce8",
          sky: "#7ec0e6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
