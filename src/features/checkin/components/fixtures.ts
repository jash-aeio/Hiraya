import type { RosterEntry } from "@/features/registration/schema";

import type { CheckinResult, ScannableEvent } from "../schema";

/**
 * Fixture data for the officer check-in screen, loaded only when
 * `NEXT_PUBLIC_HIRAYA_FIXTURES=on` (src/lib/fixtures.ts) and imported
 * dynamically so an unset deployment never fetches this chunk.
 *
 * **Deleted with D-02.** Every learner here is invented, as everything in a
 * demo tenant is (CLAUDE.md §6).
 *
 * The XP value is a fixture too, and deliberately a round 10: the real number
 * comes back from the write, because it is an `xp_rules` row the SSLG adviser
 * sets and can change (FR-5.3). A screen that hard-codes what a scan is worth
 * is a screen that will one day disagree with the ledger.
 */

const EVENT_ID = "33333333-3333-4333-8333-333333333333";

export const FIXTURE_EVENT_ID = EVENT_ID;

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export function fixtureScannableEvents(): ScannableEvent[] {
  return [
    {
      id: EVENT_ID,
      title: "Coastal clean-up drive",
      startsAt: hoursFromNow(-0.5),
      endsAt: hoursFromNow(3),
      venue: "Covered court, then the shoreline",
      orgName: "Science Club",
      scannableNow: true,
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      title: "Kindness Week assembly",
      startsAt: hoursFromNow(26),
      endsAt: hoursFromNow(28),
      venue: "Quadrangle",
      orgName: "Sinag Fellowship",
      scannableNow: false,
    },
  ];
}

const SECTIONS = ["Sampaguita", "Adelfa", "Kalachuchi", "Rosal"] as const;

const NAMES = [
  "Ligaya Talampas",
  "Mithi Bukana",
  "Alab Tuktukin",
  "Bituin Lawiswis",
  "Dalisay Gubatan",
  "Luntian Ilayaan",
  "Ulap Sapaan",
  "Araw Kanluran",
  "Awit Pandayan",
  "Bulan Hilagaan",
] as const;

export function fixtureRoster(): RosterEntry[] {
  return NAMES.map((displayName, index) => ({
    profileId: `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`,
    displayName,
    avatarKey: `avatar-${String((index % 14) + 1).padStart(2, "0")}`,
    gradeLevel: 9 + (index % 4),
    section: SECTIONS[index % SECTIONS.length] ?? null,
    // Two arrived before the demo starts, so the count is not 0 of 10 and the
    // duplicate path is reachable on the first tap.
    status: index === 9 ? "waitlisted" : "registered",
    waitlistPosition: index === 9 ? 1 : null,
    checkedInAt: index < 2 ? hoursFromNow(-0.2) : null,
  }));
}

export function fixtureCheckinResult(profileId: string, jti: string, already: boolean): CheckinResult {
  return {
    jti,
    profileId,
    status: already ? "duplicate" : "accepted",
    checkinId: "66666666-6666-4666-8666-666666666666",
    xpAwarded: already ? 0 : 10,
    reason: null,
  };
}
