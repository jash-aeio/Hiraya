import { describe, expect, it } from "vitest";

import { isNavHidden, isNavItemActive, navItemsFor, type NavLabels } from "@/features/navigation/navView";

/**
 * The bottom nav's two rules (P-15, DESIGN_SYSTEM.md §7 and §8).
 *
 * Both fail quietly. A tab that never highlights reads as a styling choice
 * rather than a bug, and a Scan tab offered to a learner looks like nothing at
 * all until they tap it and meet a refusal — which is a worse first impression
 * than not offering it.
 *
 * The `aria-current` this drives is the accessible half of "you are here". A
 * screen reader user has nothing else: the colour and the weight are not
 * available to them, which is why this is tested rather than eyeballed.
 */

const LABELS: NavLabels = {
  home: "Home",
  events: "Events",
  leaderboard: "Leaderboard",
  xp: "XP",
  scan: "Scan",
};

const hrefs = (roles: readonly string[]) => navItemsFor(roles, LABELS).map((i) => i.href);

describe("navItemsFor", () => {
  it("gives a learner the four Phase 0 screens and no Scan", () => {
    expect(hrefs(["learner"])).toEqual(["/", "/events", "/leaderboard", "/xp"]);
  });

  it("adds Scan for an org officer", () => {
    expect(hrefs(["learner", "org_officer"])).toContain("/checkin");
  });

  it("adds Scan for an SSLG officer", () => {
    expect(hrefs(["learner", "sslg_officer"])).toContain("/checkin");
  });

  it("adds Scan exactly once when someone holds both officer roles", () => {
    const scans = hrefs(["learner", "org_officer", "sslg_officer"]).filter((h) => h === "/checkin");
    expect(scans).toHaveLength(1);
  });

  it("does not offer Scan to an adviser or an admin", () => {
    // Advisers do scan, but their tab set is a Phase 1 screen. Offering them the
    // officer bar would be inventing a surface nobody designed.
    expect(hrefs(["org_adviser", "sslg_adviser"])).not.toContain("/checkin");
    expect(hrefs(["school_admin"])).not.toContain("/checkin");
  });

  it("offers no Orgs or Me tab while those screens do not exist", () => {
    // The guard on P-14: a tab pointing at a 404 is worse than a missing tab.
    const all = hrefs(["learner", "org_officer"]);
    expect(all).not.toContain("/orgs");
    expect(all).not.toContain("/me");
  });

  it("labels every tab from the catalogue, never a bare string", () => {
    for (const item of navItemsFor(["learner", "org_officer"], LABELS)) {
      expect(Object.values(LABELS)).toContain(item.label);
    }
  });
});

describe("isNavItemActive", () => {
  const events = { href: "/events", label: "Events", icon: "events" as const, matchNested: true };
  const home = { href: "/", label: "Home", icon: "home" as const };
  const xp = { href: "/xp", label: "XP", icon: "xp" as const };

  it("marks an exact match", () => {
    expect(isNavItemActive("/events", events)).toBe(true);
    expect(isNavItemActive("/xp", xp)).toBe(true);
  });

  it("marks a nested route as its parent tab", () => {
    expect(isNavItemActive("/events/abc-123", events)).toBe(true);
  });

  it("does not mark Home on every route", () => {
    // The regression this file exists for: "/" is a prefix of everything, so a
    // naive startsWith leaves Home permanently highlighted and the real tab
    // never highlighted at all.
    expect(isNavItemActive("/events", home)).toBe(false);
    expect(isNavItemActive("/xp", home)).toBe(false);
    expect(isNavItemActive("/", home)).toBe(true);
  });

  it("does not mark a tab whose href is merely a string prefix", () => {
    // /events must not light up on /eventsomething.
    expect(isNavItemActive("/eventsomething", events)).toBe(false);
  });

  it("does not treat a nested route as active when matchNested is off", () => {
    expect(isNavItemActive("/xp/history", xp)).toBe(false);
  });
});

describe("isNavHidden", () => {
  const hidden = ["/demo", "/design"];

  it("hides the bar on the persona picker and the primitive gallery", () => {
    expect(isNavHidden("/demo", hidden)).toBe(true);
    expect(isNavHidden("/design", hidden)).toBe(true);
  });

  it("hides it on their nested routes too", () => {
    expect(isNavHidden("/demo/anything", hidden)).toBe(true);
  });

  it("shows it everywhere else", () => {
    expect(isNavHidden("/", hidden)).toBe(false);
    expect(isNavHidden("/events", hidden)).toBe(false);
    expect(isNavHidden("/designation", hidden)).toBe(false);
  });
});
