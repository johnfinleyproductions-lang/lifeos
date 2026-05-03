import type { MetadataRoute } from "next";

/**
 * PWA manifest. Makes "Add to Home Screen" produce a real app-feeling
 * launch (fullscreen, custom splash background, theme color in the iOS
 * status bar) instead of a generic Safari shortcut.
 *
 * Next.js 16 auto-serves this at /manifest.webmanifest and links it from
 * <head> when this file is present in app/.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeOS",
    short_name: "LifeOS",
    description:
      "A daily check-in, identity, and coaching companion. Morning manifesto, evening shutdown, quests, habits, journal — all yours.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    categories: ["productivity", "lifestyle"],
  };
}
