import type { OrgCategory } from "@/design/primitives/Chip";

/**
 * The six organization-category marks (ASSET_CHECKLIST 1.3).
 *
 * Authored rather than taken from Lucide because three of the six have no
 * honest Lucide equivalent — "service" and "faith" in particular, where the
 * nearest icons carry meanings this product must not assert. Drawn to Lucide's
 * grid and stroke so they sit beside the library icons without looking borrowed.
 *
 * They paint in `currentColor`, so a caller sets the category colour with a
 * token class (`text-cat-arts`) and the palette rule in DESIGN_SYSTEM.md 10 —
 * category colour identifies, never ranks — stays the caller's to keep.
 *
 * Faith-based is a sunrise on purpose: every denominational mark would exclude
 * somebody in a public school.
 */

const PATHS: Record<OrgCategory, React.ReactNode> = {
  academic: (
    <>
      <path d="M12 6.8S9.8 5.2 6.6 5.2H4.2v12h2.4c3.2 0 5.4 1.6 5.4 1.6" />
      <path d="M12 6.8s2.2-1.6 5.4-1.6h2.4v12h-2.4c-3.2 0-5.4 1.6-5.4 1.6" />
      <path d="M12 6.8v11.9" />
    </>
  ),
  arts: (
    <>
      <path d="M12 3.4a8.6 8.6 0 1 0 0 17.2 1.9 1.9 0 0 0 1.9-1.9 1.9 1.9 0 0 1 1.9-1.9h1.4a3.4 3.4 0 0 0 3.4-3.4A8.6 8.6 0 0 0 12 3.4Z" />
      <circle cx="8.2" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.8" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  sports: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 3.4c2.9 2.4 4.4 5.2 4.4 8.6s-1.5 6.2-4.4 8.6" />
      <path d="M12 3.4c-2.9 2.4-4.4 5.2-4.4 8.6s1.5 6.2 4.4 8.6" />
    </>
  ),
  service: (
    <>
      <path d="M12 14.9s-4.7-2.9-4.7-6a2.8 2.8 0 0 1 4.7-2 2.8 2.8 0 0 1 4.7 2c0 3.1-4.7 6-4.7 6Z" />
      <path d="M4.3 14.4c0 3.1 3.4 5.6 7.7 5.6s7.7-2.5 7.7-5.6" />
    </>
  ),
  faith: (
    <>
      <path d="M3.8 18.2h16.4" />
      <path d="M7.4 18.2a4.6 4.6 0 0 1 9.2 0" />
      <path d="M12 5.2v2.1M5.9 8.1l1.5 1.5M18.1 8.1l-1.5 1.5M3.5 13.9H5M19 13.9h1.5" />
    </>
  ),
  interest: (
    <>
      <path d="M11.4 4.2 13 9.1l4.9 1.6-4.9 1.6-1.6 4.9-1.6-4.9-4.9-1.6L9.8 9.1Z" />
      <path d="M17.6 15.6l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" />
    </>
  ),
};

export type CategoryIconProps = {
  category: OrgCategory;
  /** Rendered size in px. Drawn on a 24px grid. */
  size?: number;
  className?: string;
};

export function CategoryIcon({ category, size = 24, className }: CategoryIconProps) {
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
      {PATHS[category]}
    </svg>
  );
}
