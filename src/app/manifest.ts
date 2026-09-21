import type { MetadataRoute } from "next";

/**
 * The PWA manifest.
 *
 * Web first, always: the Capacitor shells (D11) are an addition to this, never
 * a replacement for it — a learner whose phone has no room for another app
 * still installs Hiraya from the browser.
 *
 * `display: "standalone"` rather than `fullscreen` on purpose. The scanner runs
 * at a gate in daylight, and an officer needs the system clock and the battery
 * indicator to know whether the queue is going to outlast the phone.
 *
 * No `name` string goes through next-intl here: a manifest is fetched once by
 * the OS with no request locale, so this is the one place the product name is
 * written plainly. Filipino-locale naming, if it is ever wanted, needs a
 * per-locale manifest rather than a translated key.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hiraya",
    short_name: "Hiraya",
    description:
      "School engagement for learners, organizations and advisers. Verified attendance, recognized participation.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5f8",
    theme_color: "#0d7f7c",
    categories: ["education"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
