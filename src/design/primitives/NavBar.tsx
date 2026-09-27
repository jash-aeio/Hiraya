"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavIcon, type NavIconName } from "@/design/art/NavIcon";
import { Wordmark } from "@/design/art/Wordmark";
import { cn } from "@/design/cn";
import { isNavHidden, isNavItemActive } from "@/features/navigation/navView";

/**
 * The app's navigation: a bottom tab bar on a phone, a sidebar from 1024px
 * (DESIGN_SYSTEM.md §7 — "Left sidebar nav → bottom tab bar … desktop: sidebar
 * returns, with the teal active pill").
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
 *
 * **One landmark, two layouts, no duplication (P-16).** The obvious way to add a
 * sidebar is a second `<nav>` behind `hidden lg:flex`, and it is wrong twice
 * over: a screen reader is offered two navigations where the audit asserts
 * exactly one, and the same item list then has two renderers to keep in step.
 * So the element is the same at every width and only its axis changes. It also
 * stays **last in the DOM**, which is why no skip link is needed: content comes
 * first, so there are no repeated blocks to bypass (WCAG 2.4.1). At ≥1024px
 * `order` moves it to the left visually while tab order still reaches the page
 * content first.
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
  /** The wordmark's accessible name in the sidebar, translated by the caller. */
  homeLabel?: string;
  className?: string;
};

export function NavBar({ items, label, hiddenOn = [], homeLabel, className }: NavBarProps) {
  const pathname = usePathname();

  // Hiding here rather than in the layout is the trade for mounting the bar
  // once in the root layout: the layout cannot see the pathname, and this can.
  if (isNavHidden(pathname, hiddenOn)) return null;
  if (items.length === 0) return null;

  return (
    <>
      {/* The bar is fixed on a phone, so without this the last element of every
          page sits underneath it. A spacer rather than padding on `body`,
          because the bar is conditional and `body` cannot know whether it
          rendered. At ≥1024px the sidebar is in flow and the spacer would be a
          stray 56px at the bottom of every screen. */}
      <div aria-hidden className="h-[3.5rem] pb-[env(safe-area-inset-bottom)] lg:hidden" />
      <nav
        aria-label={label}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface",
          // Phones that draw behind a home indicator would otherwise put it on
          // top of the last row of touch targets.
          "pb-[env(safe-area-inset-bottom)]",
          // From 1024px: out of the corner and up the side, in flow, ahead of
          // the content visually but still after it in the DOM.
          "lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-0 lg:order-first",
          "lg:h-dvh lg:w-60 lg:shrink-0 lg:border-t-0 lg:border-r lg:pb-0",
          className,
        )}
      >
        {/* Sidebar-only: the reference puts the brand at the top of the rail.
            On a phone it would cost 56px of a 800px screen to say something the
            user already knows. */}
        <div className="hidden px-5 py-6 lg:block">
          <Link
            href="/"
            aria-label={homeLabel}
            className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Wordmark size={24} />
          </Link>
        </div>

        <ul
          className={cn(
            "mx-auto flex max-w-2xl items-stretch justify-around px-1",
            "lg:mx-0 lg:max-w-none lg:flex-col lg:justify-start lg:gap-1 lg:px-3",
          )}
        >
          {items.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <li key={item.href} className="flex-1 lg:flex-none">
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
                    // Sidebar: icon and label on one line, and the pill fills.
                    "lg:min-h-0 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-lg lg:px-3 lg:py-2.5",
                    active
                      ? cn(
                          // --primary as TEXT fails AA on the canvas (4.44:1)
                          // and passes on --surface (4.8:1). The bottom bar is
                          // on --surface, so it is allowed there — spelled out
                          // because the P-06 audit caught exactly this mistake
                          // twice (§8).
                          "font-semibold text-primary",
                          // The teal active pill the reference uses (§7). White
                          // on --primary is the same 4.8:1, which passes AA at
                          // this size; the weight carries it for everyone who
                          // does not see the fill.
                          "lg:bg-primary lg:text-ink-inverse",
                        )
                      : "text-ink-muted lg:hover:bg-primary-soft lg:hover:text-primary-ink",
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
