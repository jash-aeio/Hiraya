import Link from "next/link";

import { CategoryIcon } from "@/design/art/CategoryIcon";
import { cn } from "@/design/cn";
import type { OrgCategory } from "@/design/primitives/Chip";

/**
 * The reference's mini-game category tiles, carrying the six org categories
 * (DESIGN_SYSTEM.md §7 — "2-up grid of CategoryTile … desktop: 4-up grid").
 *
 * **The colour identifies and never ranks** (§10). Each tile wears its own
 * category hue as a soft icon plate, in a fixed order that does not change with
 * how many events a category happens to have — a tile that moved or recoloured
 * as counts changed would be teaching a learner to read the palette as a
 * ranking, which is the one thing these six colours must never mean.
 *
 * Colour is never the only carrier either: every tile has its name in ink, and
 * the icon is `aria-hidden` because that name is already the link text (§8).
 */

const ICON_PLATE: Record<OrgCategory, string> = {
  academic: "bg-cat-academic/12 text-cat-academic",
  arts: "bg-cat-arts/12 text-cat-arts",
  sports: "bg-cat-sports/12 text-cat-sports",
  service: "bg-cat-service/12 text-cat-service",
  faith: "bg-cat-faith/12 text-cat-faith",
  interest: "bg-cat-interest/12 text-cat-interest",
};

export type CategoryTileProps = {
  category: OrgCategory;
  /** The category's name, already translated. Also the link's accessible name. */
  label: string;
  href: string;
  /** One short line under the name — a count, or what the category covers. */
  hint?: string;
};

export function CategoryTile({ category, label, href, hint }: CategoryTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex touch-target flex-col gap-2 rounded-lg bg-surface p-4 shadow-sm",
        "transition-shadow hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      )}
    >
      <span
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-md",
          ICON_PLATE[category],
        )}
      >
        <CategoryIcon category={category} size={22} />
      </span>
      {/*
        The Filipino catalogue is where this breaks, not the English one:
        "Pananampalataya" is one 15-character word, measured at 129px in a 119px
        column at 360px, with no space to wrap at. English "Faith-based" fits and
        hides the problem entirely.

        `wrap-break-word`, not `break-words` — Tailwind renamed it in v4.1 and
        this project is on 4.3, where the old name emits no CSS at all. It fails
        silently: the class name still reads correctly in the markup and lint
        says nothing, so the only way to know is to measure `overflow-wrap` in
        the browser, which is how this was caught.
      */}
      <span className="type-body-strong wrap-break-word text-ink">{label}</span>
      {hint ? <span className="type-small text-ink-muted">{hint}</span> : null}
    </Link>
  );
}
