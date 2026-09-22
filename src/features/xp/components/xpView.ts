import type { LevelTier } from "@/design";

import type { XpBalance, XpEntry } from "../schema";

/**
 * What the XP screen shows, derived from what `GET /me/xp` returns (P-03,
 * FR-5.2, FR-5.4).
 *
 * Pure, because the two things this screen must get right are both arithmetic
 * on edges rather than layout: a learner below the first threshold, and a
 * learner at the top with nothing left to climb to. Both render a progress bar,
 * and neither should first be seen by a learner.
 */

/**
 * The four badge tiers are art (`src/design/art/LevelBadge.tsx`); `levels` rows
 * are data, and a school could seed five. Clamping here means an unexpected
 * fifth level still renders as the top badge rather than as nothing at all.
 */
export function levelTier(levelNumber: number | null | undefined): LevelTier | null {
  if (levelNumber === null || levelNumber === undefined) return null;
  if (levelNumber <= 1) return 1;
  if (levelNumber >= 4) return 4;
  return levelNumber as LevelTier;
}

export type LevelProgress = {
  /** XP earned since reaching the current level. */
  value: number;
  /** XP the current level spans. 1 when there is nothing left to climb. */
  max: number;
  /** XP still to go, or null at the top. */
  remaining: number | null;
  atTop: boolean;
};

export function levelProgress(balance: XpBalance): LevelProgress {
  const { level, lifetimeXp } = balance;

  // No level row yet — below the first threshold, or a school with no `levels`
  // seeded. The bar reads against the first threshold if one is known, and is
  // simply empty otherwise.
  if (!level) {
    return { value: 0, max: 1, remaining: null, atTop: false };
  }

  if (level.nextThresholdXp === null) {
    // The top of the ladder. A full bar, not an empty one: a learner who has
    // reached Bayani should not be shown 0% of a level that does not exist.
    return { value: 1, max: 1, remaining: null, atTop: true };
  }

  const span = Math.max(level.nextThresholdXp - level.thresholdXp, 1);
  const earned = Math.min(Math.max(lifetimeXp - level.thresholdXp, 0), span);

  return {
    value: earned,
    max: span,
    remaining: Math.max(level.nextThresholdXp - lifetimeXp, 0),
    atTop: false,
  };
}

export type EntryLabel = {
  /** An `xp.entry.*` message key. */
  key: string;
  event: string | null;
  org: string | null;
};

/**
 * What a learner reads beside a number.
 *
 * A reversal is labelled as a correction and keeps its reason: the ledger is
 * append-only, so a mistaken award is fixed by a negative row rather than by
 * editing the original (CLAUDE.md R4). A screen that rendered only positives
 * would one day show a correction as an award.
 */
export function entryLabel(entry: XpEntry): EntryLabel {
  const event = entry.source?.eventTitle ?? null;
  const org = entry.source?.orgName ?? null;

  if (entry.sourceType === "checkin") {
    return { key: event ? "entry.checkin" : "entry.checkinUnnamed", event, org };
  }
  if (entry.sourceType === "feedback") {
    return { key: event ? "entry.feedback" : "entry.feedbackUnnamed", event, org };
  }
  if (entry.sourceType === "reversal") {
    return { key: "entry.reversal", event, org };
  }
  if (entry.sourceType === "dispute_resolution") {
    return { key: "entry.dispute", event, org };
  }
  return { key: "entry.manual", event, org };
}

/**
 * Whether this row can be traced to something a teacher confirmed — the
 * product's load-bearing claim, made visible on the one screen where a learner
 * would doubt it. A manual adjustment cannot, and says so rather than borrowing
 * the authority of a check-in.
 */
export function isVerifiable(entry: XpEntry): boolean {
  return entry.source?.checkinId != null;
}
