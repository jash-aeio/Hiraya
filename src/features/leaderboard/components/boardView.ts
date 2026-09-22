import type { LeaderboardResponse, LeaderboardRow, LeaderboardViewer } from "../schema";

/**
 * What the board shows about the learner reading it (P-04, FR-5.6, FR-5.8).
 *
 * The rule this file exists for: **everyone always sees their own rank**, even
 * when they have hidden themselves from the public board, and **a learner who
 * is already in the visible rows is not shown twice**. Both are one-line
 * decisions that are wrong in opposite directions, and both are cheaper to
 * pin down here than to notice on a board in front of a class.
 *
 * The board is also the screen most likely to discourage the learners this
 * platform exists to reach, so "you are 41st" is stated plainly and without
 * decoration, and a learner with no points yet is told they are not ranked
 * *yet* rather than shown a rank of zero.
 */

export type ViewerPlacement =
  | { kind: "in-rows" }
  | { kind: "pinned"; viewer: LeaderboardViewer }
  | { kind: "unranked"; hidden: boolean }
  | { kind: "none" };

export function viewerPlacement(board: LeaderboardResponse): ViewerPlacement {
  const { viewer, rows } = board;
  if (!viewer) return { kind: "none" };

  if (viewer.rank === null) {
    // No XP in this scope yet. Not a rank of zero, and not an empty row.
    return { kind: "unranked", hidden: viewer.hidden };
  }

  const shown = rows.some((row) => row.profileId === viewer.profileId);
  return shown ? { kind: "in-rows" } : { kind: "pinned", viewer };
}

/**
 * Whether to explain the absence. A hidden learner can see themselves on a
 * board nobody else can see them on, and without a word of explanation the
 * honest conclusion is that the ranking is broken.
 */
export function shouldExplainHidden(board: LeaderboardResponse): boolean {
  return board.viewer?.hidden === true;
}

/** Ranks 1–3 are marked; below that a rank is a number like any other. */
export function isTopThree(row: LeaderboardRow): boolean {
  return row.rank <= 3;
}

/**
 * The board's own title, which depends on what it is a board *of*. School-wide
 * has no `scopeRef`; the others name their section, grade or organization.
 */
export function scopeHeading(board: LeaderboardResponse): { key: string; ref: string | null } {
  if (board.scope === "school" || board.scopeRef === null) {
    return { key: `heading.${board.scope}`, ref: null };
  }
  return { key: `headingOf.${board.scope}`, ref: board.scopeRef };
}
