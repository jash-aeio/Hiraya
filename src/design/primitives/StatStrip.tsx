import type { ReactNode } from "react";

import { cn } from "@/design/cn";

/**
 * The reference's overview stat cards, translated for a phone
 * (DESIGN_SYSTEM.md §7 — "Overview stat cards row → horizontal snap-scroll
 * StatStrip … desktop: 3-up grid").
 *
 * **Both registers use this, and that is the point.** A learner's Home leads
 * with points and a rank; an adviser's leads with "pending approvals: 3". The
 * mood differs in what is *put* in the tiles — the shape of a headline number
 * with a label under it does not, and giving each side its own near-duplicate
 * component is how a design system dies (D12, §5).
 *
 * The tile contract is deliberately narrow: a label, a value, and an optional
 * hint. No delta and no sparkline, because neither has a truthful source yet —
 * XP has no stored history to compare a period against, and a sparkline over
 * invented points would be decoration that looks like evidence.
 */

export type StatTileProps = {
  /** Sentence case, no trailing colon. Already translated by the caller. */
  label: string;
  /** The number itself. Kept a node so a caller can put a mark beside it. */
  value: ReactNode;
  /** One short line under the value — a unit, a scope, a caveat. */
  hint?: string;
  /** A category or status mark. Decorative: the label carries the meaning. */
  icon?: ReactNode;
};

export function StatTile({ label, value, hint, icon }: StatTileProps) {
  return (
    <div
      className={cn(
        "flex min-w-[8.5rem] shrink-0 snap-start flex-col gap-1 rounded-lg bg-surface p-4 shadow-sm",
        // In the grid below, tiles stop being a scrolling row and share width.
        "sm:min-w-0 sm:shrink",
      )}
    >
      {icon ? <span className="mb-0.5">{icon}</span> : null}
      <p className="type-label text-ink-muted">{label}</p>
      {/*
        Proportional figures, not tabular. `tabular-nums` gives every digit the
        width of a zero, which is right for a column of ranks that must not
        jitter and wrong for a standalone headline, where it reads loose. The
        token layer makes that opt-in per element (`[data-numeric]`), so this
        simply does not opt in — see the leaderboard rows, which do.
      */}
      <p className="type-numeral text-ink">{value}</p>
      {hint ? <p className="type-small text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export type StatStripProps = {
  children: ReactNode;
  /**
   * The accessible name of the group, translated by the caller. A row of
   * numbers with no name is a row a screen reader reads as loose text.
   */
  label: string;
  className?: string;
};

export function StatStrip({ children, label, className }: StatStripProps) {
  return (
    <section
      aria-label={label}
      className={cn(
        // Phone: one scrolling row, snapping, with the gutter preserved by
        // padding rather than margin so the last tile does not butt the edge.
        "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1",
        // `scroll-pl-4` is not decoration. Without it a snap-mandatory
        // container aligns the first tile to its *border* box, so the moment
        // the strip settles it swallows the 16px padding and the tile sits
        // flush against the screen edge — measured at left:0 on a 360px
        // viewport, against the >=16px gutter floor in DESIGN_SYSTEM.md §7.
        "scroll-pl-4",
        // From 640px there is room for all three at once, so the scroll and the
        // negative margin both go away rather than lingering as dead affordance.
        "sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:scroll-pl-0",
        className,
      )}
    >
      {children}
    </section>
  );
}
