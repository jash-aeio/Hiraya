"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavIcon, type NavIconName } from "@/design/art/NavIcon";
import { cn } from "@/design/cn";
import { isNavHidden, isNavItemActive } from "@/features/navigation/navView";

/**
 * The bottom tab bar (DESIGN_SYSTEM.md §7).
 *
 * Presentational and route-agnostic on purpose: it is handed its items and knows
 * nothing about roles, features or which screens exist. That keeps it in
 * `design/` under the rule that nothing feature-specific lives here — the
 * decision about *which* tabs a person gets belongs to the caller.
 *
 * A client component for exactly one reason: marking the current tab needs the
 * pathname, and a Server Component cannot read it. Everything else it does is
 * static, so the cost is one small bundle rather than a client-rendered screen.
 *
 * **This is the `nav` landmark for the whole app.** The P-06 audit (2026-09-22)
 * found no landmark on any screen and no way to move between screens without
 * typing a URL — a WCAG 2.1 AA failure against DESIGN_SYSTEM.md §8, and the last
 * thing standing between Phase 0 and its accessibility criterion.
 */

export type NavBarItem = {
  href: string;
  /** Already translated by the caller — this component holds no strings. */
  label: string;
  icon: NavIconName;
  /**
   * Treat descendant routes as this tab. `/events/abc` marks Events active;
   * `/` would otherwise match everything, so Home is matched exactly.
   */
  matchNested?: boolean;
};

export type NavBarProps = {
  items: readonly NavBarItem[];
  /** The accessible name of the landmark, translated by the caller. */
  label: string;
  /** Routes the bar must not appear on, matched as prefixes. */
  hiddenOn?: readonly string[];
  className?: string;
};

export function NavBar({ items, label, hiddenOn = [], className }: NavBarProps) {
  const pathname = usePathname();

  // Hiding here rather than in the layout is the trade for mounting the bar
  // once in the root layout: the layout cannot see the pathname, and this can.
  if (isNavHidden(pathname, hiddenOn)) return null;
  if (items.length === 0) return null;

  return (
    <>
      {/* The bar is fixed, so without this the last element of every page sits
          underneath it. A spacer rather than padding on `body`, because the bar
          is conditional and `body` cannot know whether it rendered. */}
      <div aria-hidden className="h-[3.5rem] pb-[env(safe-area-inset-bottom)]" />
      <nav
        aria-label={label}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface",
          // Phones that draw behind a home indicator would otherwise put it on
          // top of the last row of touch targets.
          "pb-[env(safe-area-inset-bottom)]",
          className,
        )}
      >
        <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-1">
          {items.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  // aria-current is what a screen reader announces; the colour
                  // and the weight below are for everyone else — meaning is
                  // never carried by colour alone (§8).
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    // ≥44px touch target, DESIGN_SYSTEM.md §7.
                    "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5",
                    "type-small transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    // --primary as TEXT fails AA on the canvas (4.44:1) and
                    // passes on --surface (4.8:1). This bar is on --surface, so
                    // it is allowed here — spelled out because the P-06 audit
                    // caught exactly this mistake twice (§8).
                    active ? "font-semibold text-primary" : "text-ink-muted",
                  )}
                >
                  <NavIcon name={item.icon} size={22} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
