import { describe, expect, it } from "vitest";

import {
  isTopThree,
  scopeHeading,
  shouldExplainHidden,
  viewerPlacement,
} from "@/features/leaderboard/components/boardView";
import type { LeaderboardResponse, LeaderboardRow, LeaderboardViewer } from "@/features/leaderboard/schema";

/**
 * The leaderboard's rules about the learner reading it (P-04, FR-5.8).
 *
 * FR-5.8 is two promises pulling in opposite directions — a learner may hide
 * from a public board, and everyone always sees their own rank — and the bug
 * each way is quiet: a learner shown twice, or a hidden learner shown nothing
 * and left to conclude the ranking is broken.
 */

const VIEWER_ID = "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa";

const row = (rank: number, profileId: string): LeaderboardRow => ({
  rank,
  profileId,
  displayName: `Learner ${rank}`,
  avatarKey: null,
  gradeLevel: null,
  section: null,
  xp: 500 - rank * 10,
  levelTitle: "Lingkod",
  isViewer: profileId === VIEWER_ID,
});

const viewer = (over: Partial<LeaderboardViewer>): LeaderboardViewer => ({
  profileId: VIEWER_ID,
  rank: 5,
  xp: 240,
  levelTitle: "Lingkod",
  hidden: false,
  ...over,
});

const board = (over: Partial<LeaderboardResponse>): LeaderboardResponse => ({
  scope: "school",
  scopeRef: null,
  season: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "First Quarter" },
  rows: [row(1, "b1"), row(2, "b2"), row(3, "b3")],
  viewer: viewer({}),
  computedAt: "2026-09-22T01:00:00Z",
  ...over,
});

describe("viewerPlacement", () => {
  it("does not repeat a learner who is already on the board", () => {
    const placement = viewerPlacement(
      board({ rows: [row(1, "b1"), row(2, VIEWER_ID)], viewer: viewer({ rank: 2 }) }),
    );
    expect(placement).toEqual({ kind: "in-rows" });
  });

  it("pins a learner who ranks below the visible rows", () => {
    const placement = viewerPlacement(board({ viewer: viewer({ rank: 41, xp: 60 }) }));
    expect(placement.kind).toBe("pinned");
  });

  it("pins a hidden learner, who is absent from the rows by design (FR-5.8)", () => {
    const placement = viewerPlacement(board({ viewer: viewer({ rank: 12, hidden: true }) }));
    expect(placement).toEqual({
      kind: "pinned",
      viewer: viewer({ rank: 12, hidden: true }),
    });
  });

  it("says a learner with no points is not ranked yet, rather than ranking them last", () => {
    const placement = viewerPlacement(board({ viewer: viewer({ rank: null, xp: 0 }) }));
    expect(placement).toEqual({ kind: "unranked", hidden: false });
  });

  it("still says so on an empty board", () => {
    const placement = viewerPlacement(
      board({ rows: [], viewer: viewer({ rank: null, xp: 0 }) }),
    );
    expect(placement).toEqual({ kind: "unranked", hidden: false });
  });

  it("shows nothing personal when the caller is not a learner", () => {
    // An adviser or a school head reading a board has no place on it.
    expect(viewerPlacement(board({ viewer: null }))).toEqual({ kind: "none" });
  });
});

describe("shouldExplainHidden", () => {
  it("explains the absence to a hidden learner", () => {
    expect(shouldExplainHidden(board({ viewer: viewer({ hidden: true }) }))).toBe(true);
  });

  it("says nothing to a learner who is not hidden", () => {
    expect(shouldExplainHidden(board({}))).toBe(false);
    expect(shouldExplainHidden(board({ viewer: null }))).toBe(false);
  });
});

describe("scopeHeading", () => {
  it("names the section a board is of", () => {
    expect(scopeHeading(board({ scope: "section", scopeRef: "11-ABM-A" }))).toEqual({
      key: "headingOf.section",
      ref: "11-ABM-A",
    });
  });

  it("falls back to a generic heading when the scope has no ref", () => {
    // A message with an unfilled {ref} throws at render.
    expect(scopeHeading(board({ scope: "grade", scopeRef: null }))).toEqual({
      key: "heading.grade",
      ref: null,
    });
  });

  it("never asks the school-wide board to name itself", () => {
    expect(scopeHeading(board({ scope: "school", scopeRef: null }))).toEqual({
      key: "heading.school",
      ref: null,
    });
  });
});

describe("isTopThree", () => {
  it("marks the first three places and nothing below", () => {
    expect([1, 2, 3, 4].map((rank) => isTopThree(row(rank, "b")))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });
});
