/**
 * The logomark as a data URI, for the raster icons.
 *
 * `ImageResponse` renders JSX through Satori, which has no stylesheet and no
 * DOM — it can, however, place an `<img>` whose source is an inline SVG. That
 * is how the PWA and Apple icons stay derived from one drawing instead of
 * becoming a fourth hand-maintained copy of it.
 *
 * `padding` is the maskable safe zone: Android may crop a maskable icon to any
 * shape, so 20% of the canvas has to be sacrificial (ASSET_CHECKLIST 1.1).
 */
export function logomarkDataUri({
  background,
  mark = "#ffffff",
}: {
  background: string;
  /**
   * The chevron. Must be passed whenever `background` is light — the default is
   * white, which on a white tile renders a logomark consisting entirely of the
   * amber dot. That is not a hypothetical: it shipped into the first OG card.
   */
  mark?: string;
}): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">` +
    `<rect width="48" height="48" rx="13" fill="${background}"/>` +
    `<path d="M13.5 32.5 24 22l10.5 10.5" fill="none" stroke="${mark}" stroke-width="5.5" ` +
    `stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="24" cy="13.5" r="4.25" fill="#f5a524"/>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Brand teal. Literal rather than a token: Satori never sees our CSS. */
export const BRAND_TEAL = "#0d7f7c";
