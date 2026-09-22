import type { CheckinResult } from "../schema";
import type { RosterEntry } from "@/features/registration/schema";

/**
 * What the gate shows after a scan, and what the roster looks like afterwards
 * (P-02, D24, FR-4.9).
 *
 * Pure, and separate from the screen, because two of its rules are the ones
 * `hiraya-checkin-integrity` cares about and neither should be verifiable only
 * by clicking:
 *
 *   **A duplicate is not an error.** The API returns 200 with `xpAwarded: 0`
 *   (src/lib/errors.ts), and the gate says so in a neutral tone. Scanning the
 *   same learner twice means the officer did nothing wrong, and a red screen at
 *   the gate teaches them to distrust the scanner — which is how a queue starts
 *   getting waved through unscanned.
 *
 *   **A failure to send is not a check-in.** A network error leaves the learner
 *   unmarked and the same `jti` pending, so tapping again replays the same scan
 *   rather than creating a second one (CLAUDE.md R6). Never a silent failure,
 *   and never a false success.
 */

export type ScanTone = "success" | "neutral" | "danger";

export type ScanFeedback = {
  tone: ScanTone;
  /** A `checkin.result.*` message key. */
  key: string;
  xpAwarded: number;
  /** True once the scan has landed server-side, duplicates included. */
  counted: boolean;
};

export function feedbackFor(result: CheckinResult): ScanFeedback {
  if (result.status === "accepted") {
    return { tone: "success", key: "result.accepted", xpAwarded: result.xpAwarded, counted: true };
  }
  if (result.status === "duplicate") {
    // Counted, because the learner *is* checked in — just not twice.
    return { tone: "neutral", key: "result.duplicate", xpAwarded: 0, counted: true };
  }
  return { tone: "danger", key: `result.rejected.${result.reason ?? "INTERNAL"}`, xpAwarded: 0, counted: false };
}

/** The feedback for a request that never reached the server. */
export function sendFailedFeedback(): ScanFeedback {
  return { tone: "danger", key: "result.notSent", xpAwarded: 0, counted: false };
}

/**
 * The next learner the camera would see: the first registrant still unmarked.
 * Waitlisted and cancelled registrations are skipped — a learner without a
 * place is not in the line.
 */
export function nextToScan(entries: readonly RosterEntry[]): RosterEntry | null {
  return entries.find((entry) => entry.status === "registered" && entry.checkedInAt === null) ?? null;
}

export function markCheckedIn(
  entries: readonly RosterEntry[],
  profileId: string,
  at: string,
): RosterEntry[] {
  return entries.map((entry) =>
    entry.profileId === profileId && entry.checkedInAt === null
      ? { ...entry, checkedInAt: at }
      : entry,
  );
}

export function checkedInCount(entries: readonly RosterEntry[]): number {
  return entries.filter((entry) => entry.checkedInAt !== null).length;
}

/**
 * Roster search. Name only — there is nothing else on a roster row to search
 * by that a learner would want an officer typing at a gate, and the LRN is not
 * on `profiles` at all (CLAUDE.md §6).
 */
export function filterRoster(entries: readonly RosterEntry[], query: string): RosterEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [...entries];
  return entries.filter((entry) => entry.displayName.toLocaleLowerCase().includes(needle));
}
