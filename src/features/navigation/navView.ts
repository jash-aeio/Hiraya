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
export type NavRoute = "/" | "/events" | "/leaderboard" | "/xp" | "/checkin" | "/approvals";

export type NavLabels = Record<
  "home" | "events" | "leaderboard" | "xp" | "scan" | "approvals",
  string
>;

/** The roles that may open a check-in gate, per SYSTEM_DESIGN.md §2. */
const OFFICER_ROLES = ["org_officer", "sslg_officer"] as const;

/**
 * The adults. Not "anyone who is not a learner" — the test is a positive list,
 * because a role added later should default to the learner surface and be
 * promoted deliberately, rather than silently inherit an approvals tab by
 * failing to be a learner.
 *
 * `guidance` is absent on purpose: guidance staff read the non-participant
 * analytics (CLAUDE.md §6), which is a Phase 4 surface, and they approve
 * nothing. Giving them an approvals tab today would be a tab to an empty queue.
 */
const STAFF_ROLES = ["org_adviser", "sslg_adviser", "school_admin", "school_head"] as const;

/**
 * Whether this person gets the staff tab set rather than the learner one.
 *
 * Someone who is both — an adviser who is also enrolled, which the schema
 * permits — is treated as a **learner**, because the learner surface is the one
 * that holds their own points and the staff surface holds nobody's. The demo's
 * officers are learners by this test too, which is correct: an SSLG officer is a
 * learner who also works the gate.
 */
export function isStaff(roles: readonly string[]): boolean {
  if (roles.includes("learner")) return false;
  return STAFF_ROLES.some((role) => roles.includes(role));
}

/**
 * Which tabs this person gets.
 *
 * **Phase 0 scope on purpose.** §7 specifies five learner tabs — Home · Events ·
 * Orgs · Leaderboard · Me — and Orgs and Me are Phase 1 screens. A tab pointing
 * at a route that does not exist is worse than a tab that is not there yet, so
 * this returns only what exists. P-14 widens the list; nothing else changes.
 */
export function navItemsFor(roles: readonly string[], labels: NavLabels): NavBarItem[] {
  // The staff set replaces the learner set rather than extending it. §7 gives
  // advisers Approvals · Events · Analytics · Me, and none of those is Home,
  // XP or Leaderboard — an adviser has no points and no rank, so those tabs
  // would lead to screens about nobody. Analytics is Phase 4 and Me is Phase 1,
  // so what exists today is two tabs, and two honest tabs beat four with two
  // dead ends.
  if (isStaff(roles)) {
    return [
      { href: "/approvals", label: labels.approvals, icon: "approvals" satisfies NavIconName },
      { href: "/events", label: labels.events, icon: "events", matchNested: true },
    ];
  }

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
