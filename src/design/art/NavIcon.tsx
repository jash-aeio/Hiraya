/**
 * The bottom-navigation marks (DESIGN_SYSTEM.md §7).
 *
 * Authored rather than pulled from Lucide for the reason CategoryIcon is: this
 * is five icons, and a library dependency for five icons costs more of the
 * 500 KB budget than drawing them does (D14). Drawn on Lucide's 24px grid at
 * the same 1.75 stroke so they sit beside CategoryIcon without looking borrowed.
 *
 * They paint in `currentColor`, so the active/inactive colour stays the caller's
 * to decide, and they are `aria-hidden` throughout: the label beside each one is
 * the accessible name. An icon-only tab would fail DESIGN_SYSTEM.md §8's rule
 * that meaning is never carried by colour or shape alone.
 */

export type NavIconName = "home" | "events" | "leaderboard" | "xp" | "scan";

const PATHS: Record<NavIconName, React.ReactNode> = {
  // A roof over a door: the one shape nobody has to learn.
  home: (
    <>
      <path d="M3.6 10.4 12 3.8l8.4 6.6" />
      <path d="M5.6 9v10.2h12.8V9" />
      <path d="M10 19.2v-5.2h4v5.2" />
    </>
  ),
  // A calendar, because an event in this product is always a date first.
  events: (
    <>
      <rect x="3.6" y="5.4" width="16.8" height="14.6" rx="2.2" />
      <path d="M3.6 10.2h16.8" />
      <path d="M8.4 3.4v3.4" />
      <path d="M15.6 3.4v3.4" />
    </>
  ),
  // Three columns, tallest in the middle: a podium, not a bar chart. Ranking is
  // the meaning; measurement is not.
  leaderboard: (
    <>
      <path d="M9.4 20.2V11h5.2v9.2" />
      <path d="M3.8 20.2v-5.6h5.6" />
      <path d="M20.2 20.2v-7.8h-5.6" />
      <path d="M2.8 20.2h18.4" />
    </>
  ),
  // A coin with a rising spark. Matches XpCoin's reading without importing it,
  // since that one is drawn for a much larger render.
  xp: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M9.3 9.2l2.7 5.6 2.7-5.6" />
    </>
  ),
  // A scan frame: four corners and a sweep line. Deliberately not a camera —
  // the officer is scanning a code, not taking a photograph, and this product
  // takes no photographs of learners (§6).
  scan: (
    <>
      <path d="M3.8 8.6V6.4a2.6 2.6 0 0 1 2.6-2.6h2.2" />
      <path d="M15.4 3.8h2.2a2.6 2.6 0 0 1 2.6 2.6v2.2" />
      <path d="M20.2 15.4v2.2a2.6 2.6 0 0 1-2.6 2.6h-2.2" />
      <path d="M8.6 20.2H6.4a2.6 2.6 0 0 1-2.6-2.6v-2.2" />
      <path d="M3.8 12h16.4" />
    </>
  ),
};

export type NavIconProps = {
  name: NavIconName;
  /** Rendered size in px. Drawn on a 24px grid. */
  size?: number;
  className?: string;
};

export function NavIcon({ name, size = 24, className }: NavIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
