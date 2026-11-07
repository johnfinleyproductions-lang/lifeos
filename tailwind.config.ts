import type { Config } from "tailwindcss";

/**
 * LifeOS — risograph field log.
 *
 * Every colour is a CSS variable defined in app/globals.css, so day and
 * night both come from one set of classes and nothing in the app needs a
 * `dark:` variant.
 *
 * The `ink-*` scale keeps its existing keys. There are 433 uses of it
 * across 28 components, and the keys are semantic rather than literal:
 * 950..800 are surfaces, 700..500 are lines, 400..50 are text from
 * faintest to strongest. Re-pointing them at variables inverts the whole
 * app into the new palette without touching those files. A page that has
 * not been restyled yet still renders coherently; it just has not been
 * given the print treatment.
 *
 * The `accent-*` keys also keep their names, so the four literal class
 * maps in lib/protocols/definitions.ts keep working and change colour.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Bricolage carries the chrome. Newsreader is for the user's own
        // writing: manifesto, journal, protocol answers.
        sans: ["var(--font-bricolage)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-newsreader)", "ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          950: "rgb(var(--surface-0) / <alpha-value>)", // deepest ground: rail, tab bar
          900: "rgb(var(--surface-1) / <alpha-value>)", // page
          800: "rgb(var(--surface-2) / <alpha-value>)", // panels
          700: "rgb(var(--surface-3) / <alpha-value>)", // raised panels, input surfaces
          600: "rgb(var(--line-soft) / <alpha-value>)",
          500: "rgb(var(--line) / <alpha-value>)",
          400: "rgb(var(--text-3) / <alpha-value>)", // faintest text
          300: "rgb(var(--text-2) / <alpha-value>)",
          200: "rgb(var(--text-2) / <alpha-value>)",
          100: "rgb(var(--text-1) / <alpha-value>)", // body
          50: "rgb(var(--text-1) / <alpha-value>)", // headings
        },
        // the semantic names the new components use
        stock: "rgb(var(--surface-1) / <alpha-value>)",
        sheet: "rgb(var(--surface-2) / <alpha-value>)",
        "sheet-hi": "rgb(var(--surface-3) / <alpha-value>)",
        knock: "rgb(var(--knock) / <alpha-value>)", // type knocked out of a filled block
        hair: "rgb(var(--line) / <alpha-value>)",
        "hair-soft": "rgb(var(--line-soft) / <alpha-value>)",
        accent: {
          // the one fluorescent ink: live, today, now
          spot: "rgb(var(--spot) / <alpha-value>)",
          green: "rgb(var(--green) / <alpha-value>)",
          gold: "rgb(var(--gold) / <alpha-value>)",
          rose: "rgb(var(--rose) / <alpha-value>)",
          violet: "rgb(var(--violet) / <alpha-value>)",
          sky: "rgb(var(--sky) / <alpha-value>)",
        },
      },
      // Nothing in this system is rounded. The keys stay so that the
      // `rounded-*` classes already in the app resolve to a square corner
      // rather than failing to compile.
      borderRadius: {
        none: "0",
        DEFAULT: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "0",
      },
      borderWidth: { DEFAULT: "1.5px", hair: "1px" },
      boxShadow: {
        // Misregistration, the signature move: a two-pass riso print
        // sitting slightly off its own outline. Spend it on the hero, the
        // primary action, and the active card. Nowhere else.
        mis: "5px 5px 0 rgb(var(--spot))",
        "mis-sm": "3px 3px 0 rgb(var(--spot))",
        "mis-ink": "4px 4px 0 rgb(var(--text-1))",
        none: "none",
      },
    },
  },
  plugins: [],
};

export default config;
