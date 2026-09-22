import { describe, expect, it } from "vitest";

import { entryLabel, isVerifiable, levelProgress, levelTier } from "@/features/xp/components/xpView";
import type { XpBalance, XpEntry } from "@/features/xp/schema";

/**
 * The XP screen's arithmetic and labelling (P-03, FR-5.2, FR-5.4).
 *
 * The edges are the point: a learner below the first threshold, a learner at
 * the top with nothing left to climb to, and a correction. All three render a
 * bar or a row, and none of them should first be seen by a learner.
 */

const balance = (over: Partial<XpBalance>): XpBalance => ({
  lifetimeXp: 0,
  seasonXp: 0,
  level: null,
  season: null,
  ...over,
});

const entry = (over: Partial<XpEntry>): XpEntry => ({
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  delta: 10,
  sourceType: "checkin",
  participationType: "attend_event",
  reversalOf: null,
  reason: null,
  createdAt: "2026-09-20T01:00:00Z",
  source: {
    checkinId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    eventId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
    eventTitle: "Coastal clean-up drive",
    orgName: "Science Club",
    occurredAt: "2026-09-20T01:00:00Z",
  },
  ...over,
});

describe("levelTier", () => {
  it("maps the four seeded levels to the four badges", () => {
    expect([1, 2, 3, 4].map(levelTier)).toEqual([1, 2, 3, 4]);
  });

  it("has no badge for a learner with no level row yet", () => {
    expect(levelTier(null)).toBeNull();
  });

  it("clamps a fifth level to the top badge rather than rendering nothing", () => {
    // `levels` is data; a school could seed five. The art has four.
    expect(levelTier(5)).toBe(4);
    expect(levelTier(0)).toBe(1);
  });
});

describe("levelProgress", () => {
  it("measures progress within the current level, not from zero", () => {
    const progress = levelProgress(
      balance({
        lifetimeXp: 180,
        level: { number: 2, title: "Lingkod", badgeKey: null, thresholdXp: 150, nextThresholdXp: 400 },
      }),
    );
    expect(progress).toEqual({ value: 30, max: 250, remaining: 220, atTop: false });
  });

  it("fills the bar at the top of the ladder", () => {
    // A learner who has reached Bayani must not be shown 0% of a level that
    // does not exist.
    const progress = levelProgress(
      balance({
        lifetimeXp: 1250,
        level: { number: 4, title: "Bayani", badgeKey: null, thresholdXp: 1000, nextThresholdXp: null },
      }),
    );
    expect(progress).toEqual({ value: 1, max: 1, remaining: null, atTop: true });
  });

  it("renders an empty bar for a learner with no level row", () => {
    expect(levelProgress(balance({ lifetimeXp: 0 }))).toEqual({
      value: 0,
      max: 1,
      remaining: null,
      atTop: false,
    });
  });

  it("never overflows the bar when the ledger is ahead of the level row", () => {
    // Balances are computed per read (D19) and levels are seeded rows; a school
    // that raises a threshold mid-season must not produce a 120% bar.
    const progress = levelProgress(
      balance({
        lifetimeXp: 900,
        level: { number: 2, title: "Lingkod", badgeKey: null, thresholdXp: 150, nextThresholdXp: 400 },
      }),
    );
    expect(progress.value).toBe(progress.max);
    expect(progress.remaining).toBe(0);
  });

  it("does not divide by a zero-width level", () => {
    const progress = levelProgress(
      balance({
        lifetimeXp: 150,
        level: { number: 2, title: "Lingkod", badgeKey: null, thresholdXp: 150, nextThresholdXp: 150 },
      }),
    );
    expect(Number.isFinite(progress.value / progress.max)).toBe(true);
  });
});

describe("entryLabel", () => {
  it("names the event a check-in happened at", () => {
    expect(entryLabel(entry({}))).toEqual({
      key: "entry.checkin",
      event: "Coastal clean-up drive",
      org: "Science Club",
    });
  });

  it("falls back to an unnamed phrasing rather than an empty placeholder", () => {
    // A message with an unfilled {event} throws at render.
    const label = entryLabel(
      entry({
        source: {
          checkinId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          eventId: null,
          eventTitle: null,
          orgName: null,
          occurredAt: null,
        },
      }),
    );
    expect(label.key).toBe("entry.checkinUnnamed");
  });

  it("labels a reversal as a correction, not as an award", () => {
    const label = entryLabel(
      entry({ delta: -10, sourceType: "reversal", source: null, reason: "Wrong gate" }),
    );
    expect(label.key).toBe("entry.reversal");
  });

  it("labels a manual adjustment as an adviser's decision", () => {
    expect(entryLabel(entry({ sourceType: "manual_adjustment", source: null })).key).toBe(
      "entry.manual",
    );
  });
});

describe("isVerifiable", () => {
  it("marks a row that cites a check-in", () => {
    expect(isVerifiable(entry({}))).toBe(true);
  });

  it("does not let a manual adjustment borrow the authority of a check-in", () => {
    expect(isVerifiable(entry({ sourceType: "manual_adjustment", source: null }))).toBe(false);
  });

  it("does not mark feedback XP as verified at the gate", () => {
    const feedback = entry({
      sourceType: "feedback",
      source: {
        checkinId: null,
        eventId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
        eventTitle: "Coastal clean-up drive",
        orgName: "Science Club",
        occurredAt: null,
      },
    });
    expect(isVerifiable(feedback)).toBe(false);
  });
});
