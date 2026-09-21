/**
 * The Hiraya logomark: a rising chevron under an amber point.
 *
 * The geometry is duplicated once, in `src/app/icon.svg`, which is the file the
 * browser fetches for the tab (Next's `icon` file convention cannot read a
 * component). If you change one, change the other — they are four elements and
 * a viewBox, and a build step to keep them in sync would cost more than it
 * saves.
 *
 * Colours are literal here rather than tokens on purpose: this is a brand mark,
 * not a themed surface. It must render identically inside an ImageResponse
 * (which has no stylesheet) and on a school letterhead.
 */

export type LogomarkProps = {
  /** Rendered size in px. Legible down to 24. */
  size?: number;
  className?: string;
};

export function Logomark({ size = 32, className }: LogomarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="48" rx="13" fill="#0d7f7c" />
      <path
        d="M13.5 32.5 24 22l10.5 10.5"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="13.5" r="4.25" fill="#f5a524" />
    </svg>
  );
}
