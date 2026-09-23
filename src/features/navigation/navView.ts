import type { NavBarItem } from "@/design/primitives/NavBar";
import type { NavIconName } from "@/design/art/NavIcon";

/**
 * The two decisions the bottom nav makes, as pure functions (DESIGN_SYSTEM.md §7).
 *
 * Separated from the components for the reason `boardView.ts` is: both rules are
 * quietly wrong in ways a rendered screenshot does not show. A tab that never
 * highlights looks like a styling choice, and a Scan tab offered to a learner
 * looks like nothing at all until someone taps it and meets a 403.
 */

/** A route the Phase 0 demo actually has a screen for. */
export type NavRoute = "/" | "/events" | "/leaderboard" | "/xp" | "/checkin";

export type NavLabels = Record<"home" | "events" | "leaderboard" | "xp" | "scan", string>;

/** The roles that may open a check-in gate, per SYSTEM_DESIGN.md §2. */
const OFFICER_ROLES = ["org_officer", "sslg_officer"] as const;

/**
 * Which tabs this person gets.
 *
 * **Phase 0 scope on purpose.** §7 specifies five learner tabs — Home · Events ·
 * Orgs · Leaderboard · Me — and Orgs and Me are Phase 1 screens. A tab pointing
 * at a route that does not exist is worse than a tab that is not there yet, so
 * this returns only what exists. P-14 widens the list; nothing else changes.
 */
export function navItemsFor(roles: readonly string[], labels: NavLabels): NavBarItem[] {
  const items: NavBarItem[] = [
    { href: "/", label: labels.home, icon: "home" satisfies NavIconName },
    { href: "/events", label: labels.events, icon: "events", matchNested: true },
    { href: "/leaderboard", label: labels.leaderboard, icon: "leaderboard" },
    { href: "/xp", label: labels.xp, icon: "xp" },
  ];

  // "The scanner is reachable in one tap from anywhere in the officer role"
  // (§7). Advisers scan too, but their tab set is a Phase 1 screen and is not
  // invented here.
  if (OFFICER_ROLES.some((role) => roles.includes(role))) {
    items.push({ href: "/checkin", label: labels.scan, icon: "scan", matchNested: true });
  }

  return items;
}

/**
 * Whether a tab is the current one.
 *
 * `matchNested` exists because `/events/<id>` must still light up Events, while
 * `/` must not light up on every route — a prefix match on "/" matches
 * everything, which would mark Home active permanently.
 */
export function isNavItemActive(pathname: string, item: NavBarItem): boolean {
  if (!item.matchNested) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Whether the bar should be suppressed entirely on this route. */
export function isNavHidden(pathname: string, hiddenOn: readonly string[]): boolean {
  return hiddenOn.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
