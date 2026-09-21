import { Plus_Jakarta_Sans } from "next/font/google";

/**
 * Plus Jakarta Sans (SIL OFL), the closest free match to the visual reference's
 * geometric sans (DESIGN_SYSTEM.md §3).
 *
 * `next/font` downloads the file at build time and serves it from our own origin.
 * A runtime font CDN would be a render-blocking third-party request on a prepaid
 * connection, which is the wrong thing to spend the 500 KB budget on. The trade
 * is that a production build needs network access once, and caches it after.
 *
 * Requested as a variable font — one file covering 400-800 — rather than five
 * static weights.
 */
export const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});
